-- ========================== USER TABLE INITIALIZATION ==========================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
    role VARCHAR(20) NOT NULL DEFAULT 'staff'
);

-- RUN SEEDER FILES BY USING THIS IN THE TERMINAL
-- php backend/config/seeder.php