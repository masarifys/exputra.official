INSERT INTO `servicepackage` (
  `id`, `serviceId`, `code`, `name`, `description`, `etaLabel`, `price`, `durationMonths`, `isVisible`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('sp_reg_', SUBSTRING(s.`id`, 1, 20)),
  s.`id`,
  'REGULAR',
  CONCAT(s.`name`, ' - Regular'),
  'Pengerjaan standar dengan biaya paling hemat.',
  '3-5 hari kerja',
  s.`price`,
  NULL,
  1,
  1,
  1,
  NOW(3),
  NOW(3)
FROM `service` s
WHERE NOT EXISTS (
  SELECT 1 FROM `servicepackage` p WHERE p.`serviceId` = s.`id` AND p.`code` = 'REGULAR'
);

INSERT INTO `servicepackage` (
  `id`, `serviceId`, `code`, `name`, `description`, `etaLabel`, `price`, `durationMonths`, `isVisible`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('sp_pri_', SUBSTRING(s.`id`, 1, 20)),
  s.`id`,
  'PRIORITY',
  CONCAT(s.`name`, ' - Priority'),
  'Prioritas pengerjaan lebih tinggi dari regular.',
  '2-3 hari kerja',
  ROUND(s.`price` * 1.25),
  NULL,
  1,
  1,
  2,
  NOW(3),
  NOW(3)
FROM `service` s
WHERE NOT EXISTS (
  SELECT 1 FROM `servicepackage` p WHERE p.`serviceId` = s.`id` AND p.`code` = 'PRIORITY'
);

INSERT INTO `servicepackage` (
  `id`, `serviceId`, `code`, `name`, `description`, `etaLabel`, `price`, `durationMonths`, `isVisible`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('sp_exp_', SUBSTRING(s.`id`, 1, 20)),
  s.`id`,
  'EXPRESS',
  CONCAT(s.`name`, ' - Express'),
  'Pengerjaan dipercepat untuk kebutuhan urgent.',
  '1-2 hari kerja',
  ROUND(s.`price` * 1.5),
  NULL,
  1,
  1,
  3,
  NOW(3),
  NOW(3)
FROM `service` s
WHERE NOT EXISTS (
  SELECT 1 FROM `servicepackage` p WHERE p.`serviceId` = s.`id` AND p.`code` = 'EXPRESS'
);

INSERT INTO `servicepackage` (
  `id`, `serviceId`, `code`, `name`, `description`, `etaLabel`, `price`, `durationMonths`, `isVisible`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('sp_e1_', SUBSTRING(s.`id`, 1, 20)),
  s.`id`,
  'EXT_1M',
  CONCAT(s.`name`, ' - Perpanjangan 1 Bulan'),
  'Perpanjangan layanan untuk 1 bulan.',
  'Aktivasi instan setelah pembayaran',
  ROUND(s.`price` * 0.4),
  1,
  1,
  1,
  4,
  NOW(3),
  NOW(3)
FROM `service` s
WHERE NOT EXISTS (
  SELECT 1 FROM `servicepackage` p WHERE p.`serviceId` = s.`id` AND p.`code` = 'EXT_1M'
);

INSERT INTO `servicepackage` (
  `id`, `serviceId`, `code`, `name`, `description`, `etaLabel`, `price`, `durationMonths`, `isVisible`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('sp_e2_', SUBSTRING(s.`id`, 1, 20)),
  s.`id`,
  'EXT_2M',
  CONCAT(s.`name`, ' - Perpanjangan 2 Bulan'),
  'Perpanjangan layanan untuk 2 bulan.',
  'Aktivasi instan setelah pembayaran',
  ROUND(s.`price` * 0.75),
  2,
  1,
  1,
  5,
  NOW(3),
  NOW(3)
FROM `service` s
WHERE NOT EXISTS (
  SELECT 1 FROM `servicepackage` p WHERE p.`serviceId` = s.`id` AND p.`code` = 'EXT_2M'
);

INSERT INTO `servicepackage` (
  `id`, `serviceId`, `code`, `name`, `description`, `etaLabel`, `price`, `durationMonths`, `isVisible`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`
)
SELECT
  CONCAT('sp_e3_', SUBSTRING(s.`id`, 1, 20)),
  s.`id`,
  'EXT_3M',
  CONCAT(s.`name`, ' - Perpanjangan 3 Bulan'),
  'Perpanjangan layanan untuk 3 bulan.',
  'Aktivasi instan setelah pembayaran',
  ROUND(s.`price` * 1.1),
  3,
  1,
  1,
  6,
  NOW(3),
  NOW(3)
FROM `service` s
WHERE NOT EXISTS (
  SELECT 1 FROM `servicepackage` p WHERE p.`serviceId` = s.`id` AND p.`code` = 'EXT_3M'
);
