'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutGrid,
  ShoppingCart,
  Users,
  BarChart3,
  Globe,
  Type,
  Palette,
  Package,
  Wrench,
  Gift,
  Building2,
  Server,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  CreditCard,
  Zap,
  Megaphone,
  FileText,
} from 'lucide-react';

const menuSections = [
  {
    title: 'HOME',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/admin/progress-pesanan', label: 'Progress Pesanan', icon: Zap },
      { href: '/admin/payment-logs', label: 'Payment Logs', icon: CreditCard },
      { href: '/admin/clients', label: 'Clients', icon: Users },
      { href: '/admin/monitoring', label: 'Monitoring', icon: BarChart3 },
    ]
  },
  {
    title: 'MANAGEMENT',
    items: [
      { href: '/admin/client-domains', label: 'Domain Register', icon: Globe },
      { href: '/admin/domains', label: 'Extensions', icon: Type },
      { href: '/admin/templates', label: 'Templates', icon: Palette },
      { href: '/admin/packages', label: 'Packages', icon: Package },
      { href: '/admin/affiliate', label: 'Affiliate', icon: Megaphone },
      { href: '/admin/services', label: 'Services', icon: Wrench },
      { href: '/admin/service-orders', label: 'Service Orders', icon: ShoppingCart },
      { href: '/admin/promos', label: 'Promos', icon: Gift },
      { href: '/admin/invoices', label: 'Invoices', icon: FileText },
    ]
  },
  {
    title: 'SETTINGS',
    items: [
      { href: '/admin/domain-registrars', label: 'Registrars', icon: Building2 },
      { href: '/admin/client-servers', label: 'Servers', icon: Server },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ]
  }
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  // Don't show sidebar on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full bg-white border-r border-gray-100 transform transition-all duration-300 ease-in-out flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="text-white" size={24} />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">Modern</h1>
                <p className="text-xs text-gray-400">Admin Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-6">
              {!sidebarCollapsed && (
                <h3 className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{section.title}</h3>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={sidebarCollapsed ? item.label : ''}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="flex-shrink-0 w-5 h-5">
                          <IconComponent size={20} />
                        </span>
                        {!sidebarCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors font-medium text-sm"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm text-gray-600 hover:text-blue-600 font-medium">
                ← View Website
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
