// index.js finalna verzija
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const pool = require("./db");

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.set("trust proxy", 1);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(limiter);

// Small helpers
const JWT_SECRET = process.env.JWT_SECRET || "dev_fallback";
function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "2h",
  });
}
function authOptional(req, _res, next) {
  const h = req.headers.authorization || "";
  if (h.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(h.slice(7), JWT_SECRET);
    } catch {}
  }
  next();
}
function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer "))
    return res.status(401).json({ success: false, error: "Missing token" });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}

// Health & hello (no DB)
app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "backend", ts: new Date().toISOString() })
);
app.get("/api/hello", (_req, res) => res.json({ ok: true }));

// DB ping (quick connectivity check)
app.get("/api/db-ping", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 as ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "db" });
  }
});

// EXISTING ROUTES

// 1) Register Student
app.post("/api/register-student", async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  try {
    const hash =
      password && !password.startsWith("$2b$")
        ? await bcrypt.hash(password, 10)
        : password || "x";
    const result = await pool.query(
      `INSERT INTO "User" (username, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [username, email, hash, firstName, lastName]
    );
    res.json({ success: true, userId: result.rows[0].user_id });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ success: false, error: "Email or username already in use" });
    }
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 2) Register Instructor
app.post("/api/register-instructor", async (req, res) => {
  const {
    instructorEmail,
    instructorPassword,
    firstName,
    lastName,
    biography,
  } = req.body;
  try {
    const hash =
      instructorPassword && !instructorPassword.startsWith("$2b$")
        ? await bcrypt.hash(instructorPassword, 10)
        : instructorPassword || "x";
    const result = await pool.query(
      `INSERT INTO "Instructor" (instructor_email, instructor_password_hash, first_name, last_name, biography)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING instructor_id`,
      [instructorEmail, hash, firstName, lastName, biography]
    );
    res.json({ success: true, instructorId: result.rows[0].instructor_id });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ success: false, error: "Instructor email already in use" });
    }
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
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
app.post("/api/register-event", async (req, res) => {
  const { userId, eventId } = req.body;
  try {
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

// 5) LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { type, email, password } = req.body;
    if (!type || !email || !password)
      return res.status(400).json({ success: false, error: "Missing fields" });

    if (type === "user") {
      const { rows } = await pool.query(
        `SELECT user_id, username, email, password_hash FROM "User" WHERE email=$1`,
        [email]
      );
      if (!rows[0])
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });

      const ok = rows[0].password_hash?.startsWith("$2b$")
        ? await bcrypt.compare(password, rows[0].password_hash)
        : password === rows[0].password_hash;
      if (!ok)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });

      const token = signJwt({
        sub: rows[0].user_id,
        role: "user",
        email: rows[0].email,
      });
      return res.json({
        success: true,
        token,
        role: "user",
        userId: rows[0].user_id,
      });
    }

    if (type === "instructor") {
      const { rows } = await pool.query(
        `SELECT instructor_id, instructor_email, instructor_password_hash FROM "Instructor" WHERE instructor_email=$1`,
        [email]
      );
      if (!rows[0])
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });

      const ok = rows[0].instructor_password_hash?.startsWith("$2b$")
        ? await bcrypt.compare(password, rows[0].instructor_password_hash)
        : password === rows[0].instructor_password_hash;
      if (!ok)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });

      const token = signJwt({
        sub: rows[0].instructor_id,
        role: "instructor",
        email: rows[0].instructor_email,
      });
      return res.json({
        success: true,
        token,
        role: "instructor",
        instructorId: rows[0].instructor_id,
      });
    }

    return res.status(400).json({ success: false, error: "Unknown type" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 6) Book a class
app.post("/api/book-class", authOptional, async (req, res) => {
  const client = await pool.connect();
  try {
    const classId = Number(req.body.classId);
    const jwtUserId = req.user?.role === "user" ? Number(req.user.sub) : null;
    const bodyUserId = req.body.userId ? Number(req.body.userId) : null;
    const userId = jwtUserId || bodyUserId;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, error: "Missing user identity" });
    if (!classId)
      return res.status(400).json({ success: false, error: "Missing classId" });

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
    try {
      await pool.query("ROLLBACK");
    } catch {}
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  } finally {
    client.release();
  }
});

// 7) Reports
app.get("/api/reports/top-spenders", async (_req, res) => {
  try {
    const sql = `
      SELECT user_id, username, email, spend_packages, spend_merch, total_spend,
             RANK() OVER (ORDER BY total_spend DESC) AS spend_rank
      FROM vw_user_spend
      ORDER BY total_spend DESC, user_id;
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
});

app.get("/api/reports/class-utilization", async (_req, res) => {
  try {
    const sql = `
      SELECT *,
             DENSE_RANK() OVER (PARTITION BY date ORDER BY utilization_pct DESC NULLS LAST) AS daily_rank
      FROM vw_class_utilization
      ORDER BY date, start_time, class_id;
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
});

app.get("/api/reports/training-pop-monthly", async (_req, res) => {
  try {
    const sql = `
      SELECT training_id, training_name, month, num_bookings,
             RANK() OVER (PARTITION BY month ORDER BY num_bookings DESC NULLS LAST) AS rank_in_month
      FROM vw_training_pop_monthly
      ORDER BY month DESC, rank_in_month, training_name;
    `;
    const { rows } = await pool.query(sql);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
});

// 8) DEBUG/EXPLAIN
app.get("/api/debug/explain-events", async (_req, res) => {
  try {
    const sql = `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT * FROM "Event"
      WHERE date >= CURRENT_DATE
      ORDER BY date, time
      LIMIT 50;
    `;
    const { rows } = await pool.query(sql);
    if (rows[0] && rows[0]["QUERY PLAN"]) {
      res.json(rows[0]["QUERY PLAN"]);
    } else {
      res.status(500).json({ error: "Empty plan" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
});

app.get("/api/debug/explain-class-join", async (_req, res) => {
  try {
    const sql = `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT c.class_id, c.date, c.start_time, COUNT(ubc.user_id)
      FROM "Class" c
      LEFT JOIN "User_Booked_Class" ubc ON ubc.class_id = c.class_id
      WHERE c.date >= CURRENT_DATE
      GROUP BY c.class_id, c.date, c.start_time
      ORDER BY c.date, c.start_time
      LIMIT 50;
    `;
    const { rows } = await pool.query(sql);
    if (rows[0] && rows[0]["QUERY PLAN"]) {
      res.json(rows[0]["QUERY PLAN"]);
    } else {
      res.status(500).json({ error: "Empty plan" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server" });
  }
});

// START SERVER
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
