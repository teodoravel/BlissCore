-- polnenje.sql

---------------------------------------------------------
-- SAMPLE DATA for BLISSCORE
---------------------------------------------------------

------------------------
-- 1) INSERT Users
------------------------
INSERT INTO "User" (username, email, password_hash, first_name, last_name)
VALUES
('ana123', 'ana@example.com', 'hash_ana', 'Ana', 'Naumovska'),
('mikiYoga', 'miki@example.com', 'hash_miki', 'Miki', 'Trajkov'),
('davidG', 'david@example.com', 'hash_david', 'David', 'Georgiev');

------------------------
-- 2) INSERT Instructors
------------------------
-- Now includes instructor_email and instructor_password_hash
INSERT INTO "Instructor" (instructor_email, instructor_password_hash, first_name, last_name, biography)
VALUES
('elena@blisscore.com', 'hash_elena', 'Elena', 'Petrova', 'Certified Vinyasa Yoga Instructor'),
('stefan@blisscore.com', 'hash_stefan', 'Stefan', 'Ristov', 'Hatha & Yin Yoga Teacher');

------------------------
-- 3) INSERT Trainings
------------------------
INSERT INTO "Training" (training_name, description, duration, intensity_level)
VALUES
('Vinyasa Flow', 'Linking breath to movement', 60, 'Intermediate'),
('Hatha Basics', 'Slower practice, foundational poses', 45, 'Beginner');

------------------------
-- 4) INSERT Classes
------------------------
INSERT INTO "Class" (date, start_time, end_time, location, capacity, seats_available, instructor_id)
VALUES
('2025-05-15', '08:00', '09:00', 'Studio A', 20, 20, 1),
('2025-05-15', '09:30', '10:30', 'Studio B', 15, 15, 2);

------------------------
-- 5) INSERT Events
------------------------
INSERT INTO "Event" (event_name, description, date, time, location)
VALUES
('Spring Yoga Workshop', 'Outdoor session for all levels', '2025-04-10', '09:00', 'City Park'),
('Meditation Retreat', 'Weekend retreat with guided meditation', '2025-08-01', '08:00', 'Mountain Lodge');

------------------------
-- 6) INSERT Packages
------------------------
INSERT INTO "Package" (package_name, price, num_classes)
VALUES
('5-Class Pass', 25.00, 5),
('10-Class Pass', 45.00, 10);

------------------------
-- 7) INSERT Merch Items
------------------------
INSERT INTO "Merch_Items" (item_name, description, price, quantity_in_stock)
VALUES
('Yoga Mat', 'Eco-friendly mat', 30.00, 50),
('Yoga Block', 'Cork block for alignment', 12.00, 30);

-------------------------------------------------------
-- M:N BRIDGE TABLES
-------------------------------------------------------

-- user_class (books)
INSERT INTO "User_Class" (user_id, class_id)
VALUES
(1, 1),  -- Ana books Class 1
(2, 1),  -- Miki also books Class 1
(3, 2);  -- David books Class 2

-- class_training (is_scheduled_for)
INSERT INTO "Class_Training" (class_id, training_id)
VALUES
(1, 1),  -- Class 1 includes Vinyasa Flow
(2, 2);  -- Class 2 includes Hatha Basics

-- user_event (registers)
INSERT INTO "User_Event" (user_id, event_id)
VALUES
(1, 1),  -- Ana registers for Spring Yoga Workshop
(2, 2);  -- Miki registers for Meditation Retreat

-- user_package (buys)
INSERT INTO "User_Package" (user_id, package_id)
VALUES
(1, 1),  -- Ana buys 5-Class Pass
(2, 1),  -- Miki also buys 5-Class Pass
(3, 2);  -- David buys 10-Class Pass

-- user_merch (purchases)
INSERT INTO "User_Merch" (user_id, merch_id)
VALUES
(1, 1),  -- Ana buys a Yoga Mat
(1, 2),  -- Ana also buys a Yoga Block
(2, 2);  -- Miki buys a Yoga Block

-- package_class (is_for)
INSERT INTO "Package_Class" (package_id, class_id)
VALUES
(1, 1),  -- 5-Class Pass includes Class 1
(1, 2),  -- 5-Class Pass includes Class 2
(2, 1);  -- 10-Class Pass includes Class 1

-- End of polnenje.sql
