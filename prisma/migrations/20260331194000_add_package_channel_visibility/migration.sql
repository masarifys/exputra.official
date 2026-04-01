ALTER TABLE `servicepackage`
  ADD COLUMN `visibleInOrder` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `visibleInServices` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `internalOnly` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `servicepackage_visibleInOrder_visibleInServices_internalOnly_idx`
  ON `servicepackage`(`visibleInOrder`, `visibleInServices`, `internalOnly`);
