-- AlterTable
ALTER TABLE `service`
  ADD COLUMN `isVisible` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `availableInOrder` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `availableInServices` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `servicepackage` (
  `id` VARCHAR(191) NOT NULL,
  `serviceId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `etaLabel` VARCHAR(191) NULL,
  `price` INTEGER NOT NULL,
  `durationMonths` INTEGER NULL,
  `isVisible` BOOLEAN NOT NULL DEFAULT true,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `servicepackage_serviceId_idx`(`serviceId`),
  INDEX `servicepackage_isVisible_isActive_idx`(`isVisible`, `isActive`),
  UNIQUE INDEX `servicepackage_serviceId_code_key`(`serviceId`, `code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `serviceorder`
  ADD COLUMN `servicePackageId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `serviceorder_servicePackageId_idx` ON `serviceorder`(`servicePackageId`);

-- AddForeignKey
ALTER TABLE `servicepackage`
  ADD CONSTRAINT `servicepackage_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `serviceorder`
  ADD CONSTRAINT `serviceorder_servicePackageId_fkey`
  FOREIGN KEY (`servicePackageId`) REFERENCES `servicepackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
