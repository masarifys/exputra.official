'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Building2, MapPin, Lock, Save, Eye, EyeOff, Calendar, Shield } from 'lucide-react';

export default function ClientProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [passSaving, setPassSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [profile, setProfile] = useState({
        id: '',
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        company: '',
        address: '',
        createdAt: '',
        updatedAt: '',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/client/profile');
            if (res.ok) {
                setProfile(await res.json());
            } else if (res.status === 401) {
                router.push('/client/login');
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/client/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
                fetchProfile();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || 'Gagal memperbarui profil' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'Konfirmasi password tidak cocok' });
            return;
        }

        setPassSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/client/profile/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(passwordForm),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Password berhasil diperbarui!' });
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.message || 'Gagal memperbarui password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
        } finally {
            setPassSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

    return (
        <div className="space-y-6">
            {/* Breadcrumbs */}
            <nav className="flex text-sm text-gray-500 mb-4">
                <ol className="list-none p-0 inline-flex">
                    <li className="flex items-center">
                        <a href="/client/dashboard" className="hover:text-blue-600 uppercase font-bold text-xs tracking-wider">Dashboard</a>
                        <span className="mx-2">/</span>
                    </li>
                    <li className="text-gray-900 font-bold text-xs uppercase tracking-wider">Edit Profile</li>
                </ol>
            </nav>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        Edit Profile
                    </h1>
                    <p className="text-gray-500 mt-2">Update your personal information and account settings</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Sidebar Cards */}
                <div className="space-y-6">
                    {/* Avatar Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-center p-8">
                        <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-blue-100 mb-4 border-4 border-blue-50">
                            {profile.name[0]?.toUpperCase()}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{profile.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{profile.email}</p>
                        <div className="flex justify-center gap-2">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-wider">Client</span>
                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                Active
                            </span>
                        </div>
                    </div>

                    {/* Account Info Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h4 className="text-sm font-bold text-gray-900 mb-6 pb-3 border-b border-gray-50 uppercase tracking-widest flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            Account Information
                        </h4>
                        <div className="space-y-5">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Member Since
                                </p>
                                <p className="text-sm font-bold text-indigo-900">{new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Last Updated
                                </p>
                                <p className="text-sm font-bold text-indigo-900">{new Date(profile.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Account ID
                                </p>
                                <p className="text-sm font-bold text-indigo-900">#{profile.id.slice(-4).toUpperCase()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Forms */}
                <div className="lg:col-span-2 space-y-8">
                    {message.text && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {message.type === 'success' ? '✅' : '❌'} {message.text}
                        </div>
                    )}

                    {/* Personal Info Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                        </div>

                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <User className="w-3.5 h-3.5" />
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.name}
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
                                        placeholder="Septika Narasha"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" />
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        readOnly
                                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.phone || ''}
                                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
                                        placeholder="081234567890"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        WhatsApp Number
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.whatsapp || ''}
                                        onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
                                        placeholder="085186847600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5" />
                                        Business Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.company || ''}
                                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    Address
                                </label>
                                <textarea
                                    value={profile.address || ''}
                                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium resize-none"
                                    placeholder="Optional"
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 font-bold text-sm tracking-tight"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Password Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                <Phone className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Change Phone Number (Password)</h3>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        Current Phone Number (Password)
                                    </label>
                                    <input
                                        type="text"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm font-medium"
                                        placeholder="Masuk nomor HP saat ini"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        New Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm font-medium"
                                        placeholder="Masuk nomor HP baru (min 6 digit)"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5" />
                                        Confirm Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm font-medium"
                                        placeholder="Konfirmasi nomor HP baru"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                                <p className="text-xs text-orange-700 font-medium">📱 Nomor HP baru akan digunakan sebagai password login anda</p>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={passSaving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm tracking-tight"
                                >
                                    <Phone className="w-4 h-4" />
                                    {passSaving ? 'Updating...' : 'Update Phone Number'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
