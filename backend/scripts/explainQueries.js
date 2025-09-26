const fs = require("fs");
const path = require("path");
const pool = require("../db");

const outDir = path.join(__dirname, "../proofs");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function explainToFile(file, sql, forceIndex = false) {
  const client = await pool.connect();
  try {
    if (forceIndex) {
      await client.query("SET enable_seqscan = off");
      await client.query("SET enable_bitmapscan = on");
      await client.query("SET enable_indexscan  = on");
    }
    const q = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    const { rows } = await client.query(q);
    fs.writeFileSync(
      path.join(outDir, file),
      JSON.stringify(rows[0]["QUERY PLAN"][0], null, 2)
    );
    console.log(`Saved ${file}`);
  } finally {
    client.release();
  }
}

(async () => {
  try {
    // A) Events upcoming ordered by (date,time) — obicni
    await explainToFile(
      "events_explain.json",
      `SELECT * FROM "Event"
       WHERE date >= CURRENT_DATE
       ORDER BY date, time`
    );

    // A2) Forced-index variant
    await explainToFile(
      "events_explain_forced.json",
      `SELECT * FROM "Event"
       WHERE date >= CURRENT_DATE
       ORDER BY date, time`,
      true
    );

    // B) Bookings per upcoming class — obicni
    await explainToFile(
      "class_bookings_explain.json",
      `SELECT c.class_id, c.date, COUNT(ubc.user_id) AS bookings
       FROM "Class" c
       LEFT JOIN "User_Booked_Class" ubc
         ON ubc.class_id = c.class_id
       WHERE c.date >= CURRENT_DATE
       GROUP BY c.class_id, c.date
       ORDER BY c.date, c.class_id`
    );

    // B2) Forced-index variant
    await explainToFile(
      "class_bookings_explain_forced.json",
      `SELECT c.class_id, c.date, COUNT(ubc.user_id) AS bookings
       FROM "Class" c
       LEFT JOIN "User_Booked_Class" ubc
         ON ubc.class_id = c.class_id
       WHERE c.date >= CURRENT_DATE
       GROUP BY c.class_id, c.date
       ORDER BY c.date, c.class_id`,
      true
    );

    console.log("All EXPLAIN files saved under backend/proofs/.");
  } catch (e) {
    console.error("EXPLAIN error:", e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
