-- Preserve item discounts and audit void operations without deleting sale records.
ALTER TABLE `transactions`
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'completed' AFTER `total_amount`,
  ADD COLUMN `voided_at` DATETIME NULL AFTER `status`,
  ADD COLUMN `void_reason` TEXT NULL AFTER `voided_at`,
  ADD COLUMN `voided_by_id` INT NULL AFTER `void_reason`,
  ADD COLUMN `voided_by_name` VARCHAR(120) NULL AFTER `voided_by_id`;

ALTER TABLE `transaction_items`
  ADD COLUMN `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `unit_cost`,
  ADD COLUMN `voided_at` DATETIME NULL AFTER `discount`,
  ADD COLUMN `void_reason` TEXT NULL AFTER `voided_at`;
