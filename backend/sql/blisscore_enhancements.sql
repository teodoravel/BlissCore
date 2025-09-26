-- VIEWS (used by advanced reports)


-- 1) Потрошувачка по корисник (пакети + мерч)
CREATE OR REPLACE VIEW vw_user_spend AS
WITH pkg AS (
  SELECT u.user_id, SUM(p.price) AS spend_packages, COUNT(*) AS cnt_packages
  FROM "User_Purchased_Package" upp
  JOIN "User"    u ON u.user_id = upp.user_id
  JOIN "Package" p ON p.package_id = upp.package_id
  GROUP BY u.user_id
),
merch AS (
  SELECT u.user_id, SUM(m.price) AS spend_merch, COUNT(*) AS cnt_merch
  FROM "User_Purchased_Merch" upm
  JOIN "User"        u ON u.user_id = upm.user_id
  JOIN "Merch_Items" m ON m.merch_id = upm.merch_id
  GROUP BY u.user_id
)
SELECT u.user_id, u.username, u.email,
       COALESCE(pkg.spend_packages,0) AS spend_packages,
       COALESCE(merch.spend_merch,0)  AS spend_merch,
       COALESCE(pkg.spend_packages,0) + COALESCE(merch.spend_merch,0) AS total_spend,
       COALESCE(pkg.cnt_packages,0) AS cnt_packages,
       COALESCE(merch.cnt_merch,0)  AS cnt_merch
FROM "User" u
LEFT JOIN pkg   ON pkg.user_id   = u.user_id
LEFT JOIN merch ON merch.user_id = u.user_id;

-- 2) Исполнетост на часови
CREATE OR REPLACE VIEW vw_class_utilization AS
SELECT
  c.class_id, c.date, c.start_time, c.end_time, c.location,
  c.capacity,
  COUNT(ubc.user_id) AS booked,
  CASE
    WHEN c.capacity IS NULL OR c.capacity = 0 THEN NULL
    ELSE ROUND((COUNT(ubc.user_id)::numeric / c.capacity) * 100, 2)
  END AS utilization_pct,
  c.instructor_id
FROM "Class" c
LEFT JOIN "User_Booked_Class" ubc ON ubc.class_id = c.class_id
GROUP BY c.class_id;

-- 3) Популарност на тренинзи по месец
CREATE OR REPLACE VIEW vw_training_pop_monthly AS
SELECT
  t.training_id,
  t.training_name,
  date_trunc('month', c.date)::date AS month,
  COUNT(DISTINCT ubc.user_id) AS num_bookings
FROM "Training" t
JOIN "Class_Includes_Training" cit ON cit.training_id = t.training_id
JOIN "Class" c                     ON c.class_id      = cit.class_id
LEFT JOIN "User_Booked_Class" ubc  ON ubc.class_id    = c.class_id
GROUP BY t.training_id, t.training_name, date_trunc('month', c.date)::date;


-- TRIGGERS: guard & maintain seats_available


-- BEFORE INSERT: block overbooking (and lock Class row)
CREATE OR REPLACE FUNCTION tg_ubc_before_ins_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_cap INT; v_seats INT; v_now_booked INT;
BEGIN
  SELECT capacity, seats_available INTO v_cap, v_seats
  FROM "Class"
  WHERE class_id = NEW.class_id
  FOR UPDATE;

  IF v_cap IS NOT NULL THEN
    IF v_seats IS NULL THEN
      SELECT COUNT(*) INTO v_now_booked
      FROM "User_Booked_Class"
      WHERE class_id = NEW.class_id
      FOR UPDATE;
      v_seats := v_cap - v_now_booked;
    END IF;

    IF v_seats <= 0 THEN
      RAISE EXCEPTION 'Class % is full', NEW.class_id
        USING ERRCODE = '23514'; -- check_violation
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- AFTER INSERT: decrement seats_available
CREATE OR REPLACE FUNCTION tg_ubc_after_ins_decrement()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Class"
  SET seats_available = CASE
                          WHEN seats_available IS NULL THEN NULL
                          ELSE seats_available - 1
                        END
  WHERE class_id = NEW.class_id;
  RETURN NULL;
END $$;

-- AFTER DELETE: increment seats_available
CREATE OR REPLACE FUNCTION tg_ubc_after_del_increment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "Class"
  SET seats_available = CASE
                          WHEN seats_available IS NULL THEN NULL
                          ELSE seats_available + 1
                        END
  WHERE class_id = OLD.class_id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_ubc_before_ins_guard    ON "User_Booked_Class";
DROP TRIGGER IF EXISTS trg_ubc_after_ins_decrement  ON "User_Booked_Class";
DROP TRIGGER IF EXISTS trg_ubc_after_del_increment  ON "User_Booked_Class";

CREATE TRIGGER trg_ubc_before_ins_guard
BEFORE INSERT ON "User_Booked_Class"
FOR EACH ROW EXECUTE FUNCTION tg_ubc_before_ins_guard();

CREATE TRIGGER trg_ubc_after_ins_decrement
AFTER INSERT ON "User_Booked_Class"
FOR EACH ROW EXECUTE FUNCTION tg_ubc_after_ins_decrement();

CREATE TRIGGER trg_ubc_after_del_increment
AFTER DELETE ON "User_Booked_Class"
FOR EACH ROW EXECUTE FUNCTION tg_ubc_after_del_increment();


-- Function for booking

CREATE OR REPLACE FUNCTION book_class(p_user_id BIGINT, p_class_id BIGINT)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "User_Booked_Class"(user_id, class_id)
  VALUES (p_user_id, p_class_id);
  RETURN 'OK';
EXCEPTION
  WHEN unique_violation THEN
    RETURN 'ALREADY_BOOKED';
  WHEN foreign_key_violation THEN
    RETURN 'NO_SUCH_USER_OR_CLASS';
  WHEN check_violation THEN
    RETURN 'CLASS_FULL';
END $$;


-- INDEXES 

-- Индекси на bridge табели
CREATE INDEX IF NOT EXISTS idx_ubc_class    ON "User_Booked_Class"(class_id);
CREATE INDEX IF NOT EXISTS idx_cht_training ON "Class_Includes_Training"(training_id);
CREATE INDEX IF NOT EXISTS idx_ue_event     ON "User_Event"(event_id);
CREATE INDEX IF NOT EXISTS idx_upp_package  ON "User_Purchased_Package"(package_id);
CREATE INDEX IF NOT EXISTS idx_upm_merch    ON "User_Purchased_Merch"(merch_id);
CREATE INDEX IF NOT EXISTS idx_pic_class    ON "Package_Includes_Class"(class_id);

-- Индекси за честите листања
CREATE INDEX IF NOT EXISTS idx_event_date_time ON "Event"(date, time);
CREATE INDEX IF NOT EXISTS idx_class_date_time ON "Class"(date, start_time);
