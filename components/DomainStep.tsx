'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOrderStore } from '@/store/useOrderStore';
import { Domain } from '@/types';

interface DomainFromDB {
  id: string;
  extension: string;
  price: number;
  isActive: boolean;
  label: string | null;
}

interface DomainAvailability extends Domain {
  isAvailable: boolean;
  isChecking?: boolean;
}

export default function DomainStep() {
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [availableDomains, setAvailableDomains] = useState<DomainAvailability[]>([]);
  const [domainExtensions, setDomainExtensions] = useState<DomainFromDB[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  
  const domainSearch = useOrderStore((state) => state.domainSearch);
  const setDomainSearch = useOrderStore((state) => state.setDomainSearch);
  const selectedDomain = useOrderStore((state) => state.selectedDomain);
  const setSelectedDomain = useOrderStore((state) => state.setSelectedDomain);
  const setCurrentStep = useOrderStore((state) => state.setCurrentStep);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch('/api/public/domains');
      if (res.ok) {
        const data = await res.json();
        setDomainExtensions(data);
      }
    } catch (error) {
      console.error('Failed to fetch domains:', error);
    } finally {
      setLoadingDomains(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const checkDomainAvailability = async (domain: string): Promise<boolean> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        `/api/public/domain-availability?domain=${encodeURIComponent(domain)}`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`Availability API error for ${domain}: ${response.status}, checking DNS...`);
        return checkDomainViaDNS(domain);
      }

      const data = await response.json();
      console.log(`Availability API check for ${domain}:`, data);

      if (typeof data?.isAvailable === 'boolean') {
        return data.isAvailable;
      }

      console.log(`${domain} - unexpected availability API response, checking DNS...`);
      return checkDomainViaDNS(domain);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Availability API timeout for ${domain}, checking DNS...`);
      } else {
        console.error(`Availability API error for ${domain}:`, error);
      }
      return checkDomainViaDNS(domain);
    }
  };

  const checkDomainViaDNS = async (domain: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(
        `https://dns.google/resolve?name=${domain}&type=A`,
        { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log(`DNS error for ${domain}: ${response.status}, assuming NOT AVAILABLE`);
        return false;
      }
      
      const data = await response.json();
      console.log(`DNS check for ${domain}:`, data);
      
      if (data.Answer && data.Answer.length > 0) {
        console.log(`${domain} - NOT AVAILABLE (has DNS records)`);
        return false;
      }
      
      if (data.Status === 3) {
        console.log(`${domain} - AVAILABLE (NXDOMAIN)`);
        return true;
      }
      
      if (data.Status === 0 && !data.Answer) {
        console.log(`${domain} - AVAILABLE (no DNS records)`);
        return true;
      }
      
      console.log(`${domain} - assuming NOT AVAILABLE (uncertain DNS status)`);
      return false;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`DNS lookup timeout for ${domain}, assuming NOT AVAILABLE`);
        return false;
      }
      console.error(`DNS error for ${domain}:`, error);
      return false;
    }
  };

  const handleSearch = async () => {
    if (!domainSearch.trim() || domainExtensions.length === 0) return;
    
    setIsSearching(true);
    setShowResults(false);
    
    const domainsToCheck: DomainAvailability[] = domainExtensions.map((ext: DomainFromDB) => ({
      id: ext.id,
      extension: ext.extension,
      price: ext.price,
      isPopular: ext.label === 'POPULAR',
      isBestPrice: ext.label === 'BEST_SELLER',
      isAvailable: false,
      isChecking: true,
    }));
    
    setAvailableDomains(domainsToCheck);
    setShowResults(true);
    
    const checkedDomains = await Promise.all(
      domainExtensions.map(async (ext: DomainFromDB) => {
        const fullDomain = `${domainSearch}${ext.extension}`;
        const isAvailable = await checkDomainAvailability(fullDomain);
        
        return {
          id: ext.id,
          extension: ext.extension,
          price: ext.price,
          isPopular: ext.label === 'POPULAR',
          isBestPrice: ext.label === 'BEST_SELLER',
          isAvailable,
          isChecking: false,
        };
      })
    );
    
    setAvailableDomains(checkedDomains);
    setIsSearching(false);
  };

  const handleDomainSelect = (domain: DomainAvailability) => {
    if (!domain.isAvailable) return;
    
    setSelectedDomain({
      id: domain.id,
      extension: domain.extension,
      price: domain.price,
      isPopular: domain.isPopular,
      isBestPrice: domain.isBestPrice,
    });
  };

  const handleNext = () => {
    if (selectedDomain) {
      setCurrentStep(2);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">1. Pilih Domain</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Gratis Akun Email Bisnis</strong><br />
          Kami akan mengirimkan akun email sesuai dengan domain yang dipilih. Kontak customer service kami apabila tertarik untuk penambahan akun email.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">📌 Cara Memilih Domain untuk Usaha:</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li><strong>1. Gunakan nama bisnis Anda</strong> - Pilih domain yang sesuai dengan nama usaha agar mudah diingat pelanggan.</li>
          <li><strong>2. Pilih ekstensi yang tepat</strong> - Anda bebas memilih ekstensi domain apa pun yang tersedia sesuai dengan keinginan dan kebutuhan bisnis Anda.</li>
          <li><strong>3. Buat singkat dan mudah dieja</strong> - Hindari angka dan tanda hubung agar tidak membingungkan.</li>
          <li><strong>4. Cek ketersediaan</strong> - Ketik nama domain yang diinginkan di kolom pencarian di bawah, lalu klik "Cari Domain".</li>
        </ul>
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={domainSearch}
            onChange={(e) => setDomainSearch(e.target.value)}
            placeholder="Cari Domain..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-base"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !domainSearch.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isSearching ? 'Mencari...' : 'Cari Domain'}
          </button>
        </div>
      </div>

      {showResults && (
        <div className="space-y-3 mb-6">
          {availableDomains.map((domain) => {
            const fullDomain = `${domainSearch}${domain.extension}`;
            const isSelected = selectedDomain?.extension === domain.extension;
            
            return (
              <div
                key={domain.extension}
                onClick={() => handleDomainSelect(domain)}
                className={`border-2 rounded-lg p-4 transition-all ${
                  domain.isChecking
                    ? 'border-gray-200 bg-gray-50 cursor-wait'
                    : !domain.isAvailable
                    ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-60'
                    : isSelected
                    ? 'border-cyan-500 bg-cyan-50 cursor-pointer'
                    : 'border-gray-200 hover:border-cyan-300 cursor-pointer'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
                        domain.isChecking
                          ? 'border-gray-300'
                          : !domain.isAvailable
                          ? 'border-red-300'
                          : isSelected
                          ? 'border-cyan-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {domain.isChecking ? (
                        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : !domain.isAvailable ? (
                        <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : isSelected ? (
                        <div className="w-3 h-3 bg-cyan-500 rounded-full" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-semibold text-sm sm:text-base break-all ${!domain.isAvailable && !domain.isChecking ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {fullDomain}
                        </span>
                        {domain.isChecking && (
                          <span className="px-2 py-0.5 bg-gray-400 text-white text-xs rounded-full whitespace-nowrap">
                            Mengecek...
                          </span>
                        )}
                        {!domain.isChecking && !domain.isAvailable && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full whitespace-nowrap">
                            Tidak Tersedia
                          </span>
                        )}
                        {!domain.isChecking && domain.isAvailable && domain.isPopular && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full whitespace-nowrap">
                            Populer
                          </span>
                        )}
                        {!domain.isChecking && domain.isAvailable && domain.isBestPrice && (
                          <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full whitespace-nowrap">
                            Best Price
                          </span>
                        )}
                      </div>
                      {!domain.isChecking && !domain.isAvailable && (
                        <p className="text-xs text-red-600 mt-1">
                          Domain sudah terdaftar
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right ml-8 sm:ml-0">
                    {domain.isAvailable && !domain.isChecking && (
                      <>
                        <p className="font-bold text-gray-900 text-sm sm:text-base">Rp {domain.price.toLocaleString('id-ID')}<span className="text-xs font-normal text-gray-500">/tahun</span></p>
                        <p className="text-xs text-gray-500 line-through">Rp {(domain.price + 50000).toLocaleString('id-ID')}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          disabled
          className="px-6 py-2 border border-gray-300 text-gray-400 rounded-lg cursor-not-allowed"
        >
          Sebelumnya
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedDomain}
          className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
}
