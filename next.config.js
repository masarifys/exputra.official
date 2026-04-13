/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression for faster response
  compress: true,
  
  // Optimized image handling
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'exputra.id',
      },
      // ✅ TAMBAHKAN INI
      {
        protocol: 'https',
        hostname: 'static.wikitide.net',
      },
    ],
  },
  
  // Experimental optimizations
  experimental: {
    // Optimize specific package imports for smaller bundles
    optimizePackageImports: ['lucide-react', '@headlessui/react', 'date-fns'],
  },
  
  // Allow cross-origin requests from local network devices
  allowedDevOrigins: ['192.168.1.4', '10.5.0.2'],
}

export default nextConfig
