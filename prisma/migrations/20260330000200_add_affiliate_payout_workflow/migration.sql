-- CreateTable
CREATE TABLE `affiliatebankaccount` (
  `id` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `bankName` VARCHAR(191) NOT NULL,
  `accountNumber` VARCHAR(191) NOT NULL,
  `accountHolderName` VARCHAR(191) NOT NULL,
  `branch` VARCHAR(191) NULL,
  `isVerified` BOOLEAN NOT NULL DEFAULT false,
  `verifiedAt` DATETIME(3) NULL,
  `verifiedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `affiliatebankaccount_customerId_key`(`customerId`),
  INDEX `affiliatebankaccount_isVerified_idx`(`isVerified`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliatepayoutrequest` (
  `id` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `bankAccountId` VARCHAR(191) NOT NULL,
  `requestedAmount` INTEGER NOT NULL,
  `approvedAmount` INTEGER NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID') NOT NULL DEFAULT 'PENDING',
  `customerNote` TEXT NULL,
  `adminNote` TEXT NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `affiliatepayoutrequest_customerId_status_idx`(`customerId`, `status`),
  INDEX `affiliatepayoutrequest_bankAccountId_idx`(`bankAccountId`),
  INDEX `affiliatepayoutrequest_requestedAt_idx`(`requestedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `affiliatebankaccount` ADD CONSTRAINT `affiliatebankaccount_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `affiliatepayoutrequest` ADD CONSTRAINT `affiliatepayoutrequest_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `affiliatepayoutrequest` ADD CONSTRAINT `affiliatepayoutrequest_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `affiliatebankaccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
