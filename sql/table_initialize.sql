-- ========================== USER TABLE INITIALIZATION ==========================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    user_profile VARCHAR(255) DEFAULT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff'
);

-- IF USER TABLE ALREADY CREATED WITH ROLE COLUMN - RUN THIS QUERY
/** 
ALTER TABLE USERS
RENAME COLUMN ROLE to role;
*/


-- NEW TABLE: Links staff_id to user with FK
CREATE TABLE staff_ids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    staff_id VARCHAR(6) NOT NULL UNIQUE,
    avatar VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



-- RUN SEEDER FILES BY USING THIS IN THE TERMINAL
-- php backend/config/seeder.php


-- ========================== UPDATE THIS SPECIFIC FILE FOR TABLE CREATION ==========================
