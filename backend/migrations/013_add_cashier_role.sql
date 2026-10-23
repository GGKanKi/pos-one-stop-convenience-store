-- Existing "staff" accounts were the POS cashiers before roles were split.
UPDATE users SET role = 'admin' WHERE LOWER(email) = 'admin@gmail.com';
UPDATE users SET role = 'cashier' WHERE role = 'staff';
ALTER TABLE users MODIFY role VARCHAR(20) NOT NULL DEFAULT 'cashier';
