/*
  Warnings:

  - You are about to drop the column `location` on the `notificationconfig` table. All the data in the column will be lost.
  - You are about to drop the column `messageTitle` on the `notificationconfig` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `notificationconfig` table. All the data in the column will be lost.
  - You are about to drop the column `productHandle` on the `notificationconfig` table. All the data in the column will be lost.
  - You are about to drop the column `productHandlesJson` on the `notificationconfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `notificationconfig` DROP COLUMN `location`,
    DROP COLUMN `messageTitle`,
    DROP COLUMN `name`,
    DROP COLUMN `productHandle`,
    DROP COLUMN `productHandlesJson`;

-- AlterTable
ALTER TABLE `session` ALTER COLUMN `updatedAt` DROP DEFAULT;
