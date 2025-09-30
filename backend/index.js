// backend/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("./db");

const app = express();

// ---- Security middleware ----
app.use(helmet());

// Limit JSON size, basic DoS protection
app.use(express.json({ limit: "100kb" }));

// Safer CORS (adjust FRONTEND_ORIGIN in .env)
const allowed = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:3000"];
app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true); // Postman/curl
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Rate-limits (tighter on auth endpoints)
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 50),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/login", authLimiter);
app.use("/api/register-student", authLimiter);
app.use("/api/register-instructor", authLimiter);

// Helpers
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function validateEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function sanitize(s) {
  return typeof s === "string" ? s.trim() : s;
}
async function hashPassword(plain) {
  if (!plain || plain.length < 6) throw new Error("Weak password");
  return await bcrypt.hash(plain, 10);
}
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}
function authOptional(req, _res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (_e) {
      // ignore invalid token (endpoint remains usable without auth)
    }
  }
  next();
}

// EXISTING ROUTES

// 1) Register Student (hashes password)
app.post("/api/register-student", async (req, res) => {
  try {
    const username = sanitize(req.body.username);
    const email = sanitize(req.body.email);
    const password = sanitize(req.body.password);
    const firstName = sanitize(req.body.firstName);
    const lastName = sanitize(req.body.lastName);

    if (!validateEmail(email))
      return res.status(400).json({ success: false, error: "Invalid email" });
    const password_hash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO "User" (username, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [username, email, password_hash, firstName, lastName]
    );
    res.json({ success: true, userId: result.rows[0].user_id });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ success: false, error: "Email or username already in use" });
    }
    console.error(err);
    res
      .status(400)
      .json({ success: false, error: err.message || "Server error" });
  }
});

// 2) Register Instructor (hashes password)
app.post("/api/register-instructor", async (req, res) => {
  try {
    const instructorEmail = sanitize(req.body.instructorEmail);
    const instructorPassword = sanitize(req.body.instructorPassword);
    const firstName = sanitize(req.body.firstName);
    const lastName = sanitize(req.body.lastName);
    const biography = sanitize(req.body.biography);

    if (!validateEmail(instructorEmail))
      return res.status(400).json({ success: false, error: "Invalid email" });
    const instructor_password_hash = await hashPassword(instructorPassword);

    const result = await pool.query(
      `INSERT INTO "Instructor" (instructor_email, instructor_password_hash, first_name, last_name, biography)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING instructor_id`,
      [
        instructorEmail,
        instructor_password_hash,
        firstName,
        lastName,
        biography,
      ]
    );
    res.json({ success: true, instructorId: result.rows[0].instructor_id });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ success: false, error: "Instructor email already in use" });
    }
    console.error(err);
    res
      .status(400)
      .json({ success: false, error: err.message || "Server error" });
  }
});

// 3) GET events
app.get("/api/events", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM "Event"
      WHERE date >= CURRENT_DATE
      ORDER BY date ASC, time ASC
    `);
    res.json({ success: true, events: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 4) POST register-event
app.post("/api/register-event", authOptional, async (req, res) => {
  try {
    const eventId = req.body.eventId;
    const userId = req.user?.sub || req.body.userId;

    if (!userId)
      return res
        .status(401)
        .json({ success: false, error: "Missing user identity" });

    const check = await pool.query(
      `SELECT 1 FROM "User_Event" WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );
    if (check.rows.length > 0) {
      return res.json({
        success: false,
        message: "Already registered for this event",
      });
    }

    await pool.query(
      `INSERT INTO "User_Event" (user_id, event_id) VALUES ($1, $2)`,
      [userId, eventId]
    );
    res.json({ success: true, message: "Event registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// AUTH (JWT login)

// POST /api/login   { type: "user"|"instructor", email, password }
app.post("/api/login", async (req, res) => {
  try {
    const type = req.body.type === "instructor" ? "instructor" : "user";
    const email = sanitize(req.body.email);
    const password = sanitize(req.body.password);
    if (!validateEmail(email) || !password)
      return res.status(400).json({ success: false, error: "Invalid input" });

    if (type === "user") {
      const q = await pool.query(
        `SELECT user_id, password_hash, username FROM "User" WHERE email=$1`,
        [email]
      );
      if (q.rowCount === 0)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      const ok = await bcrypt.compare(password, q.rows[0].password_hash || "");
      if (!ok)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });

      const token = signToken({
        sub: q.rows[0].user_id,
        role: "user",
        username: q.rows[0].username,
      });
      return res.json({ success: true, token, role: "user" });
    } else {
      const q = await pool.query(
        `SELECT instructor_id, instructor_password_hash, first_name, last_name
         FROM "Instructor" WHERE instructor_email=$1`,
        [email]
      );
      if (q.rowCount === 0)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      const ok = await bcrypt.compare(
        password,
        q.rows[0].instructor_password_hash || ""
      );
      if (!ok)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });

      const token = signToken({
        sub: q.rows[0].instructor_id,
        role: "instructor",
      });
      return res.json({ success: true, token, role: "instructor" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Procedure, reports, explain

// 5) POST /api/book-class (transaction + function)
app.post("/api/book-class", authOptional, async (req, res) => {
  const client = await pool.connect();
  try {
    const classId = req.body.classId;
    const userId = req.user?.sub || req.body.userId;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, error: "Missing user identity" });

    await client.query("BEGIN");
    const r = await client.query(`SELECT book_class($1,$2) AS status`, [
      userId,
      classId,
    ]);
    const status = r.rows[0].status;
    if (status !== "OK") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, code: status });
    }
    await client.query("COMMIT");
    res.json({ success: true, code: "OK" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    client.release();
  }
});

// Reports from VIEWS
app.get("/api/reports/top-spenders", async (_req, res) => {
  try {
    const q = `
      SELECT user_id, username, email, spend_packages, spend_merch, total_spend,
             RANK() OVER (ORDER BY total_spend DESC) AS spend_rank
      FROM vw_user_spend
      ORDER BY total_spend DESC, user_id
      LIMIT 50;
    `;
    const result = await pool.query(q);
    res.json({ success: true, rows: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/api/reports/class-utilization", async (_req, res) => {
  try {
    const q = `
      SELECT *, DENSE_RANK() OVER (PARTITION BY date ORDER BY utilization_pct DESC NULLS LAST) AS daily_rank
      FROM vw_class_utilization
      ORDER BY date, start_time, class_id;
    `;
    const result = await pool.query(q);
    res.json({ success: true, rows: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/api/reports/training-pop-monthly", async (_req, res) => {
  try {
    const q = `
      SELECT training_id, training_name, month, num_bookings,
             RANK() OVER (PARTITION BY month ORDER BY num_bookings DESC NULLS LAST) AS rank_in_month
      FROM vw_training_pop_monthly
      ORDER BY month DESC, rank_in_month, training_name;
    `;
    const result = await pool.query(q);
    res.json({ success: true, rows: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// EXPLAIN/ANALYZE proofs
app.get("/api/debug/explain-events", async (_req, res) => {
  try {
    const plan = await pool.query(`
      EXPLAIN ANALYZE
      SELECT *
      FROM "Event"
      WHERE date >= CURRENT_DATE
      ORDER BY date, time
      LIMIT 50;
    `);
    res.json({ success: true, plan: plan.rows.map((r) => r["QUERY PLAN"]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/api/debug/explain-class-join", async (_req, res) => {
  try {
    const plan = await pool.query(`
      EXPLAIN ANALYZE
      SELECT c.class_id, c.date, c.start_time, COUNT(ubc.user_id)
      FROM "Class" c
      LEFT JOIN "User_Booked_Class" ubc ON ubc.class_id = c.class_id
      WHERE c.date >= CURRENT_DATE
      GROUP BY c.class_id, c.date, c.start_time
      ORDER BY c.date, c.start_time
      LIMIT 50;
    `);
    res.json({ success: true, plan: plan.rows.map((r) => r["QUERY PLAN"]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
