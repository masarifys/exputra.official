CREATE TABLE `affiliatesetting` (
  `id` VARCHAR(191) NOT NULL,
  `commissionPercent` INTEGER NOT NULL DEFAULT 10,
  `minPayout` INTEGER NOT NULL DEFAULT 50000,
  `adminFeePercent` INTEGER NOT NULL DEFAULT 0,
  `rules` TEXT NULL,
  `syncedPackageIds` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
