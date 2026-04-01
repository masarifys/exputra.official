-- AlterTable
ALTER TABLE `affiliatebankaccount`
  ADD COLUMN `rejectedAt` DATETIME(3) NULL,
  ADD COLUMN `rejectedBy` VARCHAR(191) NULL,
  ADD COLUMN `rejectionReason` TEXT NULL;
