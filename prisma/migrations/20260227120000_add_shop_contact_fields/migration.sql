-- Add merchant contact details and explicit activity status to shop installs.
ALTER TABLE `shop`
  ADD COLUMN IF NOT EXISTS `status` VARCHAR(16) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS `firstName` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `lastName` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `email` VARCHAR(320) NULL,
  ADD COLUMN IF NOT EXISTS `phone` VARCHAR(64) NULL;

-- Keep status aligned with existing install state for already-installed rows.
UPDATE `shop`
SET `status` = CASE
  WHEN `installed` = 1 THEN 'active'
  ELSE 'inactive'
END;
