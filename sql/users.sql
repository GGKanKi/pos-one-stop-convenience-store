CREATE TABLE IF NOT EXISTS users (

    first_name VARCHAR(50) NOT NULL UNIQUE,
    last_name VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
);

INSERT INTO users (first_name, last_name, email, password_hash) 
VALUES ('test','test', 'test@gmail.com', 'test123');