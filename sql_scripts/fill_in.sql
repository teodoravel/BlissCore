-- fill_in.sql  (robust, ID-agnostic)

-- Optional: clear data if re-running
-- (Do bridges first to avoid FK issues)
DELETE FROM "User_Purchased_Package";
DELETE FROM "User_Purchased_Merch";
DELETE FROM "User_Event";
DELETE FROM "User_Booked_Class";
DELETE FROM "Class_Includes_Training";

DELETE FROM "Merch_Items";
DELETE FROM "Package";
DELETE FROM "Event";
DELETE FROM "Class";
DELETE FROM "Training";
DELETE FROM "Instructor";
DELETE FROM "User";


INSERT INTO "User" (username, email, password_hash, first_name, last_name)
VALUES
('ana123',   'ana@example.com',   'hashA1', 'Ana',   'Naumovska'),
('mikiYoga', 'miki@example.com',  'hashA2', 'Miki',  'Trajkov'),
('davidG',   'david@example.com', 'hashA3', 'David', 'Georgiev');


INSERT INTO "Instructor" (instructor_email, instructor_password_hash, first_name, last_name, biography)
VALUES
('elena@studio.com',  'passElena',  'Elena',  'Petrova', 'Certified in Vinyasa Yoga'),
('stefan@studio.com', 'passStefan', 'Stefan', 'Ristov',  'Hatha & Yin Yoga Teacher');


INSERT INTO "Training" (training_name, description, duration, intensity_level)
VALUES
('Vinyasa Flow', 'Linking breath to movement', 60, 'Intermediate'),
('Hatha Basics', 'Focus on foundational poses', 45, 'Beginner');


INSERT INTO "Class" (date, start_time, end_time, location, capacity, seats_available, instructor_id)
VALUES
('2025-06-10', '08:00', '09:00', 'Studio A', 20, 20, 
  (SELECT instructor_id FROM "Instructor" WHERE instructor_email='elena@studio.com')),
('2025-06-10', '09:30', '10:30', 'Studio B', 15, 15, 
  (SELECT instructor_id FROM "Instructor" WHERE instructor_email='stefan@studio.com'));


INSERT INTO "Event" (event_name, description, date, time, location)
VALUES
('Summer Yoga Workshop', 'Outdoor event for all levels', '2025-07-05', '09:00', 'City Park'),
('Meditation Retreat',   'Weekend retreat with meditation', '2025-08-01', '08:00', 'Mountain Lodge');


INSERT INTO "Package" (package_name, price, num_classes)
VALUES
('5-Class Pass',  25.00,  5),
('10-Class Pass', 45.00, 10);


INSERT INTO "Merch_Items" (item_name, description, price, quantity_in_stock)
VALUES
('Yoga Mat',   'Eco-friendly TPE mat', 30.00, 50),
('Yoga Block', 'Cork block for alignment', 12.00, 30);


-- Bridge tables (via sub-selects, no hardcoded IDs)

-- User_Booked_Class (books)
INSERT INTO "User_Booked_Class" (user_id, class_id)
VALUES
(
  (SELECT user_id  FROM "User"  WHERE email='ana@example.com'),
  (SELECT class_id FROM "Class" WHERE date='2025-06-10' AND start_time='08:00' AND location='Studio A')
),
(
  (SELECT user_id  FROM "User"  WHERE email='miki@example.com'),
  (SELECT class_id FROM "Class" WHERE date='2025-06-10' AND start_time='08:00' AND location='Studio A')
),
(
  (SELECT user_id  FROM "User"  WHERE email='david@example.com'),
  (SELECT class_id FROM "Class" WHERE date='2025-06-10' AND start_time='09:30' AND location='Studio B')
);

-- Class_Includes_Training (is_scheduled_for)
INSERT INTO "Class_Includes_Training" (class_id, training_id)
VALUES
(
  (SELECT class_id    FROM "Class"    WHERE date='2025-06-10' AND start_time='08:00' AND location='Studio A'),
  (SELECT training_id FROM "Training" WHERE training_name='Vinyasa Flow')
),
(
  (SELECT class_id    FROM "Class"    WHERE date='2025-06-10' AND start_time='09:30' AND location='Studio B'),
  (SELECT training_id FROM "Training" WHERE training_name='Hatha Basics')
);

-- User_Event (registers)  (backend expects this table name)
INSERT INTO "User_Event" (user_id, event_id)
VALUES
(
  (SELECT user_id  FROM "User"  WHERE email='ana@example.com'),
  (SELECT event_id FROM "Event" WHERE event_name='Summer Yoga Workshop' AND date='2025-07-05')
),
(
  (SELECT user_id  FROM "User"  WHERE email='miki@example.com'),
  (SELECT event_id FROM "Event" WHERE event_name='Meditation Retreat' AND date='2025-08-01')
);

-- User_Purchased_Package (buys)
INSERT INTO "User_Purchased_Package" (user_id, package_id)
VALUES
(
  (SELECT user_id    FROM "User"    WHERE email='ana@example.com'),
  (SELECT package_id FROM "Package" WHERE package_name='5-Class Pass')
),
(
  (SELECT user_id    FROM "User"    WHERE email='miki@example.com'),
  (SELECT package_id FROM "Package" WHERE package_name='10-Class Pass')
);

-- User_Purchased_Merch (purchases)
INSERT INTO "User_Purchased_Merch" (user_id, merch_id)
VALUES
(
  (SELECT user_id  FROM "User"        WHERE email='ana@example.com'),
  (SELECT merch_id FROM "Merch_Items" WHERE item_name='Yoga Mat')
),
(
  (SELECT user_id  FROM "User"        WHERE email='ana@example.com'),
  (SELECT merch_id FROM "Merch_Items" WHERE item_name='Yoga Block')
),
(
  (SELECT user_id  FROM "User"        WHERE email='miki@example.com'),
  (SELECT merch_id FROM "Merch_Items" WHERE item_name='Yoga Block')
);

-- Package_Includes_Class (is_for)
INSERT INTO "Package_Includes_Class" (package_id, class_id)
VALUES
(
  (SELECT package_id FROM "Package" WHERE package_name='5-Class Pass'),
  (SELECT class_id   FROM "Class"   WHERE date='2025-06-10' AND start_time='08:00' AND location='Studio A')
),
(
  (SELECT package_id FROM "Package" WHERE package_name='5-Class Pass'),
  (SELECT class_id   FROM "Class"   WHERE date='2025-06-10' AND start_time='09:30' AND location='Studio B')
),
(
  (SELECT package_id FROM "Package" WHERE package_name='10-Class Pass'),
  (SELECT class_id   FROM "Class"   WHERE date='2025-06-10' AND start_time='08:00' AND location='Studio A')
);
