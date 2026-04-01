'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, Fragment } from 'react';
import { LayoutDashboard, Package, Globe, Server, FileText, User, LogOut, Menu, X, Home, Wrench, Megaphone, MessageCircle } from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';

const menuItems = [
    { href: '/client/dashboard', label: 'Dashboard', iconName: 'dashboard' },
    { href: '/client/dashboard/packages', label: 'My Package', iconName: 'package' },
    { href: '/client/dashboard/domains', label: 'My Domains', iconName: 'globe' },
    { href: '/client/dashboard/servers', label: 'My Servers', iconName: 'server' },
    { href: '/client/dashboard/services', label: 'My Services', iconName: 'wrench' },
    { href: '/client/dashboard/affiliate', label: 'Affiliate', iconName: 'affiliate' },
    { href: '/client/dashboard/invoices', label: 'My Invoices', iconName: 'filetext' },
];

const IconComponent = ({ name, className }: { name: string; className: string }) => {
    switch (name) {
        case 'dashboard':
            return <LayoutDashboard className={className} />;
        case 'package':
            return <Package className={className} />;
        case 'globe':
            return <Globe className={className} />;
        case 'server':
            return <Server className={className} />;
        case 'wrench':
            return <Wrench className={className} />;
        case 'affiliate':
            return <Megaphone className={className} />;
        case 'filetext':
            return <FileText className={className} />;
        case 'user':
            return <User className={className} />;
        default:
            return null;
    }
};

function UserAccountMenu({ clientName, adminWhatsapp, onLogout }: { clientName: string; adminWhatsapp: string; onLogout: () => void }) {
    const initials = clientName ? clientName[0].toUpperCase() : 'C';

    // Format WhatsApp value for wa.me link
    let waPhone = adminWhatsapp || '';
    if (waPhone) {
        waPhone = waPhone.replace(/[^0-9]/g, '');
        if (waPhone.startsWith('0')) {
            waPhone = '62' + waPhone.slice(1);
        } else if (!waPhone.startsWith('62')) {
            waPhone = '62' + waPhone;
        }
    }

    const whatsappUrl = waPhone ? `https://wa.me/${waPhone}` : '#';

    return (
        <HeadlessMenu as="div" className="relative">
            <HeadlessMenu.Button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm border-2 border-white">
                    {initials}
                </div>
            </HeadlessMenu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <HeadlessMenu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[100]">
                    {/* The "notch" arrow */}
                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white rotate-45 border-t border-l border-gray-100"></div>
                    
                    <div className="py-2">
                        <div className="px-4 py-3 border-b border-gray-100 mb-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{clientName || 'Client'}</p>
                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mt-px flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Active Account
                            </p>
                        </div>

                        <HeadlessMenu.Item>
                            {({ active }) => (
                                <Link
                                    href="/client/dashboard/profile"
                                    className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} flex items-center gap-3 px-4 py-3 text-sm transition-colors font-medium`}
                                >
                                    <User className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                                    Profile & account
                                </Link>
                            )}
                        </HeadlessMenu.Item>

                        <HeadlessMenu.Item>
                            {({ active }) => (
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} flex items-center gap-3 px-4 py-3 text-sm transition-colors font-medium`}
                                >
                                    <MessageCircle className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                                    Hubungi Admin
                                </a>
                            )}
                        </HeadlessMenu.Item>

                        <div className="px-2 pt-2 border-t border-gray-100 mt-1">
                            <HeadlessMenu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={onLogout}
                                        className={`${active ? 'bg-red-50 text-red-700' : 'text-gray-700'} flex w-full items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors font-bold`}
                                    >
                                        <LogOut className={`w-4 h-4 ${active ? 'text-red-600' : 'text-gray-400'}`} />
                                        Logout
                                    </button>
                                )}
                            </HeadlessMenu.Item>
                        </div>
                    </div>
                </HeadlessMenu.Items>
            </Transition>
        </HeadlessMenu>
    );
}

export default function ClientDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [clientName, setClientName] = useState('');
    const [adminWhatsapp, setAdminWhatsapp] = useState('');

    useEffect(() => {
        fetch('/api/client/profile')
            .then(res => res.json())
            .then(data => {
                if (data.name) setClientName(data.name);
                if (data.adminWhatsapp) setAdminWhatsapp(data.adminWhatsapp);
            })
            .catch(() => { });
    }, []);

    const handleLogout = async () => {
        await fetch('/api/client/logout', { method: 'POST' });
        router.push('/client/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex print:bg-white">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Desktop & Mobile */}
            <aside className={`fixed inset-y-0 left-0 bg-gradient-to-b from-blue-600 to-blue-700 w-64 transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:static lg:block shadow-xl print:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-full flex flex-col">
                    {/* Logo/Brand Section */}
                    <div className="p-6 border-b border-blue-500 border-opacity-20 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 bg-opacity-30 rounded-lg">
                                <Home className="w-5 h-5 text-white" />
                            </div>
                            <div className="overflow-hidden">
                                <h2 className="text-lg font-bold text-white truncate">Client Area</h2>
                                <p className="text-[10px] text-blue-100 uppercase tracking-widest font-bold opacity-75 truncate">Website Management</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-white bg-opacity-20 text-white shadow-lg'
                                        : 'text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white'
                                        }`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <IconComponent
                                        name={item.iconName}
                                        className={`w-5 h-5 shrink-0 transition-transform ${isActive ? 'text-white' : 'text-blue-200 group-hover:text-white'}`}
                                    />
                                    <span className={`font-semibold text-sm ${isActive ? 'opacity-100' : 'opacity-90'}`}>{item.label}</span>
                                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm shadow-white"></div>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Unified Header - Fixed */}
                <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shrink-0 print:hidden shadow-sm">
                    <div className="flex items-center gap-3 lg:hidden">
                         <button 
                            onClick={() => setSidebarOpen(true)} 
                            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                         >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="font-bold text-gray-900 text-sm">Dashboard</h2>
                    </div>

                    <div className="hidden lg:block">
                         {/* Optional breadcrumb or search bar could go here */}
                         &nbsp;
                    </div>

                    <div className="flex items-center gap-4">
                        <UserAccountMenu clientName={clientName} adminWhatsapp={adminWhatsapp} onLogout={handleLogout} />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar print:p-0 print:overflow-visible bg-gray-50/50">
                    <div className="max-w-6xl mx-auto pb-12">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
