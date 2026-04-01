CREATE TABLE `serviceorder` (
  `id` VARCHAR(191) NOT NULL,
  `invoiceId` VARCHAR(191) NOT NULL,
  `serviceId` VARCHAR(191) NOT NULL,
  `packageName` VARCHAR(191) NOT NULL,
  `packageMultiplier` DOUBLE NOT NULL DEFAULT 1,
  `packageDescription` TEXT NULL,
  `etaLabel` VARCHAR(191) NULL,
  `customerName` VARCHAR(191) NOT NULL,
  `customerEmail` VARCHAR(191) NOT NULL,
  `customerPhone` VARCHAR(191) NOT NULL,
  `company` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `subtotal` INTEGER NOT NULL,
  `total` INTEGER NOT NULL,
  `status` ENUM('PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paymentMethod` VARCHAR(191) NULL,
  `paymentRef` VARCHAR(191) NULL,
  `paidAt` DATETIME(3) NULL,
  `progressNotes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `serviceorder_invoiceId_key`(`invoiceId`),
  INDEX `serviceorder_serviceId_idx`(`serviceId`),
  INDEX `serviceorder_customerEmail_idx`(`customerEmail`),
  INDEX `serviceorder_status_idx`(`status`),
  INDEX `serviceorder_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `serviceorder`
ADD CONSTRAINT `serviceorder_serviceId_fkey`
FOREIGN KEY (`serviceId`) REFERENCES `service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
