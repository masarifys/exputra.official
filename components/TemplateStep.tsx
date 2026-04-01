'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useOrderStore } from '@/store/useOrderStore';
import { Template } from '@/types';

let _isLoggedInCache: boolean | null = null;

interface TemplateFromDB {
  id: string;
  name: string;
  thumbnail: string | null;
  previewUrl: string | null;
  category: string;
  price: number;
  isPaid: boolean;
  description: string | null;
  isActive: boolean;
}

// Memoized Template Card
const TemplateCard = memo(function TemplateCard({ 
  template, 
  isSelected, 
  onSelect 
}: { 
  template: TemplateFromDB; 
  isSelected: boolean; 
  onSelect: (template: TemplateFromDB) => void;
}) {
  return (
    <div
      onClick={() => onSelect(template)}
      className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'border-cyan-500 shadow-lg'
          : 'border-gray-200 hover:border-cyan-300'
      }`}
    >
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
        {template.thumbnail ? (
          <img 
            src={template.thumbnail} 
            alt={template.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-gray-400">No Preview</span>
        )}
        {template.isPaid && (
          <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
            Premium
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{template.name}</h3>
        <p className="text-sm text-gray-500">{template.category}</p>
        {template.price > 0 && (
          <p className="text-sm font-medium text-cyan-600 mt-1">
            Rp {template.price.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
});

export default function TemplateStep() {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [templates, setTemplates] = useState<TemplateFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 6;

  const selectedTemplate = useOrderStore((state) => state.selectedTemplate);
  const setSelectedTemplate = useOrderStore((state) => state.setSelectedTemplate);
  const setCurrentStep = useOrderStore((state) => state.setCurrentStep);
  const setPersonalData = useOrderStore((state) => state.setPersonalData);
  const [isLoggedIn, setIsLoggedIn] = useState(_isLoggedInCache ?? false);

  useEffect(() => {
    if (_isLoggedInCache !== null) {
      setIsLoggedIn(_isLoggedInCache);
      return;
    }
    fetch('/api/client/profile')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('not logged in');
      })
      .then((data) => {
        if (data.name && data.email && data.phone) {
          _isLoggedInCache = true;
          setIsLoggedIn(true);
          setPersonalData({ fullName: data.name, email: data.email, phone: data.phone });
        }
      })
      .catch(() => { _isLoggedInCache = false; });
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/public/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const categories = useMemo(() => {
    const cats = ['Semua', ...new Set(templates.map((t) => t.category))];
    return cats;
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template: TemplateFromDB) => {
      const matchesCategory = selectedCategory === 'Semua' || template.category === selectedCategory;
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTemplates = useMemo(() => 
    filteredTemplates.slice(startIndex, startIndex + itemsPerPage),
    [filteredTemplates, startIndex, itemsPerPage]
  );

  const handleTemplateSelect = useCallback((template: TemplateFromDB) => {
    setSelectedTemplate({
      id: template.id,
      name: template.name,
      category: template.category,
      thumbnail: template.thumbnail,
      price: template.price,
      isPaid: template.isPaid,
      description: template.description,
    });
  }, [setSelectedTemplate]);

  const handleNext = () => {
    if (selectedTemplate) {
      setCurrentStep(isLoggedIn ? 4 : 3);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">2. Pilih Template</h2>

      <div className="mb-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                setCurrentPage(1);
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap transition-colors text-sm sm:text-base ${
                selectedCategory === category
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Cari template..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-base"
        />
      </div>

      {selectedTemplate && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Template yang dipilih:</strong> {selectedTemplate.name}
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border-2 rounded-lg overflow-hidden border-gray-200">
              <div className="aspect-video bg-gray-200"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {paginatedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplate?.id === template.id}
              onSelect={handleTemplateSelect}
            />
          ))}
        </div>
      )}

      {paginatedTemplates.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          Tidak ada template ditemukan.
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded ${
                currentPage === page
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={handlePrevious}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Sebelumnya
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedTemplate}
          className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
}
