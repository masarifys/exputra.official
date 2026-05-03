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
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = settings.socialWhatsapp || '085186846500';
    const num = phone.replace(/\D/g, '').replace(/^0/, '62');
    const text = `Halo, saya tertarik dengan layanan eXputra Digital.
    
Nama: ${contactForm.name}
Email: ${contactForm.email}
Pesan: ${contactForm.message}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank');
    setIsContactModalOpen(false);
    setContactForm({ name: '', email: '', message: '' });
  };

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
    { icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4ca.svg', title: 'Perencanaan Bisnis', desc: 'Perencanaan bisnis yang matang untuk pertumbuhan optimal' },
    { icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f680.svg', title: 'Pengembangan Proses', desc: 'Pengembangan proses bisnis yang efisien dan terukur' },
    { icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4c8.svg', title: 'Strategi & Perencanaan', desc: 'Strategi dan perencanaan untuk mencapai target bisnis' },
    { icon: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3af.svg', title: 'Tujuan Bisnis', desc: 'Penetapan dan pencapaian tujuan bisnis yang terukur' },
  ];

  const stats = [
    { value: '150+', label: 'Proyek Selesai' },
    { value: '50+', label: 'Klien Aktif' },
    { value: '10+', label: 'Tim Ahli' },
    { value: '99%', label: 'Klien Puas' },
  ];

  const reviews = [
    { name: 'Budi Santoso', role: 'Pemilik Sedot WC Farisa', text: 'Semenjak dibuatkan website, panggilan jasa sedot WC kami jadi makin banyak. Pelayanannya ramah, responsif, dan harganya juga terjangkau. Terima kasih banyak!' },
    { name: 'Rina Melati', role: 'Manajer Operasional PT Borneo Woven Craft', text: 'Hasil websitenya sangat memuaskan dan desainnya benar-benar menonjolkan nilai kerajinan lokal kami. Proses pengerjaannya juga cepat dan tim sangat komunikatif.' },
    { name: 'Siti Aminah', role: 'Pengelola Laundry Express Queen', text: 'Sangat terbantu dengan sistem pemesanan online yang dibuatkan. Pelanggan laundry kami jadi lebih mudah order dan omzet juga ikut naik. Rekomendasi banget!' },
  ];

  const projects = [
    { title: 'Business Growth', image: '/images/project1.jpg' },
    { title: 'Startup Solution', image: '/images/project2.jpg' },
    { title: 'Marketing Growth', image: '/images/project3.jpg' },
  ];

  const socialMediaTemplates = [
    { id: 'sm1', name: 'Desain Sumur Bor', category: 'Social Media', price: 50000, thumbnail: 'https://wiki.exputra.id/images/b/ba/Sosial_Media_Sumur_Bor.png', isPaid: true },
    { id: 'sm2', name: 'Koperasi Merah Putih', category: 'Social Media', price: 50000, thumbnail: 'https://wiki.exputra.id/images/b/b9/Sosial_Media_Koperasi_Merah_putih.png', isPaid: true },
    { id: 'sm3', name: 'Promo Daging Segar', category: 'Social Media', price: 50000, thumbnail: 'https://wiki.exputra.id/images/6/6c/Sosial_Media_Daging.png', isPaid: true },
    { id: 'sm4', name: 'Spesial Kebab', category: 'Social Media', price: 50000, thumbnail: 'https://wiki.exputra.id/images/8/8d/Sosial_Media_kebab.png', isPaid: true },
    { id: 'sm5', name: 'Burger Lezat', category: 'Social Media', price: 50000, thumbnail: 'https://wiki.exputra.id/images/2/26/Sosial_Media_Burger.png', isPaid: true },
    { id: 'sm6', name: 'Ayam Geprek Spesial', category: 'Social Media', price: 50000, thumbnail: 'https://wiki.exputra.id/images/b/bf/Sosial_Media_ayamgeprek.png', isPaid: true },
    { id: 'sm7', name: 'Koper Travel', category: 'Social Media', price: 50000, thumbnail: 'https://wiki.exputra.id/images/2/27/Sosial_Media_koper.png', isPaid: true },
    { id: 'sm8', name: 'Seblak Pedas Nampol', category: 'Social Media', price: 50000, thumbnail: 'https://wiki.exputra.id/images/f/f0/Sosial_Media_seblak.png', isPaid: true },
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
      <section className="relative text-white overflow-hidden bg-slate-900">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/hero-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-80 mix-blend-overlay"
            sizes="100vw"
          />
        </div>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-900/30"></div>
        
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
                <button onClick={() => setIsContactModalOpen(true)} className="bg-orange-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-semibold hover:bg-orange-600 transition text-center inline-flex items-center justify-center gap-2 text-sm md:text-base">
                  Konsultasi Gratis
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
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
      {/* About Section */}
      <section id="about" className="py-12 md:py-20 relative overflow-hidden bg-slate-50/50">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.25] mix-blend-multiply">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://plus.unsplash.com/premium_photo-1768304683916-38b1e35939ce?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Batik Background" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <div className="relative rounded-2xl overflow-hidden aspect-video md:aspect-[4/3] shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Tim Profesional Kami" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-slate-900/10 hover:bg-transparent transition-colors duration-500"></div>
              </div>
              <div className="absolute -bottom-4 -right-4 md:-bottom-6 md:-right-6 bg-orange-500 text-white px-5 py-3 md:px-8 md:py-6 rounded-2xl shadow-xl z-10 border-4 border-white">
                <p className="text-2xl md:text-4xl font-bold mb-1">10+</p>
                <p className="text-xs md:text-sm font-medium">Tahun<br className="hidden md:block" /> Pengalaman</p>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={service.icon} alt={service.title} className="w-6 h-6 md:w-8 md:h-8 group-hover:scale-110 group-hover:brightness-0 group-hover:invert transition-all" loading="lazy" />
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
            <button onClick={() => setIsContactModalOpen(true)} className="bg-orange-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-600 transition whitespace-nowrap">
              Mulai Kerjasama
            </button>
          </div>
        </div>
      </section>

      {/* Projects/Templates Section */}
      <section id="template" className="py-12 md:py-20 relative overflow-hidden bg-slate-50/50">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.25] mix-blend-multiply">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://plus.unsplash.com/premium_photo-1768304683916-38b1e35939ce?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Batik Background" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
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

      {/* Social Media Templates Section */}
      <section id="template-socmed" className="py-12 md:py-20 relative overflow-hidden bg-white">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.25] mix-blend-multiply">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://plus.unsplash.com/premium_photo-1768304683916-38b1e35939ce?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Batik Background" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-orange-500 font-medium mb-2 text-sm md:text-base">Proyek Kami yang Telah Selesai</p>
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 px-2">Pilih Template sosial media yang Anda Sukai</h2>
          </div>
          
          <div className="relative flex overflow-hidden py-4 -mx-4 px-4 sm:mx-0 sm:px-0 group">
            <div className="flex shrink-0 space-x-4 md:space-x-6 pr-4 md:pr-6 animate-marquee flex-row group-hover:[animation-play-state:paused]">
              {socialMediaTemplates.map((template) => (
                <div key={template.id} className="group/item relative overflow-hidden rounded-xl w-80 md:w-[28rem] shrink-0 shadow-sm border border-slate-100">
                  <div className="relative w-full aspect-[16/9] bg-white">
                    <Image
                      src={template.thumbnail}
                      alt={template.name}
                      fill
                      unoptimized={true}
                      className="object-contain p-2 group-hover/item:scale-105 transition-transform duration-500"
                    />
                    {template.isPaid && (
                      <span className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
                        Premium
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent md:opacity-0 md:group-hover/item:opacity-100 opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 md:translate-y-full md:group-hover/item:translate-y-0 transition-transform duration-300">
                      <h3 className="font-bold text-white text-lg">{template.name}</h3>
                      <p className="text-slate-300 text-sm">{template.category}</p>
                      <p className="text-orange-400 font-semibold mt-2">
                        {template.price === 0 ? 'Gratis' : `Rp ${template.price.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex shrink-0 space-x-4 md:space-x-6 pr-4 md:pr-6 animate-marquee flex-row group-hover:[animation-play-state:paused]" aria-hidden="true">
              {socialMediaTemplates.map((template) => (
                <div key={`dup-${template.id}`} className="group/item relative overflow-hidden rounded-xl w-80 md:w-[28rem] shrink-0 shadow-sm border border-slate-100">
                  <div className="relative w-full aspect-[16/9] bg-white">
                    <Image
                      src={template.thumbnail}
                      alt={template.name}
                      fill
                      unoptimized={true}
                      className="object-contain p-2 group-hover/item:scale-105 transition-transform duration-500"
                    />
                    {template.isPaid && (
                      <span className="absolute top-4 left-4 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full z-10">
                        Premium
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent md:opacity-0 md:group-hover/item:opacity-100 opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 md:translate-y-full md:group-hover/item:translate-y-0 transition-transform duration-300">
                      <h3 className="font-bold text-white text-lg">{template.name}</h3>
                      <p className="text-slate-300 text-sm">{template.category}</p>
                      <p className="text-orange-400 font-semibold mt-2">
                        {template.price === 0 ? 'Gratis' : `Rp ${template.price.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/services" className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-600 transition">
              Pesan Template Ini
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
                  className="flex items-start gap-4 hover:opacity-80 transition group"
                >
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Telepon / WhatsApp</p>
                    <p className="font-semibold text-orange-500 text-lg">{settings.socialWhatsapp || '0851-8684-6500'}</p>
                  </div>
                </a>
                <div className="flex items-start gap-4 group">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Surel</p>
                    <p className="font-semibold text-slate-900 text-lg">{settings.contactEmail || 'cs@exputra.id'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 group">
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
              
              <button onClick={() => setIsContactModalOpen(true)} className="mt-8 w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2">
                Hubungi Kami
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-slate-900 text-white pt-10 md:pt-16 pb-6 md:pb-8 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://plus.unsplash.com/premium_photo-1768304683916-38b1e35939ce?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Batik Background" 
            className="w-full h-full object-cover mix-blend-overlay"
            loading="lazy"
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pb-8 md:pb-12 border-b border-slate-800">
            <div className="col-span-2 md:col-span-1">
              <Link href="/">
                <Image 
                  src="/logo.png" 
                  alt={settings.siteName} 
                  width={160} 
                  height={40} 
                  className="h-8 md:h-10 w-auto mb-4 bg-white/10 rounded px-2 py-1" 
                />
              </Link>
              <p className="text-slate-400 text-xs md:text-sm mb-4 md:mb-6">{settings.siteDescription}</p>
              <div className="flex gap-2 md:gap-3">
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition text-sm md:text-base text-slate-300 hover:text-white">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition text-sm md:text-base text-slate-300 hover:text-white">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"/></svg>
                </a>
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-orange-500 transition text-sm md:text-base text-slate-300 hover:text-white">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
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
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'GoPay', src: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg', className: 'h-3' },
                  { name: 'BCA', src: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg', className: 'h-3' },
                  { name: 'VISA', isText: true, content: <span className="text-blue-900 font-bold italic text-xl tracking-tighter" style={{ fontFamily: 'Arial, sans-serif' }}>VISA</span> },
                  { name: 'ShopeePay', src: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg', className: 'h-3' },
                  { name: 'BNI', src: '/payment-icons/bni.png', className: 'h-2.5' },
                  { name: 'Indomaret', src: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Logo_Indomaret.png', className: 'h-3' },
                  { name: 'Mastercard', src: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg', className: 'h-4' },
                  { name: 'Alfamart', isText: true, content: <span className="text-red-600 font-extrabold text-xs tracking-tight uppercase" style={{ fontFamily: 'Arial, sans-serif' }}>Alfamart</span> },
                  { name: 'BSI', isText: true, content: <div className="flex items-start"><span className="text-teal-600 font-extrabold text-lg tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>BSI</span><span className="text-yellow-500 text-xs mt-0.5 ml-0.5">★</span></div> }
                ].map((method, index) => (
                  <div key={index} className="bg-white w-[60px] h-9 md:w-[68px] md:h-10 rounded-md flex items-center justify-center p-1.5 shadow-sm hover:scale-105 transition-transform overflow-hidden">
                    {method.isText ? (
                      method.content
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={method.src} alt={method.name} className={`object-contain ${method.className} max-w-full`} loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 md:mt-8">
                <div className="inline-flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 hover:bg-slate-800 transition">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs text-slate-400 font-medium leading-tight mb-0.5">Terdaftar secara resmi di</p>
                    <p className="text-sm md:text-base font-bold text-white leading-tight">PSE Kominfo</p>
                  </div>
                </div>
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

      {/* Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">Kirim Pesan ke Kami</h3>
              <button onClick={() => setIsContactModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input required type="text" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition" placeholder="Masukkan nama Anda" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Email</label>
                <input required type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition" placeholder="email@contoh.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pesan</label>
                <textarea required rows={4} value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition resize-none" placeholder="Tulis pesan atau pertanyaan Anda di sini..."></textarea>
              </div>
              <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 mt-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Kirim ke WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}


