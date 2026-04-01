import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrderState, PersonalData, Domain, Template, Package, AddOn, PromoCode } from '@/types';

const initialPersonalData: PersonalData = {
  fullName: '',
  email: '',
  phone: '',
};

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      domainSearch: '',
      selectedDomain: null,
      selectedTemplate: null,
      personalData: initialPersonalData,
      selectedPackage: null,
      selectedAddOns: [],
      promoCode: null,
      invoiceId: '',
      _hasHydrated: false,
      orderInitiated: false,

      setCurrentStep: (step: number) => set({ currentStep: step }),
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
      setOrderInitiated: (val: boolean) => set({ orderInitiated: val }),

      setDomainSearch: (search: string) => set({ domainSearch: search }),

      setSelectedDomain: (domain: Domain | null) => set({ selectedDomain: domain }),

      setSelectedTemplate: (template: Template | null) => set({ selectedTemplate: template }),

      setPersonalData: (data: PersonalData) => set({ personalData: data }),

      setSelectedPackage: (pkg: Package | null) => set({ selectedPackage: pkg }),

      toggleAddOn: (addon: AddOn) => {
        const { selectedAddOns } = get();
        const exists = selectedAddOns.find(a => a.id === addon.id);

        if (exists) {
          set({ selectedAddOns: selectedAddOns.filter(a => a.id !== addon.id) });
        } else {
          set({ selectedAddOns: [...selectedAddOns, addon] });
        }
      },

      setPromoCode: (promo: PromoCode | null) => set({ promoCode: promo }),

      setInvoiceId: (id: string) => set({ invoiceId: id }),

      getTotalPrice: () => {
        const { selectedDomain, selectedTemplate, selectedPackage, selectedAddOns, promoCode } = get();

        let total = 0;

        if (selectedDomain) {
          // Check if domain extension matches any free domain in the selected package
          const isFreeDomain = selectedPackage?.freeDomains?.some(
            (fd) => selectedDomain.extension === fd.extension || selectedDomain.extension.endsWith(fd.extension)
          );

          if (!isFreeDomain) {
            total += selectedDomain.price;
          }
        }

        if (selectedTemplate && selectedTemplate.price) {
          total += selectedTemplate.price;
        }

        if (selectedPackage) {
          total += selectedPackage.price;
        }

        selectedAddOns.forEach(addon => {
          total += addon.price;
        });

        if (promoCode) {
          if (promoCode.type === 'percentage') {
            total = total - (total * promoCode.discount / 100);
          } else {
            total = total - promoCode.discount;
          }
        }

        return Math.max(0, total);
      },

      reset: () => set({
        currentStep: 1,
        domainSearch: '',
        selectedDomain: null,
        selectedTemplate: null,
        personalData: initialPersonalData,
        selectedPackage: null,
        selectedAddOns: [],
        promoCode: null,
        invoiceId: '',
        orderInitiated: false,
      }),
    }),
    {
      name: 'order-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
