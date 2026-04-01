export interface Domain {
  id?: string;
  extension: string;
  price: number;
  isPopular?: boolean;
  isBestPrice?: boolean;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  image?: string;
  thumbnail?: string | null;
  price?: number;
  isPaid?: boolean;
  description?: string | null;
}

export interface PersonalData {
  fullName: string;
  email: string;
  phone: string;
}

export interface Package {
  id: string;
  name: string;
  duration: number;
  price: number;
  price1Year?: number;
  price2Year?: number;
  price3Year?: number;
  isPopular?: boolean;
  discountBadge?: string;
  features?: string;
  freeDomains?: { id: string; extension: string }[];
  freeTemplate?: boolean;
  freeTemplates?: { id: string; name: string }[];
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
}

export interface PromoCode {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
}

export interface OrderState {
  currentStep: number;
  domainSearch: string;
  selectedDomain: Domain | null;
  selectedTemplate: Template | null;
  personalData: PersonalData;
  selectedPackage: Package | null;
  selectedAddOns: AddOn[];
  promoCode: PromoCode | null;
  invoiceId: string;
  _hasHydrated: boolean;
  orderInitiated: boolean;
  setHasHydrated: (state: boolean) => void;
  setOrderInitiated: (val: boolean) => void;
  setCurrentStep: (step: number) => void;
  setDomainSearch: (search: string) => void;
  setSelectedDomain: (domain: Domain | null) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setPersonalData: (data: PersonalData) => void;
  setSelectedPackage: (pkg: Package | null) => void;
  toggleAddOn: (addon: AddOn) => void;
  setPromoCode: (promo: PromoCode | null) => void;
  setInvoiceId: (id: string) => void;
  getTotalPrice: () => number;
  reset: () => void;
}
