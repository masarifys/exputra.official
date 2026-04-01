'use client';

import { useEffect, useState } from 'react';
import { useOrderStore } from '@/store/useOrderStore';

const allSteps = [
  { id: 1, name: 'Pilih Domain', description: 'Pemilihan nama domain dapat menggunakan kata unik langsung yang berkaitan dengan bisnis kamu.' },
  { id: 2, name: 'Pilih Template', description: 'Pilih design website dengan mencoba dan brand identitas usaha kamu dengan design yang tersedia.' },
  { id: 3, name: 'Data Diri', description: 'Lengkapi data diri kamu, sehingga kami dapat menghubungi kamu.' },
  { id: 4, name: 'Paket & Pembayaran', description: 'Pilih paket pembelian yang sesuai dengan kebutuhan kamu.' },
];

export default function Stepper() {
  const currentStep = useOrderStore((state) => state.currentStep);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch('/api/client/profile')
      .then((res) => {
        if (res.ok) {
          setIsLoggedIn(true);
        }
      })
      .catch(() => {});
  }, []);

  const steps = isLoggedIn ? allSteps.filter((s) => s.id !== 3) : allSteps;

  return (
    <>
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-8">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {index !== steps.length - 1 && (
                <div className="absolute left-5 top-12 h-full w-0.5 bg-gray-200" />
              )}
              <div className="flex items-start mb-8">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold z-10 ${
                    currentStep === step.id
                      ? 'bg-cyan-500 text-white'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    isLoggedIn ? (step.id === 4 ? 3 : step.id) : step.id
                  )}
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-semibold ${currentStep === step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:hidden mb-8">
        <div className="flex items-start">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 flex flex-col items-center relative">
              <div className="flex items-center w-full">
                {index !== 0 && (
                  <div className={`flex-1 h-0.5 ${currentStep >= step.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
                <div
                  className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold z-10 ${
                    currentStep === step.id
                      ? 'bg-cyan-500 text-white'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    isLoggedIn ? (step.id === 4 ? 3 : step.id) : step.id
                  )}
                </div>
                {index !== steps.length - 1 && (
                  <div className={`flex-1 h-0.5 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
              <p className={`text-xs mt-2 text-center px-1 ${currentStep === step.id ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                {step.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
