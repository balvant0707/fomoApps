-- AlterTable
ALTER TABLE `session` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `NotificationConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `shop` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `showType` VARCHAR(191) NOT NULL,
    `messageTitle` VARCHAR(191) NULL,
    `messageText` VARCHAR(191) NULL,
    `fontFamily` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `animation` VARCHAR(191) NOT NULL,
    `mobileSize` VARCHAR(191) NOT NULL,
    `mobilePositionJson` JSON NULL,
    `titleColor` VARCHAR(191) NOT NULL,
    `bgColor` VARCHAR(191) NOT NULL,
    `msgColor` VARCHAR(191) NOT NULL,
    `rounded` INTEGER NOT NULL,
    `name` VARCHAR(191) NULL,
    `durationSeconds` INTEGER NOT NULL,

    UNIQUE INDEX `NotificationConfig_shop_key_key`(`shop`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
