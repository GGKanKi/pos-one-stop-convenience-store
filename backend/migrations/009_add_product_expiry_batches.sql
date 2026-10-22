-- Persist the inventory editor's per-expiration-date quantities across reloads.
ALTER TABLE `products`
  ADD COLUMN `expiry_batches` JSON NULL AFTER `expirationDate`;
