-- Add themeExtensionEnabled field to Shop table
ALTER TABLE `Shop` ADD COLUMN `themeExtensionEnabled` BOOLEAN NOT NULL DEFAULT true;
