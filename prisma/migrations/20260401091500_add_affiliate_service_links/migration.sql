CREATE TABLE `affiliateservicelink` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `servicePackageId` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `clicks` INTEGER NOT NULL DEFAULT 0,
  `conversions` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `affiliateservicelink_code_key`(`code`),
  UNIQUE INDEX `affiliateservicelink_customerId_servicePackageId_key`(`customerId`, `servicePackageId`),
  INDEX `affiliateservicelink_customerId_idx`(`customerId`),
  INDEX `affiliateservicelink_servicePackageId_idx`(`servicePackageId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `serviceorder`
  ADD COLUMN `affiliateServiceLinkId` VARCHAR(191) NULL,
  ADD INDEX `serviceorder_affiliateServiceLinkId_idx`(`affiliateServiceLinkId`);

ALTER TABLE `affiliateservicelink`
  ADD CONSTRAINT `affiliateservicelink_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `affiliateservicelink_servicePackageId_fkey`
  FOREIGN KEY (`servicePackageId`) REFERENCES `servicepackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `serviceorder`
  ADD CONSTRAINT `serviceorder_affiliateServiceLinkId_fkey`
  FOREIGN KEY (`affiliateServiceLinkId`) REFERENCES `affiliateservicelink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
