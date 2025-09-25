-- create.sql  (BlissCore) 

-- RESET (optional):

/*
-- Drop NEW bridge tables (if they exist)
DROP TABLE IF EXISTS "User_Booked_Class"       CASCADE;
DROP TABLE IF EXISTS "Class_Includes_Training" CASCADE;
DROP TABLE IF EXISTS "User_Purchased_Package"  CASCADE;
DROP TABLE IF EXISTS "User_Purchased_Merch"    CASCADE;
DROP TABLE IF EXISTS "Package_Includes_Class"  CASCADE;

-- Drop OLD bridge tables (from previous versions) just in case
DROP TABLE IF EXISTS "User_Class"              CASCADE;
DROP TABLE IF EXISTS "Class_Training"          CASCADE;
DROP TABLE IF EXISTS "User_Package"            CASCADE;
DROP TABLE IF EXISTS "User_Merch"              CASCADE;
DROP TABLE IF EXISTS "Package_Class"           CASCADE;
DROP TABLE IF EXISTS "User_Event"              CASCADE;

-- Drop base tables (order matters due to FKs)
DROP TABLE IF EXISTS "Merch_Items"  CASCADE;
DROP TABLE IF EXISTS "Package"      CASCADE;
DROP TABLE IF EXISTS "Event"        CASCADE;
DROP TABLE IF EXISTS "Class"        CASCADE;
DROP TABLE IF EXISTS "Training"     CASCADE;
DROP TABLE IF EXISTS "Instructor"   CASCADE;
DROP TABLE IF EXISTS "User"         CASCADE;
*/


-- CREATE TABLES

CREATE TABLE IF NOT EXISTS "User" (
    user_id       BIGSERIAL       PRIMARY KEY,
    username      VARCHAR(50)     NOT NULL,
    email         VARCHAR(100)    NOT NULL,
    password_hash VARCHAR(150)    NOT NULL,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50)
);


CREATE TABLE IF NOT EXISTS "Instructor" (
    instructor_id              BIGSERIAL       PRIMARY KEY,
    instructor_email           VARCHAR(100)    NOT NULL,
    instructor_password_hash   VARCHAR(150)    NOT NULL,
    first_name                 VARCHAR(50)     NOT NULL,
    last_name                  VARCHAR(50)     NOT NULL,
    biography                  TEXT
);


CREATE TABLE IF NOT EXISTS "Training" (
    training_id     BIGSERIAL       PRIMARY KEY,
    training_name   VARCHAR(100)    NOT NULL,
    description     TEXT,
    duration        INT,
    intensity_level VARCHAR(50)
);


CREATE TABLE IF NOT EXISTS "Class" (
    class_id        BIGSERIAL       PRIMARY KEY,
    date            DATE            NOT NULL,
    start_time      TIME            NOT NULL,
    end_time        TIME            NOT NULL,
    location        VARCHAR(100)    NOT NULL,
    capacity        INT,
    seats_available INT,
    instructor_id   BIGINT,
    CONSTRAINT fk_instructor
      FOREIGN KEY (instructor_id)
      REFERENCES "Instructor"(instructor_id)
      ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS "Event" (
    event_id    BIGSERIAL        PRIMARY KEY,
    event_name  VARCHAR(100)     NOT NULL,
    description TEXT,
    date        DATE             NOT NULL,
    time        TIME             NOT NULL,
    location    VARCHAR(100)     NOT NULL
);


CREATE TABLE IF NOT EXISTS "Package" (
    package_id   BIGSERIAL       PRIMARY KEY,
    package_name VARCHAR(100)    NOT NULL,
    price        DECIMAL(10,2)   NOT NULL,
    num_classes  INT             NOT NULL
);


CREATE TABLE IF NOT EXISTS "Merch_Items" (
    merch_id          BIGSERIAL        PRIMARY KEY,
    item_name         VARCHAR(100)     NOT NULL,
    description       TEXT,
    price             DECIMAL(10,2)    NOT NULL,
    quantity_in_stock INT
);

-- M:N BRIDGE TABLES (new names)
----------------------------------------------------

-- (1) User books a Class
CREATE TABLE IF NOT EXISTS "User_Booked_Class" (
    user_id  BIGINT,
    class_id BIGINT,
    PRIMARY KEY(user_id, class_id),
    FOREIGN KEY (user_id)  REFERENCES "User"(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES "Class"(class_id) ON DELETE CASCADE
);

-- (2) A Class includes one or more Trainings
CREATE TABLE IF NOT EXISTS "Class_Includes_Training" (
    class_id    BIGINT,
    training_id BIGINT,
    PRIMARY KEY(class_id, training_id),
    FOREIGN KEY (class_id)   REFERENCES "Class"(class_id)      ON DELETE CASCADE,
    FOREIGN KEY (training_id) REFERENCES "Training"(training_id) ON DELETE CASCADE
);

-- (3) User registers for an Event  
CREATE TABLE IF NOT EXISTS "User_Event" (
    user_id  BIGINT,
    event_id BIGINT,
    PRIMARY KEY(user_id, event_id),
    FOREIGN KEY (user_id)  REFERENCES "User"(user_id)    ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES "Event"(event_id)  ON DELETE CASCADE
);

-- (4) User purchases a Package
CREATE TABLE IF NOT EXISTS "User_Purchased_Package" (
    user_id    BIGINT,
    package_id BIGINT,
    PRIMARY KEY(user_id, package_id),
    FOREIGN KEY (user_id)    REFERENCES "User"(user_id)      ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES "Package"(package_id) ON DELETE CASCADE
);

-- (5) User purchases Merch
CREATE TABLE IF NOT EXISTS "User_Purchased_Merch" (
    user_id  BIGINT,
    merch_id BIGINT,
    PRIMARY KEY(user_id, merch_id),
    FOREIGN KEY (user_id)  REFERENCES "User"(user_id)         ON DELETE CASCADE,
    FOREIGN KEY (merch_id) REFERENCES "Merch_Items"(merch_id) ON DELETE CASCADE
);

-- (6) Package includes specific Classes
CREATE TABLE IF NOT EXISTS "Package_Includes_Class" (
    package_id BIGINT,
    class_id   BIGINT,
    PRIMARY KEY(package_id, class_id),
    FOREIGN KEY (package_id) REFERENCES "Package"(package_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id)   REFERENCES "Class"(class_id)     ON DELETE CASCADE
);
