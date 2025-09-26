const pool = require("../db");

async function ensureOne(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

async function run() {
  const client = await pool.connect();
  try {
    console.log("Seeding small demo data...");
    await client.query("BEGIN");

    // Users
    const uAna = await ensureOne(`
      WITH ins AS (
        INSERT INTO "User"(username,email,password_hash,first_name,last_name)
        SELECT 'ana','ana@example.com','x','Ana','A'
        WHERE NOT EXISTS (
          SELECT 1 FROM "User" WHERE username='ana'
        )
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "User" WHERE username='ana'
      LIMIT 1;
    `);

    const uBojan = await ensureOne(`
      WITH ins AS (
        INSERT INTO "User"(username,email,password_hash,first_name,last_name)
        SELECT 'bojan','bojan@example.com','x','Bojan','B'
        WHERE NOT EXISTS (
          SELECT 1 FROM "User" WHERE username='bojan'
        )
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "User" WHERE username='bojan'
      LIMIT 1;
    `);

    // third user to provoke CLASS_FULL
    const uCiro = await ensureOne(`
      WITH ins AS (
        INSERT INTO "User"(username,email,password_hash,first_name,last_name)
        SELECT 'ciro','ciro@example.com','x','Ciro','C'
        WHERE NOT EXISTS (
          SELECT 1 FROM "User" WHERE username='ciro'
        )
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "User" WHERE username='ciro'
      LIMIT 1;
    `);

    // Instructor
    const instr = await ensureOne(`
      WITH ins AS (
        INSERT INTO "Instructor"(instructor_email,instructor_password_hash,first_name,last_name,biography)
        SELECT 'guru@bliss.com','x','Guru','G','Yoga master'
        WHERE NOT EXISTS (
          SELECT 1 FROM "Instructor" WHERE instructor_email='guru@bliss.com'
        )
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "Instructor" WHERE instructor_email='guru@bliss.com'
      LIMIT 1;
    `);

    // Trainings
    const tVinyasa = await ensureOne(`
      WITH ins AS (
        INSERT INTO "Training"(training_name,description,duration,intensity_level)
        SELECT 'Vinyasa','Flow',60,'Medium'
        WHERE NOT EXISTS (
          SELECT 1 FROM "Training" WHERE training_name='Vinyasa'
        )
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "Training" WHERE training_name='Vinyasa'
      LIMIT 1;
    `);

    const tYin = await ensureOne(`
      WITH ins AS (
        INSERT INTO "Training"(training_name,description,duration,intensity_level)
        SELECT 'Yin','Slow',75,'Low'
        WHERE NOT EXISTS (
          SELECT 1 FROM "Training" WHERE training_name='Yin'
        )
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "Training" WHERE training_name='Yin'
      LIMIT 1;
    `);

    // One class tomorrow with capacity 2
    const cls = await ensureOne(
      `
      WITH ins AS (
        INSERT INTO "Class"(date,start_time,end_time,location,capacity,seats_available,instructor_id)
        SELECT CURRENT_DATE + 1,'18:00','19:00','Studio A',2,2,$1
        WHERE NOT EXISTS (
          SELECT 1 FROM "Class" WHERE date=CURRENT_DATE + 1 AND start_time='18:00' AND location='Studio A'
        )
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "Class" WHERE date=CURRENT_DATE + 1 AND start_time='18:00' AND location='Studio A'
      LIMIT 1;
    `,
      [instr.instructor_id]
    );

    // Link class to both trainings
    await client.query(
      `
      INSERT INTO "Class_Includes_Training"(class_id,training_id)
      SELECT $1, $2 WHERE NOT EXISTS (
        SELECT 1 FROM "Class_Includes_Training" WHERE class_id=$1 AND training_id=$2
      );
    `,
      [cls.class_id, tVinyasa.training_id]
    );

    await client.query(
      `
      INSERT INTO "Class_Includes_Training"(class_id,training_id)
      SELECT $1, $2 WHERE NOT EXISTS (
        SELECT 1 FROM "Class_Includes_Training" WHERE class_id=$1 AND training_id=$2
      );
    `,
      [cls.class_id, tYin.training_id]
    );

    // Packages
    const pkg5 = await ensureOne(`
      WITH ins AS (
        INSERT INTO "Package"(package_name,price,num_classes)
        SELECT '5-Class Pass',50,5
        WHERE NOT EXISTS (SELECT 1 FROM "Package" WHERE package_name='5-Class Pass')
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "Package" WHERE package_name='5-Class Pass'
      LIMIT 1;
    `);
    // Merch
    const mat = await ensureOne(`
      WITH ins AS (
        INSERT INTO "Merch_Items"(item_name,price)
        SELECT 'Yoga Mat',30
        WHERE NOT EXISTS (SELECT 1 FROM "Merch_Items" WHERE item_name='Yoga Mat')
        RETURNING *
      )
      SELECT * FROM ins
      UNION ALL
      SELECT * FROM "Merch_Items" WHERE item_name='Yoga Mat'
      LIMIT 1;
    `);

    // Purchases for reports
    await client.query(
      `
      INSERT INTO "User_Purchased_Package"(user_id,package_id)
      SELECT $1, $2 WHERE NOT EXISTS (
        SELECT 1 FROM "User_Purchased_Package" WHERE user_id=$1 AND package_id=$2
      );
    `,
      [uAna.user_id, pkg5.package_id]
    );

    await client.query(
      `
      INSERT INTO "User_Purchased_Merch"(user_id,merch_id)
      SELECT $1, $2 WHERE NOT EXISTS (
        SELECT 1 FROM "User_Purchased_Merch" WHERE user_id=$1 AND merch_id=$2
      );
    `,
      [uBojan.user_id, mat.merch_id]
    );

    await client.query("COMMIT");

    console.log("Seed done. User IDs:", {
      ana: uAna.user_id,
      bojan: uBojan.user_id,
      ciro: uCiro.user_id,
      classId: cls.class_id,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Seed error:", e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
