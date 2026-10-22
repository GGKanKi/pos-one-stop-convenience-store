CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Cash',
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_transactions_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Append-only record of inventory changes, including who made each adjustment and why.
CREATE TABLE IF NOT EXISTS inventory_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL,
  product_id INT UNSIGNED NULL,
  product_name VARCHAR(255) NOT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  quantity_change INT NULL,
  reason TEXT NULL,
  user_id INT NULL,
  user_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inventory_audit_created_at (created_at),
  INDEX idx_inventory_audit_action_type (action_type),
  INDEX idx_inventory_audit_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
