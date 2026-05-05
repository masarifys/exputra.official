-- CreateTable
CREATE TABLE `affiliaterequest` (
  `id` VARCHAR(191) NOT NULL,
  `affiliateCode` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `affiliaterequest_affiliateCode_key`(`affiliateCode`),
  INDEX `affiliaterequest_customerId_idx`(`customerId`),
  INDEX `affiliaterequest_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `affiliaterequest` ADD FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;