-- AlterTable
ALTER TABLE `order` ADD COLUMN `affiliateLinkId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `affiliatelink` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `packageId` VARCHAR(191) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `clicks` INTEGER NOT NULL DEFAULT 0,
  `conversions` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `affiliatelink_code_key`(`code`),
  UNIQUE INDEX `affiliatelink_customerId_packageId_key`(`customerId`, `packageId`),
  INDEX `affiliatelink_customerId_idx`(`customerId`),
  INDEX `affiliatelink_packageId_idx`(`packageId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliatevisit` (
  `id` VARCHAR(191) NOT NULL,
  `affiliateLinkId` VARCHAR(191) NOT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` VARCHAR(191) NULL,
  `referrer` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `affiliatevisit_affiliateLinkId_idx`(`affiliateLinkId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `order_affiliateLinkId_idx` ON `order`(`affiliateLinkId`);

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_affiliateLinkId_fkey` FOREIGN KEY (`affiliateLinkId`) REFERENCES `affiliatelink`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `affiliatelink` ADD CONSTRAINT `affiliatelink_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `affiliatelink` ADD CONSTRAINT `affiliatelink_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `package`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `affiliatevisit` ADD CONSTRAINT `affiliatevisit_affiliateLinkId_fkey` FOREIGN KEY (`affiliateLinkId`) REFERENCES `affiliatelink`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
