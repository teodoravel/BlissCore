const fs = require("fs");
const path = require("path");
const pool = require("../db");

const outDir = path.join(__dirname, "../proofs");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const client = await pool.connect();
  const result = {
    before: null,
    after: null,
    afterDelete: null,
    statuses: [],
    errors: [],
  };

  try {
    console.log("=== PROOF: transactions + triggers ===");

    // pick a class
    const { rows: classRows } = await client.query(
      `SELECT class_id, capacity, seats_available FROM "Class" ORDER BY class_id DESC LIMIT 1`
    );
    const cls = classRows[0];
    console.log("Class before:", cls);
    result.before = cls;

    // get users (sorted by username)
    const { rows: uRows } = await client.query(
      `SELECT user_id, username FROM "User" WHERE username IN ('ana','bojan','ciro') ORDER BY username`
    );
    const [ana, bojan, ciro] = uRows; // already ordered by username
    console.log("Users:", uRows);

    await client.query("BEGIN");

    // 2 successful + 1 expected CLASS_FULL
    let r1 = await client.query(`SELECT book_class($1,$2) AS status`, [
      ana.user_id,
      cls.class_id,
    ]);
    console.log("book_class(ana):", r1.rows[0].status);
    result.statuses.push({ user: "ana", status: r1.rows[0].status });

    let r2 = await client.query(`SELECT book_class($1,$2) AS status`, [
      bojan.user_id,
      cls.class_id,
    ]);
    console.log("book_class(bojan):", r2.rows[0].status);
    result.statuses.push({ user: "bojan", status: r2.rows[0].status });

    let r3 = await client.query(`SELECT book_class($1,$2) AS status`, [
      ciro.user_id,
      cls.class_id,
    ]);
    console.log(
      "book_class(ciro):",
      r3.rows[0].status,
      "(expected CLASS_FULL)"
    );
    result.statuses.push({ user: "ciro", status: r3.rows[0].status });

    await client.query("COMMIT");

    // after commit
    let after = await client.query(
      `SELECT class_id, capacity, seats_available FROM "Class" WHERE class_id=$1`,
      [cls.class_id]
    );
    console.log("Class after bookings:", after.rows[0]);
    result.after = after.rows[0];

    // delete one booking to show AFTER DELETE increment
    await client.query(
      `DELETE FROM "User_Booked_Class" WHERE user_id=$1 AND class_id=$2`,
      [ana.user_id, cls.class_id]
    );
    let afterDel = await client.query(
      `SELECT class_id, capacity, seats_available FROM "Class" WHERE class_id=$1`,
      [cls.class_id]
    );
    console.log(
      "Class after delete (seats should increase by 1):",
      afterDel.rows[0]
    );
    result.afterDelete = afterDel.rows[0];

    console.log("Proof finished.");

    // za snapshot
    const views = {};
    views.vw_user_spend = (
      await pool.query(
        `SELECT * FROM vw_user_spend ORDER BY total_spend DESC NULLS LAST LIMIT 20`
      )
    ).rows;
    views.vw_class_utilization = (
      await pool.query(
        `SELECT * FROM vw_class_utilization ORDER BY utilization_pct DESC NULLS LAST LIMIT 20`
      )
    ).rows;
    views.vw_training_pop_monthly = (
      await pool.query(
        `SELECT * FROM vw_training_pop_monthly ORDER BY month DESC, num_bookings DESC LIMIT 20`
      )
    ).rows;

    fs.writeFileSync(
      path.join(outDir, "views_snapshot.json"),
      JSON.stringify(views, null, 2)
    );
    console.log("Saved views snapshot -> proofs/views_snapshot.json");
  } catch (e) {
    try {
      await pool.query("ROLLBACK");
    } catch {}
    console.error("Proof error:", e);
    result.errors.push(String(e));
    process.exitCode = 1;
  } finally {
    // write the transaction proof JSON
    fs.writeFileSync(
      path.join(outDir, "transactions_proof.json"),
      JSON.stringify(result, null, 2)
    );
    console.log("Saved transaction proof -> proofs/transactions_proof.json");
    client.release();
    await pool.end();
  }
}

run();
