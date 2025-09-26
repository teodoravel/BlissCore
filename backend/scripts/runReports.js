const fs = require("fs");
const path = require("path");
const pool = require("../db");

async function dump(name, rows) {
  const dir = path.join(__dirname, "../proofs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  console.log(`Saved ${name}.json (${rows.length} rows).`);
}

(async () => {
  try {
    // 1) Top spenders (uses vw_user_spend)
    const topSpendersSql = `
      SELECT user_id, username, email,
             spend_packages, spend_merch, total_spend,
             RANK() OVER (ORDER BY total_spend DESC) AS spend_rank
      FROM vw_user_spend
      ORDER BY total_spend DESC, user_id;
    `;
    let r1 = await pool.query(topSpendersSql);
    console.table(r1.rows);
    await dump("top_spenders", r1.rows);

    // 2) Class utilization + daily rank (uses vw_class_utilization)
    const utilizationSql = `
      SELECT *,
             DENSE_RANK() OVER (PARTITION BY date ORDER BY utilization_pct DESC NULLS LAST) AS daily_rank
      FROM vw_class_utilization
      ORDER BY date, start_time, class_id;
    `;
    let r2 = await pool.query(utilizationSql);
    console.table(r2.rows);
    await dump("class_utilization", r2.rows);

    // 3) Training popularity by month (uses vw_training_pop_monthly)
    const popSql = `
      SELECT training_id, training_name, month, num_bookings,
             RANK() OVER (PARTITION BY month ORDER BY num_bookings DESC NULLS LAST) AS rank_in_month
      FROM vw_training_pop_monthly
      ORDER BY month DESC, rank_in_month, training_name;
    `;
    let r3 = await pool.query(popSql);
    console.table(r3.rows);
    await dump("training_pop_monthly", r3.rows);

    console.log(
      "Reports generated under backend/proofs/. Paste these into the wiki."
    );
  } catch (e) {
    console.error("Reports error:", e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
