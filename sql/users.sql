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



-- RUN SEEDER FILES BY USING THIS IN THE TERMINAL
-- php backend/config/seeder.php
