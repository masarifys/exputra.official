'use client';

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

interface SiteSettings {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  socialWhatsapp?: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  price: number;
  thumbnail: string | null;
  isPaid: boolean;
}

function getSafeTemplateThumbnailSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const value = String(raw).trim();
  if (!value) return null;

  // Accept absolute URLs.
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return parsed.toString();
    } catch {
      return null;
    }
  }

  // Accept local/public paths and normalize backslashes.
  if (value.startsWith('/')) {
    return value.replace(/\\/g, '/');
  }

  // If DB stores relative paths like "uploads/file.jpg", normalize to "/uploads/file.jpg".
  if (/^[a-zA-Z0-9._\-/]+$/.test(value)) {
    return `/${value.replace(/^\/+/, '').replace(/\\/g, '/')}`;
  }

  return null;
}

export default function Home() {
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: 'eXputra Designs',
    siteTitle: 'Jasa Pembuatan Website Profesional',
    siteDescription: 'Layanan pembuatan website profesional untuk bisnis Anda',
    socialWhatsapp: '0851-8684-6500',
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchTemplates();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/public/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.siteName) {
          setSettings({
            siteName: data.siteName,
            siteTitle: data.siteTitle || data.siteName,
            siteDescription: data.siteDescription || 'Solusi inovatif untuk kesuksesan bisnis Anda',
            socialWhatsapp: data.socialWhatsapp,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/public/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.slice(0, 6));
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const services = [
    { icon: '📊', title: 'Perencanaan Bisnis', desc: 'Perencanaan bisnis yang matang untuk pertumbuhan optimal' },
    { icon: '🚀', title: 'Pengembangan Proses', desc: 'Pengembangan proses bisnis yang efisien dan terukur' },
    { icon: '📈', title: 'Strategi & Perencanaan', desc: 'Strategi dan perencanaan untuk mencapai target bisnis' },
    { icon: '🎯', title: 'Tujuan Bisnis', desc: 'Penetapan dan pencapaian tujuan bisnis yang terukur' },
  ];

  const stats = [
    { value: '150+', label: 'Proyek Selesai' },
    { value: '50+', label: 'Klien Aktif' },
    { value: '10+', label: 'Tim Ahli' },
    { value: '99%', label: 'Klien Puas' },
  ];

  const reviews = [
    { name: 'William Henry', role: 'Designer at Vertex Agency', text: 'Saya sangat merekomendasikan layanan ini. Hasilnya luar biasa dan sesuai dengan ekspektasi. Kombinasi yang sempurna antara kualitas dan profesionalisme.' },
    { name: 'Sarah Johnson', role: 'CEO TechStart', text: 'Tim yang sangat profesional dan responsif. Website kami sekarang terlihat modern dan berfungsi dengan baik di semua perangkat.' },
    { name: 'Michael Chen', role: 'Marketing Director', text: 'Proses pengerjaan cepat dan hasil memuaskan. Sangat recommended untuk kebutuhan website bisnis Anda.' },
  ];

  const projects = [
    { title: 'Business Growth', image: '/images/project1.jpg' },
    { title: 'Startup Solution', image: '/images/project2.jpg' },
    { title: 'Marketing Growth', image: '/images/project3.jpg' },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white text-sm py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span>📧</span> {settings.contactEmail || 'cs@exputra.id'}
            </span>
            <span className="flex items-center gap-2">
              <span>🕐</span> Jam Kerja: 08.00 - 17.00
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#faq" className="hover:text-orange-400 transition">FAQ</Link>
            <Link href="#kontak" className="hover:text-orange-400 transition">Kontak</Link>
          </div>
        </div>
      </div>

      {/* Header/Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt={settings.siteName} width={160} height={40} className="h-8 md:h-10 w-auto" />
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-slate-700 hover:text-orange-500 transition font-medium">Tentang</a>
            <a href="#layanan" className="text-slate-700 hover:text-orange-500 transition font-medium">Layanan</a>
            <a href="#template" className="text-slate-700 hover:text-orange-500 transition font-medium">Proyek</a>
            <a href="#review" className="text-slate-700 hover:text-orange-500 transition font-medium">Ulasan</a>
            <a href="#kontak" className="text-slate-700 hover:text-orange-500 transition font-medium">Kontak</a>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/order" className="hidden md:inline-block bg-orange-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-orange-600 transition">
              Pesan Sekarang
            </Link>
            <Link href="/client/login" className="bg-slate-900 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium hover:bg-slate-800 transition text-sm md:text-base">
              Login
            </Link>
            
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t px-4 py-4 space-y-3">
            <a href="#about" className="block text-slate-700 hover:text-orange-500">Tentang</a>
            <a href="#layanan" className="block text-slate-700 hover:text-orange-500">Layanan</a>
            <a href="#template" className="block text-slate-700 hover:text-orange-500">Proyek</a>
            <a href="#review" className="block text-slate-700 hover:text-orange-500">Ulasan</a>
            <a href="#kontak" className="block text-slate-700 hover:text-orange-500">Kontak</a>
            <Link href="/order" className="block bg-orange-500 text-white px-4 py-2 rounded-lg text-center font-semibold">
              Pesan Sekarang
            </Link>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative text-white overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 bg-slate-900">
          <Image
            src="/hero-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-40"
            sizes="100vw"
          />
        </div>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/70"></div>
        
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-32 relative">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <p className="text-orange-400 font-medium mb-4 flex items-center gap-2">
                <span className="w-8 h-0.5 bg-orange-400"></span>
                Selamat Datang! Mulai Kembangkan Bisnis Anda
              </p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
                Solusi Inovatif untuk <span className="text-orange-400">Kesuksesan</span> Anda
              </h1>
              <p className="text-base md:text-lg text-slate-300 mb-6 md:mb-8 max-w-lg">
                {settings.siteDescription}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Link href="/order" className="bg-orange-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-semibold hover:bg-orange-600 transition text-center inline-flex items-center justify-center gap-2 text-sm md:text-base">
                  Konsultasi Gratis
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link href="/client/login" className="border-2 border-white/30 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-semibold hover:bg-white/10 transition text-center text-sm md:text-base">
                  Cek Status Pesanan
                </Link>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="relative w-full h-96">
                <Image
                  src="/hero-image.png"
                  alt="Hero"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-8 md:py-12 -mt-6 md:-mt-8 relative z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-slate-100 rounded-2xl p-6 md:p-8 relative">
                <div className="text-6xl md:text-9xl text-center">🏢</div>
                <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 bg-orange-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-xl">
                  <p className="text-xl md:text-2xl font-bold">10+</p>
                  <p className="text-xs md:text-sm">Tahun Pengalaman</p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-orange-500 font-medium mb-2 flex items-center gap-2 text-sm md:text-base">
                <span className="w-6 md:w-8 h-0.5 bg-orange-500"></span>
                Memberdayakan Anda Setiap Hari
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4 md:mb-6">
                Kami Siap Membantu Mengembangkan Bisnis Anda
              </h2>
              <p className="text-slate-600 mb-6">
                Dengan pengalaman bertahun-tahun dalam pembuatan website profesional, kami memahami kebutuhan bisnis Anda dan siap memberikan solusi terbaik.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm mt-0.5">✓</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Dukungan 24/7</h4>
                    <p className="text-slate-500 text-sm">Layanan support yang selalu siap membantu Anda</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm mt-0.5">✓</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Konsultan Berpengalaman</h4>
                    <p className="text-slate-500 text-sm">Tim ahli yang berpengalaman di bidangnya</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm mt-0.5">✓</div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Tim Profesional</h4>
                    <p className="text-slate-500 text-sm">Anggota tim yang profesional dan berkompeten</p>
                  </div>
                </div>
              </div>
              <a 
                href={`https://wa.me/62${(settings.socialWhatsapp || '85186846500').replace(/\D/g, '').replace(/^0/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 hover:opacity-80 transition"
              >
                <div className="flex items-center gap-2 text-slate-900">
                  <span className="text-2xl">📞</span>
                  <div>
                    <p className="text-sm text-slate-500">Hubungi Kami / WhatsApp</p>
                    <p className="font-bold text-orange-500">{settings.socialWhatsapp || '0851-8684-6500'}</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="layanan" className="py-12 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-medium mb-2">Layanan Berkualitas Tinggi</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Layanan Kami</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {services.map((service, i) => (
              <div key={i} className="bg-white rounded-xl p-4 md:p-6 shadow-sm hover:shadow-lg transition group hover:-translate-y-1 duration-300">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-xl flex items-center justify-center text-2xl md:text-3xl mb-3 md:mb-4 group-hover:bg-orange-500 transition">
                  {service.icon}
                </div>
                <h3 className="text-base md:text-xl font-semibold text-slate-900 mb-1 md:mb-2">{service.title}</h3>
                <p className="text-slate-600 text-xs md:text-sm mb-3 md:mb-4 line-clamp-2 md:line-clamp-none">{service.desc}</p>
                <Link href="/order" className="text-orange-500 font-medium text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Selengkapnya
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Mari diskusikan bagaimana kami dapat membantu bisnis Anda
              </h3>
              <p className="text-slate-400">Hubungi kami sekarang untuk konsultasi gratis</p>
            </div>
            <Link href="/order" className="bg-orange-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-600 transition whitespace-nowrap">
              Mulai Kerjasama
            </Link>
          </div>
        </div>
      </section>

      {/* Projects/Templates Section */}
      <section id="template" className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-orange-500 font-medium mb-2 text-sm md:text-base">Proyek Kami yang Telah Selesai</p>
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 px-2">Pilih Template Website Yang Anda Sukai</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {templates.length > 0 ? templates.map((template) => {
              const thumbnailSrc = getSafeTemplateThumbnailSrc(template.thumbnail);

              return (
                <div key={template.id} className="group relative overflow-hidden rounded-xl">
                  <div className="relative h-48 md:h-64 bg-slate-200">
                    {thumbnailSrc ? (
                      <Image
                        src={thumbnailSrc}
                        alt={template.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                      <span className="text-6xl">🖼️</span>
                    </div>
                    )}
                    {template.isPaid && (
                      <span className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Premium
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="font-bold text-white text-lg">{template.name}</h3>
                      <p className="text-slate-300 text-sm">{template.category}</p>
                      <p className="text-orange-400 font-semibold mt-2">
                        {template.price === 0 ? 'Gratis' : `Rp ${template.price.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              [...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden animate-pulse">
                  <div className="h-64 bg-slate-200"></div>
                </div>
              ))
            )}
          </div>

          <div className="text-center mt-10">
            <Link href="/order" className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-600 transition">
              Lihat Semua Template
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="review" className="py-12 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-medium mb-2">Ulasan Klien Kami</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Apa Kata Mereka</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {reviews.map((review, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 md:p-8 shadow-sm hover:shadow-lg transition">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">"{review.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{review.name}</p>
                    <p className="text-sm text-slate-500">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="kontak" className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <div>
              <p className="text-orange-500 font-medium mb-2">Hubungi Kami</p>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Hubungi Kami</h2>
              <p className="text-slate-600 mb-8">
                Kami siap membantu Anda mewujudkan website impian. Hubungi kami sekarang untuk konsultasi gratis.
              </p>
              
              <div className="space-y-6">
                <a 
                  href={`https://wa.me/62${(settings.socialWhatsapp || '85186846500').replace(/\D/g, '').replace(/^0/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 hover:opacity-80 transition"
                >
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 text-2xl flex-shrink-0">
                    📞
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Telepon / WhatsApp</p>
                    <p className="font-semibold text-orange-500 text-lg">{settings.socialWhatsapp || '0851-8684-6500'}</p>
                  </div>
                </a>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 text-2xl flex-shrink-0">
                    📧
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Surel</p>
                    <p className="font-semibold text-slate-900 text-lg">{settings.contactEmail || 'cs@exputra.id'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 text-2xl flex-shrink-0">
                    �
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Alamat</p>
                    <p className="font-semibold text-slate-900 text-lg">Jl. Lubang Buaya No. 57, Jakarta Timur 13810, DKI Jakarta</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900 rounded-2xl p-8 text-white">
              <h3 className="text-xl font-bold mb-2">Jam Operasional</h3>
              <p className="text-slate-400 mb-6">Jam operasional layanan kami</p>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-700">
                  <span className="text-slate-300">Senin - Jumat</span>
                  <span className="font-semibold">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700">
                  <span className="text-slate-300">Sabtu</span>
                  <span className="font-semibold">09:00 - 15:00</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-slate-300">Minggu</span>
                  <span className="text-orange-400 font-semibold">Tutup</span>
                </div>
              </div>
              
              <Link href="/order" className="mt-8 w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2">
                Hubungi Kami
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-10 md:pt-16 pb-6 md:pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pb-8 md:pb-12 border-b border-slate-800">
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">{settings.siteName}</h3>
              <p className="text-slate-400 text-xs md:text-sm mb-4 md:mb-6">{settings.siteDescription}</p>
              <div className="flex gap-2 md:gap-3">
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition text-sm md:text-base">
                  <span>📘</span>
                </a>
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition text-sm md:text-base">
                  <span>📸</span>
                </a>
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition text-sm md:text-base">
                  <span>🐦</span>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Tautan Cepat</h4>
              <ul className="space-y-2 md:space-y-3 text-slate-400 text-xs md:text-sm">
                <li><a href="#about" className="hover:text-orange-400 transition">Tentang Kami</a></li>
                <li><a href="#layanan" className="hover:text-orange-400 transition">Layanan</a></li>
                <li><a href="#template" className="hover:text-orange-400 transition">Proyek</a></li>
                <li><a href="#kontak" className="hover:text-orange-400 transition">Kontak</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Layanan</h4>
              <ul className="space-y-2 md:space-y-3 text-slate-400 text-xs md:text-sm">
                <li>Website Company Profile</li>
                <li>Website Toko Online</li>
                <li>Website Portfolio</li>
                <li>Landing Page</li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Metode Pembayaran</h4>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <span className="bg-white text-slate-900 px-3 py-1.5 rounded text-xs font-semibold">BCA</span>
                <span className="bg-white text-slate-900 px-3 py-1.5 rounded text-xs font-semibold">Mandiri</span>
                <span className="bg-white text-slate-900 px-3 py-1.5 rounded text-xs font-semibold">BNI</span>
                <span className="bg-white text-slate-900 px-3 py-1.5 rounded text-xs font-semibold">BRI</span>
                <span className="bg-green-500 text-white px-3 py-1.5 rounded text-xs font-semibold">OVO</span>
                <span className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-semibold">DANA</span>
              </div>
            </div>
          </div>
          <div className="pt-8 text-center text-slate-400 text-sm">
            © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {settings.socialWhatsapp && (
        <a
          href={`https://wa.me/62${settings.socialWhatsapp.replace(/\D/g, '').replace(/^0/, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-green-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition z-50"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
    </main>
  )
}


