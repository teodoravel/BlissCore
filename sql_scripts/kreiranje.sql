-- kreiranje.sql

---------------------------------------------------------
-- 1) USER TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
    user_id       BIGSERIAL        PRIMARY KEY,
    username      VARCHAR(50)      NOT NULL,
    email         VARCHAR(100)     NOT NULL,
    password_hash VARCHAR(150)     NOT NULL,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50)
);

---------------------------------------------------------
-- 2) INSTRUCTOR TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Instructor" (
    instructor_id             BIGSERIAL   PRIMARY KEY,
    instructor_email          VARCHAR(100) NOT NULL,
    instructor_password_hash  VARCHAR(150) NOT NULL,
    first_name                VARCHAR(50)  NOT NULL,
    last_name                 VARCHAR(50)  NOT NULL,
    biography                 TEXT
);

---------------------------------------------------------
-- 3) TRAINING TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Training" (
    training_id     BIGSERIAL     PRIMARY KEY,
    training_name   VARCHAR(100)  NOT NULL,
    description     TEXT,
    duration        INT,
    intensity_level VARCHAR(50)
);

---------------------------------------------------------
-- 4) CLASS TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Class" (
    class_id        BIGSERIAL     PRIMARY KEY,
    date            DATE          NOT NULL,
    start_time      TIME          NOT NULL,
    end_time        TIME          NOT NULL,
    location        VARCHAR(100)  NOT NULL,
    capacity        INT,
    seats_available INT,
    instructor_id   BIGINT,
    CONSTRAINT fk_instructor
       FOREIGN KEY (instructor_id)
       REFERENCES "Instructor"(instructor_id)
       ON DELETE SET NULL
);

---------------------------------------------------------
-- 5) EVENT TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Event" (
    event_id    BIGSERIAL      PRIMARY KEY,
    event_name  VARCHAR(100)   NOT NULL,
    description TEXT,
    date        DATE           NOT NULL,
    time        TIME           NOT NULL,
    location    VARCHAR(100)   NOT NULL
);

---------------------------------------------------------
-- 6) PACKAGE TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Package" (
    package_id   BIGSERIAL     PRIMARY KEY,
    package_name VARCHAR(100)  NOT NULL,
    price        DECIMAL(10,2) NOT NULL,
    num_classes  INT           NOT NULL
);

---------------------------------------------------------
-- 7) MERCH_ITEMS TABLE
---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Merch_Items" (
    merch_id          BIGSERIAL      PRIMARY KEY,
    item_name         VARCHAR(100)   NOT NULL,
    description       TEXT,
    price             DECIMAL(10,2)  NOT NULL,
    quantity_in_stock INT
);

---------------------------------------------------------
-- M:N RELATIONSHIP TABLES
---------------------------------------------------------

-- (1) USER_CLASS (books)
CREATE TABLE IF NOT EXISTS "User_Class" (
    user_id  BIGINT,
    class_id BIGINT,
    PRIMARY KEY(user_id, class_id),
    FOREIGN KEY (user_id) REFERENCES "User"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES "Class"(class_id) ON DELETE CASCADE
);

-- (2) CLASS_TRAINING (is_scheduled_for)
CREATE TABLE IF NOT EXISTS "Class_Training" (
    class_id   BIGINT,
    training_id BIGINT,
    PRIMARY KEY(class_id, training_id),
    FOREIGN KEY (class_id)    REFERENCES "Class"(class_id)    ON DELETE CASCADE,
    FOREIGN KEY (training_id) REFERENCES "Training"(training_id) ON DELETE CASCADE
);

-- (3) USER_EVENT (registers)
CREATE TABLE IF NOT EXISTS "User_Event" (
    user_id  BIGINT,
    event_id BIGINT,
    PRIMARY KEY(user_id, event_id),
    FOREIGN KEY (user_id)  REFERENCES "User"(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES "Event"(event_id) ON DELETE CASCADE
);

-- (4) USER_PACKAGE (buys)
CREATE TABLE IF NOT EXISTS "User_Package" (
    user_id    BIGINT,
    package_id BIGINT,
    PRIMARY KEY(user_id, package_id),
    FOREIGN KEY (user_id)    REFERENCES "User"(user_id)    ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES "Package"(package_id) ON DELETE CASCADE
);

-- (5) USER_MERCH (purchases)
CREATE TABLE IF NOT EXISTS "User_Merch" (
    user_id  BIGINT,
    merch_id BIGINT,
    PRIMARY KEY(user_id, merch_id),
    FOREIGN KEY (user_id)  REFERENCES "User"(user_id)        ON DELETE CASCADE,
    FOREIGN KEY (merch_id) REFERENCES "Merch_Items"(merch_id) ON DELETE CASCADE
);

-- (6) PACKAGE_CLASS (is_for)
CREATE TABLE IF NOT EXISTS "Package_Class" (
    package_id BIGINT,
    class_id   BIGINT,
    PRIMARY KEY(package_id, class_id),
    FOREIGN KEY (package_id) REFERENCES "Package"(package_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id)   REFERENCES "Class"(class_id)   ON DELETE CASCADE
);

---------------------------------------------------------
-- Optional: Drop Statements (Commented Out)
---------------------------------------------------------
-- DROP TABLE IF NOT EXISTS "Package_Class" CASCADE;
-- DROP TABLE IF NOT EXISTS "User_Merch" CASCADE;
-- DROP TABLE IF NOT EXISTS "User_Class" CASCADE;
-- DROP TABLE IF NOT EXISTS "User" CASCADE;
-- etc.

-- End of kreiranje.sql
