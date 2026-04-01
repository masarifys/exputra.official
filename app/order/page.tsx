'use client';

import { Suspense, lazy, useMemo, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOrderStore } from '@/store/useOrderStore';
import Stepper from '@/components/Stepper';

// Lazy load step components for better initial load performance
const DomainStep = lazy(() => import('@/components/DomainStep'));
const TemplateStep = lazy(() => import('@/components/TemplateStep'));
const ProfileStep = lazy(() => import('@/components/ProfileStep'));
const PackageStep = lazy(() => import('@/components/PackageStep'));

// Loading skeleton for step components
function StepSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  );
}

function AffiliateQuerySync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const affiliateCode = searchParams.get('aff');
    const packageId = searchParams.get('pkg');

    if (affiliateCode) {
      localStorage.setItem('affiliate_code', affiliateCode);
      
      // Track click on server
      fetch('/api/affiliate/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: affiliateCode }),
      }).catch((err) => console.error('Failed to track affiliate click:', err));
    } else {
      localStorage.removeItem('affiliate_code');
    }

    if (packageId) {
      localStorage.setItem('affiliate_package_id', packageId);
    } else {
      localStorage.removeItem('affiliate_package_id');
    }
  }, [searchParams]);

  return null;
}

export default function OrderPage() {
  const currentStep = useOrderStore((state) => state.currentStep);
  const setCurrentStep = useOrderStore((state) => state.setCurrentStep);
  const setPersonalData = useOrderStore((state) => state.setPersonalData);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check login session on mount
  useEffect(() => {
    fetch('/api/client/profile')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('not logged in');
      })
      .then((data) => {
        if (data.name && data.email && data.phone) {
          setPersonalData({
            fullName: data.name,
            email: data.email,
            phone: data.phone,
          });
          setIsLoggedIn(true);
          // If currently on step 3, auto-skip to step 4
          if (currentStep === 3) {
            setCurrentStep(4);
          }
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, [currentStep, setCurrentStep, setPersonalData]);

  // Memoize step component to prevent unnecessary re-renders
  const StepComponent = useMemo(() => {
    // If user is logged in and hits step 3, redirect to step 4
    if (isLoggedIn && currentStep === 3) {
      return PackageStep;
    }

    switch (currentStep) {
      case 1:
        return DomainStep;
      case 2:
        return TemplateStep;
      case 3:
        return ProfileStep;
      case 4:
        return PackageStep;
      default:
        return DomainStep;
    }
  }, [currentStep, isLoggedIn]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense fallback={null}>
        <AffiliateQuerySync />
      </Suspense>
      <div className="flex flex-col lg:flex-row gap-8">
        <Stepper />
        <div className="flex-1">
          <Suspense fallback={<StepSkeleton />}>
            <StepComponent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
