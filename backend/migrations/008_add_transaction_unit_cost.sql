-- Keep historical costs nullable; new POS sales store a cost snapshot for accurate profit reporting.
ALTER TABLE `transaction_items`
  ADD COLUMN `unit_cost` DECIMAL(10,2) NULL AFTER `price`;
