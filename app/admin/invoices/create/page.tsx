'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowLeft, Plus, Trash2, Save, Users } from 'lucide-react';
import Button from '@/components/Button';

interface Client {
    id: string;
    email: string;
    name: string;
    phone: string;
}

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    total: number;
}

export default function CreateInvoicePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    
    // Form State
    const [clientId, setClientId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [description, setDescription] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [tax, setTax] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: '1', description: '', quantity: 1, price: 0, total: 0 }
    ]);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await fetch('/api/admin/clients');
                if (res.ok) {
                    const data = await res.json();
                    setClients(data);
                }
            } catch (error) {
                console.error('Failed to fetch clients:', error);
            }
        };
        fetchClients();
    }, []);

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        setClientId(selectedId);
        
        if (selectedId) {
            const client = clients.find(c => c.id === selectedId);
            if (client) {
                setCustomerName(client.name);
                setCustomerEmail(client.email);
                setCustomerPhone(client.phone || '');
            }
        } else {
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
        }
    };

    const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'price') {
                    updatedItem.total = Number(updatedItem.quantity) * Number(updatedItem.price);
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, price: 0, total: 0 }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const finalTotal = subtotal + Number(tax) - Number(discount);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customerName || !customerEmail || !issueDate || !dueDate) {
            alert('Silakan lengkapi data yang wajib (Nama, Email, Issue Date, Due Date).');
            return;
        }

        const itemsValid = items.every(i => i.description && i.quantity > 0 && i.price >= 0);
        if (!itemsValid || items.length === 0) {
            alert('Silakan masukkan minimal satu line item dengan deskripsi yang valid.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/admin/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: clientId || null,
                    customerName,
                    customerEmail,
                    customerPhone,
                    description,
                    issueDate,
                    dueDate,
                    notes,
                    items,
                    subtotal,
                    tax: Number(tax),
                    discount: Number(discount),
                    total: finalTotal
                }),
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/admin/invoices/${data.id}`);
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to create invoice');
            }
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/invoices">
                        <Button variant="secondary" size="md" icon={<ArrowLeft className="w-5 h-5" />}>
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="bg-blue-100 p-3 rounded-lg flex items-center justify-center">
                                <Plus className="w-6 h-6 text-blue-600" />
                            </div>
                            Create Invoice
                        </h1>
                        <p className="text-gray-600 mt-1">Generate a new invoice for client</p>
                    </div>
                </div>
                <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={handleSubmit} 
                    isLoading={loading}
                    icon={<Save className="w-5 h-5" />}
                >
                    Save & Generate
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Information */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                        <Users className="w-5 h-5 text-gray-400" />
                        Client Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Select Existing Client (Optional)</label>
                            <select 
                                value={clientId} 
                                onChange={handleClientChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                            >
                                <option value="">-- Manual Input --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name} ({client.email})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">Selecting a client autofills details below.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Customer Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                required
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
                            <input
                                type="text"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Invoice Meta */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                        <FileText className="w-5 h-5 text-gray-400" />
                        Invoice Attributes
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Issue Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Due Date <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-gray-900 mb-2">Short Description</label>
                            <input
                                type="text"
                                placeholder="e.g. Website Development Service"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Line Items</h2>
                        <Button type="button" variant="secondary" size="sm" onClick={addItem} icon={<Plus className="w-4 h-4" />}>
                            Add Item
                        </Button>
                    </div>

                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100/50 border-b border-gray-200 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                    <th className="p-4 w-1/2">Description</th>
                                    <th className="p-4 w-24">QTY</th>
                                    <th className="p-4">Price (IDR)</th>
                                    <th className="p-4">Total</th>
                                    <th className="p-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Item description..."
                                                value={item.description}
                                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-center font-medium"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-right font-medium"
                                            />
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-900">
                                            {formatCurrency(item.total)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                type="button" 
                                                onClick={() => removeItem(item.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                disabled={items.length === 1}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Calculation and Notes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Notes & Terms</label>
                        <textarea
                            rows={4}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600 bg-gray-50"
                            placeholder="Thank you for your business..."
                        ></textarea>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-end space-y-4">
                        <div className="flex items-center justify-between text-gray-600">
                            <span className="font-semibold px-4">Subtotal</span>
                            <span className="font-bold text-lg">{formatCurrency(subtotal)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                            <span className="font-semibold text-gray-600 px-4 w-1/3">Discount</span>
                            <div className="relative w-2/3">
                                <span className="absolute left-3 top-3 text-gray-400 font-medium">Rp</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={discount}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-right text-red-600 font-bold focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
                            <span className="font-semibold text-gray-600 px-4 w-1/3">Tax / Value</span>
                            <div className="relative w-2/3">
                                <span className="absolute left-3 top-3 text-gray-400 font-medium">Rp</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={tax}
                                    onChange={(e) => setTax(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-right font-bold text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t-2 border-dashed border-gray-300 pt-4 mt-8 rounded-b-xl bg-blue-50/50 -mx-6 px-10 pb-4">
                            <span className="font-black text-2xl text-gray-900">Total (IDR)</span>
                            <span className="font-black text-4xl text-blue-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">{formatCurrency(finalTotal)}</span>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
