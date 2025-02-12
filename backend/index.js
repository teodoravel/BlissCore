// index.js

const express = require("express");
const cors = require("cors");
const pool = require("./db"); // Import the pool from db.js

const app = express();
app.use(cors());
app.use(express.json());

// 1) Register Student
app.post("/api/register-student", async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO "User" (username, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [username, email, password, firstName, lastName]
    );

    const userId = result.rows[0].user_id;
    res.json({ success: true, userId });
  } catch (err) {
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
    const result = await pool.query(
      `INSERT INTO "Instructor" 
       (instructor_email, instructor_password_hash, first_name, last_name, biography)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING instructor_id`,
      [instructorEmail, instructorPassword, firstName, lastName, biography]
    );

    const instructorId = result.rows[0].instructor_id;
    res.json({ success: true, instructorId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 3) GET events
app.get("/api/events", async (req, res) => {
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
      `SELECT 1 FROM "User_Event"
       WHERE user_id = $1
         AND event_id = $2`,
      [userId, eventId]
    );
    if (check.rows.length > 0) {
      return res.json({
        success: false,
        message: "Already registered for this event",
      });
    }

    await pool.query(
      `INSERT INTO "User_Event" (user_id, event_id)
       VALUES ($1, $2)`,
      [userId, eventId]
    );

    res.json({ success: true, message: "Event registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
