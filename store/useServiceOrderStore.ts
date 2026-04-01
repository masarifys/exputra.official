import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ServicePriceType = 'ONE_TIME' | 'PER_YEAR' | 'MONTHLY';

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: ServicePriceType;
  packages?: ServicePackageOption[];
};

type ServicePackageOption = {
  id: string;
  code?: string;
  name: string;
  etaLabel?: string | null;
  description?: string | null;
  durationMonths?: number | null;
  price: number;
};

type ServicePersonalData = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
};

type ServiceOrderState = {
  currentStep: number;
  selectedService: ServiceItem | null;
  selectedPackage: ServicePackageOption | null;
  personalData: ServicePersonalData;
  invoiceId: string;
  setCurrentStep: (step: number) => void;
  setSelectedService: (service: ServiceItem | null) => void;
  setSelectedPackage: (pkg: ServicePackageOption | null) => void;
  setPersonalData: (data: ServicePersonalData) => void;
  setInvoiceId: (invoiceId: string) => void;
  getTotalPrice: () => number;
  reset: () => void;
};

const initialPersonalData: ServicePersonalData = {
  fullName: '',
  email: '',
  phone: '',
  company: '',
  notes: '',
};

export const useServiceOrderStore = create<ServiceOrderState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      selectedService: null,
      selectedPackage: null,
      personalData: initialPersonalData,
      invoiceId: '',

      setCurrentStep: (step) => set({ currentStep: step }),
      setSelectedService: (service) => set({ selectedService: service }),
      setSelectedPackage: (pkg) => set({ selectedPackage: pkg }),
      setPersonalData: (data) => set({ personalData: data }),
      setInvoiceId: (invoiceId) => set({ invoiceId }),

      getTotalPrice: () => {
        const { selectedPackage } = get();
        if (!selectedPackage) return 0;
        return Math.round(selectedPackage.price || 0);
      },

      reset: () => set({
        currentStep: 1,
        selectedService: null,
        selectedPackage: null,
        personalData: initialPersonalData,
        invoiceId: '',
      }),
    }),
    {
      name: 'service-order-storage',
    }
  )
);
