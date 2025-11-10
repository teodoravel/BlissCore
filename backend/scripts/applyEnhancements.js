const fs = require("fs");
const path = require("path");
const pool = require("../db"); //  module.exports = pool

(async () => {
  const sqlPath = path.join(__dirname, "../sql/blisscore_enhancements.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = await pool.connect();
  try {
    console.log("Applying SQL from:", sqlPath);
    await client.query(sql);
    console.log(" Enhancements applied (views, triggers, function, indexes).");
  } catch (e) {
    console.error(" Error applying enhancements:", e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
