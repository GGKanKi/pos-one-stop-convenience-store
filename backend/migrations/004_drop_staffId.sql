DROP TABLE IF EXISTS staff_ids;


# Instead of 2 tables and the staff Id no being used, add the staff Id and avatar directly to the users table. This simplifies the schema and avoids unnecessary joins when fetching user data.
ALTER TABLE users
ADD COLUMN staff_id VARCHAR(6) UNIQUE NULL AFTER role,
ADD COLUMN avatar VARCHAR(255) DEFAULT NULL AFTER staff_id;