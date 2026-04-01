-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `order_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `order_templateId_fkey`;

-- AlterTable
ALTER TABLE `affiliatepayoutrequest` MODIFY `customerNote` VARCHAR(191) NULL,
    MODIFY `adminNote` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `order` MODIFY `templateId` VARCHAR(191) NULL,
    MODIFY `packageId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `package`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
