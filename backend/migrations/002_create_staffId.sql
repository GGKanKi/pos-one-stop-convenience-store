-- NEW TABLE: Links staff_id to user with FK
CREATE TABLE IF NOT EXISTS staff_ids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    staff_id VARCHAR(6) NOT NULL UNIQUE,
    avatar VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);