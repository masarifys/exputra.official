import { z } from 'zod';

export const domainSchema = z.object({
  extension: z.string().min(2).regex(/^\.[a-z.]+$/, 'Extension harus dimulai dengan titik'),
  price: z.number().min(0),
  isActive: z.boolean().default(true),
  label: z.enum(['POPULAR', 'BEST_SELLER', 'PROMO']).nullable().optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1),
  thumbnail: z.string().optional(),
  previewUrl: z.string().optional(),
  category: z.string().min(1),
  price: z.number().min(0).default(0),
  isPaid: z.boolean().default(false),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const packageSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  price1Year: z.number().min(0).optional(),
  price2Year: z.number().min(0).optional(),
  price3Year: z.number().min(0).optional(),
  duration: z.number().min(1),
  features: z.string().min(1),
  isPopular: z.boolean().default(false),
  freeDomain: z.boolean().default(false),
  freeDomainIds: z.array(z.string()).optional(),
  freeTemplate: z.boolean().default(false),
  freeTemplateIds: z.array(z.string()).optional(),
  discountBadge: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  priceType: z.enum(['ONE_TIME', 'PER_YEAR', 'MONTHLY']).default('ONE_TIME'),
  isVisible: z.boolean().default(true),
  availableInOrder: z.boolean().default(true),
  availableInServices: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const servicePackageSchema = z.object({
  serviceId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  etaLabel: z.string().optional(),
  price: z.number().min(0),
  durationMonths: z.number().int().min(1).max(36).optional().nullable(),
  isVisible: z.boolean().default(true),
  visibleInOrder: z.boolean().default(true),
  visibleInServices: z.boolean().default(true),
  internalOnly: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const promoSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  discountType: z.enum(['PERCENT', 'NOMINAL']),
  discountValue: z.number().min(0),
  minTransaction: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).nullable().optional(),
  expiredAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type DomainInput = z.infer<typeof domainSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type PackageInput = z.infer<typeof packageSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ServicePackageInput = z.infer<typeof servicePackageSchema>;
export type PromoInput = z.infer<typeof promoSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Client Management Schemas

export const clientSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('').transform(() => undefined)),
  whatsapp: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const domainRegistrarSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().optional(),
  password: z.string().optional(),
  loginUrl: z.string().url().optional().or(z.literal('')),
  expiredAt: z.string().optional().nullable().transform(val => {
    if (!val) return null;
    // Accept both date format (YYYY-MM-DD) and datetime format
    return val;
  }),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const clientDomainSchema = z.object({
  clientEmail: z.string().min(1),
  domainName: z.string().min(1, 'Domain name is required'),
  registrarId: z.string().optional().nullable(),
  registeredAt: z.string().transform((str) => new Date(str)),
  expiredAt: z.string().transform((str) => new Date(str)),
  status: z.enum(['ACTIVE', 'EXPIRED', 'PENDING', 'SUSPENDED']).default('ACTIVE'),
  autoRenew: z.boolean().default(false),
  notes: z.string().optional(),
});

export const clientServerSchema = z.object({
  clientEmail: z.string().min(1),
  serverName: z.string().min(1, 'Server name is required'),
  ipAddress: z.string().min(1, 'IP Address is required'),
  location: z.string().min(1, 'Location is required'),
  serverType: z.enum(['SHARED', 'VPS', 'DEDICATED', 'CLOUD']),
  username: z.string().optional(),
  password: z.string().optional(),
  loginUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).default('ACTIVE'),
  expiredAt: z.string().optional().nullable().transform(val => {
    if (!val) return null;
    // Accept both date format (YYYY-MM-DD) and datetime format
    return val;
  }),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type DomainRegistrarInput = z.infer<typeof domainRegistrarSchema>;
export type ClientDomainInput = z.infer<typeof clientDomainSchema>;
export type ClientServerInput = z.infer<typeof clientServerSchema>;
