# exputra.official

Website Pesan Jasa - Aplikasi Pemesanan & Manajemen Website

Aplikasi web modern untuk pemesanan jasa pembuatan website dengan dashboard admin dan fitur tracking pesanan.

## 🚀 Teknologi

- **Next.js 15** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Prisma ORM**
- **MySQL Database**
- **Zustand** (State Management)

## ✨ Fitur Utama

### Untuk Customer
- **Multi-Step Order Wizard** - Pilih domain, template, paket, dan data diri
- **Dashboard Pesanan** - Lihat status pesanan dan akses website
- **Tracking Progress** - Monitor progress pembuatan website secara real-time
- **Notifikasi Email** - Terima update otomatis untuk setiap status

### Untuk Admin
- **Admin Dashboard** - Kelola pesanan dan customers
- **Progress Tracker** - Monitor status pesanan dengan catatan progress
- **Akses Website Management** - Kelola login credentials website customer
- **Order Management** - Edit, update, dan kategorisasi pesanan

## 📁 Struktur Folder

```
/app
  /admin               # Admin pages
    /orders            # Kelola pesanan
    /progress-pesanan  # Tracking progress pesanan
    /clients           # Kelola customers
  /client              # Customer pages
    /dashboard         # Customer dashboard
  /api                 # API routes
    /admin/*           # Admin API endpoints
    /client/*          # Customer API endpoints
    /public/*          # Public endpoints

/components           # React components
  /admin              # Admin-specific components
  *.tsx               # Shared components

/lib
  auth.ts             # Authentication logic
  email.ts            # Email service
  prisma.ts           # Database client
  utils.ts            # Utility functions

/prisma
  schema.prisma       # Database schema
  /migrations         # Database migrations
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm atau yarn

### Instalasi

```bash
# Clone repository
git clone <repo-url>
cd websitepesanjasa

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env dengan konfigurasi Anda

# Setup database
npx prisma migrate dev

# Run development server
npm run dev

# Build untuk production
npm run build
npm start
```

## 🔧 Konfigurasi

Edit file `.env` dengan:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/websitepesanjasa"

# JWT
JWT_SECRET="your-secret-key"

# Email (Gmail)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"

# Payment Gateway (Duitku)
DUITKU_MERCHANT_CODE="your-merchant-code"
DUITKU_API_KEY="your-api-key"

# Domain Availability (WhoisFreaks)
WHOISFREAKS_API_KEY="your-api-key"
```

## 📊 Database Schema

Entitas utama:
- **User** - Admin users
- **Customer** - Customer/Pelanggan
- **Order** - Pesanan website
- **Domain** - Daftar domain
- **Template** - Template website
- **Package** - Paket berlangganan
- **Promo** - Kode promo

## 🔐 Authentication

- **Admin**: JWT-based authentication
- **Customer**: Email-based session
- Password hashing dengan bcrypt

## 📧 Email Integration

- Gmail SMTP untuk notifikasi
- Automatic email pada status changes
- Custom email templates

## 💳 Payment Integration

- Duitku Payment Gateway
- Multiple payment methods
- Automatic invoice generation

## 📱 Responsive Design

- Mobile-first approach
- Tailwind CSS
- Works on all devices

## 📝 Lisensi

MIT License

## 👤 Support

Untuk bantuan atau pertanyaan, hubungi admin via dashboard.
