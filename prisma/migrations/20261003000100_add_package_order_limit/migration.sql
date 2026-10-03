ALTER TABLE `package`
  ADD COLUMN `orderLimit` INTEGER NULL;

CREATE INDEX `order_packageId_idx` ON `order`(`packageId`);
