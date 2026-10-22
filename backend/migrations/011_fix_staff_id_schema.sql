-- Match the user table to the generated OS-MMYY-NN IDs and registration payload.
ALTER TABLE `users`
  MODIFY COLUMN `staff_id` VARCHAR(10) NULL;

-- Migration runner may resume after an earlier partial application; add hire_date only when missing.
SET @hire_date_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'hire_date'
);
SET @hire_date_sql = IF(
  @hire_date_exists = 0,
  'ALTER TABLE users ADD COLUMN hire_date DATE NULL AFTER avatar',
  'SELECT 1'
);
PREPARE hire_date_statement FROM @hire_date_sql;
EXECUTE hire_date_statement;
DEALLOCATE PREPARE hire_date_statement;
