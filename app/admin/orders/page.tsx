'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Filter, Eye, Trash2, Plus, X, Package, Clock } from 'lucide-react';

interface Order {
  id: string;
  invoiceId: string;
  domainName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  createdAt: string;
  expiredAt: string | null;
  templateId: string;
  packageId?: string | null;
  domain: { extension: string };
  template: { id: string; name: string };
  package?: { id: string; name: string; duration: number } | null;
  promo: { code: string } | null;
  services?: { id: string; service: { name: string }; price: number }[];
  affiliateLinkId?: string | null;
  affiliateLink?: { customer: { id: string; name: string; email: string } } | null;
}

const statusConfig: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '⏳', label: 'Menunggu Pembayaran' },
  PAID: { bg: 'bg-green-50', text: 'text-green-700', icon: '✓', label: 'Sudah Dibayar' },
  PROCESSING: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '⚙', label: 'Diproses' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '✓✓', label: 'Selesai' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', icon: '✕', label: 'Dibatalkan' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'packages'>('details');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState({
    templateId: '',
    packageId: '',
    serviceIds: [] as string[],
    expiredAt: '',
  });

  const [clients, setClients] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [selectedUpgradePackage, setSelectedUpgradePackage] = useState<string>('');
  const [affiliators, setAffiliators] = useState<any[]>([]);
  const [selectedAffiliatorId, setSelectedAffiliatorId] = useState<string>('');
  const [assigningAffiliate, setAssigningAffiliate] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [c, d, p, t, s, affs] = await Promise.all([
        fetch('/api/admin/clients').then(res => res.json()),
        fetch('/api/public/domains').then(res => res.json()),
        fetch('/api/public/packages').then(res => res.json()),
        fetch('/api/public/templates').then(res => res.json()),
        fetch('/api/public/services').then(res => res.json()),
        fetch('/api/admin/affiliators').then(res => res.json())
      ]);
      setClients(c);
      setDomains(d);
      setPackages(p);
      setTemplates(t);
      setServices(s);
      setAffiliators(affs || []);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    }
  };

  useEffect(() => {
    let result = orders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.invoiceId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.domainName.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter(o => o.status === statusFilter);
    }
    setFilteredOrders(result);
  }, [orders, search, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchOrders();
        setSelectedOrder((prev) => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  const assignAffiliate = async (orderId: string, affiliatorId: string) => {
    try {
      setAssigningAffiliate(true);
      const res = await fetch(`/api/admin/orders/${orderId}/affiliate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliatorId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Affiliate updated successfully');
        fetchOrders();
        setSelectedOrder(null);
      } else {
        alert(data.message || 'Failed to assign affiliate');
      }
    } catch (error) {
      console.error('Failed to assign affiliate:', error);
      alert('Error updating affiliate');
    } finally {
      setAssigningAffiliate(false);
    }
  };

  const updateTotal = async (orderId: string, total: number) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total }),
      });
      if (res.ok) {
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Failed to update total:', error);
    }
  };

  const updateOrderDetails = async (orderId: string, templateId: string, packageId: string, serviceIds: string[], expiredAt: string, total: number) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          packageId,
          serviceIds,
          expiredAt: expiredAt ? new Date(expiredAt).toISOString() : null,
          total,
        }),
      });
      if (res.ok) {
        alert('✓ Order details updated successfully!');
        fetchOrders();
      } else {
        alert('Failed to update order details');
      }
    } catch (error) {
      console.error('Failed to update order details:', error);
      alert('Error updating order details');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus order ini?')) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) fetchOrders();
    } catch (error) {
      console.error('Failed to delete order:', error);
    }
  };

  const handleUpgradePackage = async () => {
    if (!selectedUpgradePackage || !selectedOrder) {
      alert('Please select a package');
      return;
    }

    setUpgradeLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/upgrade-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedUpgradePackage }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('✓ Package upgraded successfully!');
        setSelectedUpgradePackage('');
        setActiveTab('details');
        fetchOrders();
      } else {
        alert(result.message || 'Failed to upgrade package');
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to upgrade package');
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
            Orders
          </h1>
          <p className="text-gray-600 mt-2">Kelola pesanan pelanggan</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tambah Order
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoice, customer, or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading orders...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.PENDING;
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Left Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`${config.bg} px-3 py-1 rounded-lg text-sm font-medium ${config.text}`}>
                        {config.label}
                      </div>
                      <span className="text-xs font-mono text-gray-500 bg-gray-50 px-3 py-1 rounded">{order.invoiceId}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Customer</p>
                        <p className="font-semibold text-gray-900">{order.customerName}</p>
                        <p className="text-xs text-gray-600">{order.customerEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Domain</p>
                        <p className="font-semibold text-gray-900">{order.domainName}{order.domain?.extension}</p>
                        <p className="text-xs text-gray-600">{order.package?.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Content */}
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Total</p>
                      <p className="text-xl font-bold text-gray-900">IDR {order.total.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-gray-500 mt-2">{new Date(order.createdAt).toLocaleDateString('id-ID')}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setSelectedAffiliatorId(order.affiliateLink?.customer?.id || '');
                        }}
                        className="p-3 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="p-3 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                <p className="text-sm text-gray-600 mt-1">Invoice #{selectedOrder.invoiceId}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Tabs */}
              <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                  onClick={() => { setActiveTab('details'); setSelectedUpgradePackage(''); }}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'details'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  📋 Details
                </button>
                <button
                  onClick={() => setActiveTab('packages')}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'packages'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  📦 Packages
                </button>
              </div>

              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Edit Button */}
                  <div className="flex gap-2">
                    {!isEditingDetails ? (
                      <button
                        onClick={() => {
                          setIsEditingDetails(true);
                          setEditFormData({
                            templateId: selectedOrder.templateId || '',
                            packageId: selectedOrder.packageId || '',
                            serviceIds: selectedOrder.services?.map(s => s.id) || [],
                            expiredAt: selectedOrder.expiredAt ? new Date(selectedOrder.expiredAt).toISOString().split('T')[0] : '',
                          });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        ✏️ Edit Package Details
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            if (selectedOrder) {
                              updateOrderDetails(
                                selectedOrder.id,
                                editFormData.templateId,
                                editFormData.packageId,
                                editFormData.serviceIds,
                                editFormData.expiredAt,
                                selectedOrder.total
                              );
                              setIsEditingDetails(false);
                            }
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          ✓ Save Changes
                        </button>
                        <button
                          onClick={() => setIsEditingDetails(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                        >
                          ✕ Cancel
                        </button>
                      </>
                    )}
                  </div>

                  {/* Edit Form */}
                  {isEditingDetails && (
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 space-y-4">
                      <h3 className="font-bold text-gray-900">Edit Package Details</h3>
                      
                      {/* Template Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                        <select
                          value={editFormData.templateId}
                          onChange={(e) => setEditFormData({...editFormData, templateId: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Template...</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Package Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Package</label>
                        <select
                          value={editFormData.packageId}
                          onChange={(e) => setEditFormData({...editFormData, packageId: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Package...</option>
                          {packages.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.duration} tahun - IDR {p.price.toLocaleString('id-ID')})</option>
                          ))}
                        </select>
                      </div>

                      {/* Services Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
                        <div className="space-y-2">
                          {services.map(s => (
                            <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-blue-100 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editFormData.serviceIds.includes(s.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditFormData({...editFormData, serviceIds: [...editFormData.serviceIds, s.id]});
                                  } else {
                                    setEditFormData({...editFormData, serviceIds: editFormData.serviceIds.filter(id => id !== s.id)});
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{s.name} (IDR {s.price.toLocaleString('id-ID')})</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                        <input
                          type="date"
                          value={editFormData.expiredAt}
                          onChange={(e) => setEditFormData({...editFormData, expiredAt: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Total Price Edit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total Price (IDR)</label>
                        <input
                          type="number"
                          value={selectedOrder.total}
                          onChange={(e) => setSelectedOrder({...selectedOrder, total: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Current: IDR {selectedOrder.total.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  )}

                  {/* Customer & Service Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 font-semibold mb-3 uppercase">Customer Info</p>
                      <p className="font-semibold text-gray-900">{selectedOrder.customerName}</p>
                      <p className="text-sm text-gray-600">{selectedOrder.customerEmail}</p>
                      <p className="text-sm text-gray-600">{selectedOrder.customerPhone}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 font-semibold mb-3 uppercase">Services</p>
                      <p className="text-sm"><strong>Domain:</strong> {selectedOrder.domainName}{selectedOrder.domain?.extension}</p>
                      <p className="text-sm"><strong>Template:</strong> {selectedOrder.template?.name}</p>
                      <p className="text-sm"><strong>Package:</strong> {selectedOrder.package?.name}</p>
                    </div>
                  </div>

                  {/* Affiliate Info */}
                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <p className="text-xs text-purple-600 font-semibold mb-3 uppercase">Affiliate Assignment</p>
                    {selectedOrder.packageId ? (
                      <div className="flex gap-2">
                        <select
                          value={selectedAffiliatorId}
                          onChange={(e) => setSelectedAffiliatorId(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        >
                          <option value="">No Affiliate</option>
                          {affiliators.map(aff => (
                            <option key={aff.id} value={aff.id}>{aff.name} ({aff.email})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => assignAffiliate(selectedOrder.id, selectedAffiliatorId)}
                          disabled={assigningAffiliate || selectedAffiliatorId === (selectedOrder.affiliateLink?.customer?.id || '')}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                          {assigningAffiliate ? 'Saving...' : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">This order cannot be assigned to an affiliate because it has no package.</p>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold mb-4 uppercase">Pricing Breakdown</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Subtotal:</span>
                        <span className="font-semibold text-gray-900">IDR {selectedOrder.subtotal.toLocaleString('id-ID')}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Discount:</span>
                          <span className="font-semibold text-red-600">- IDR {selectedOrder.discount.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="border-t border-blue-300 pt-3 flex justify-between">
                        <span className="font-bold text-gray-900">Total:</span>
                        <span className="text-xl font-bold text-blue-600">IDR {selectedOrder.total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-3 uppercase">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => updateStatus(selectedOrder.id, key)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedOrder.status === key
                              ? `${config.bg} ${config.text} ring-2 ring-offset-2 ring-${config.text}`
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'packages' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-4 rounded-lg">
                        <Package className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-semibold">Current Package</p>
                        <p className="text-2xl font-bold text-blue-900">{selectedOrder.package?.name}</p>
                        <p className="text-xs text-blue-700 mt-1">{selectedOrder.package?.duration} year(s)</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Upgrade to Package:</label>
                    <select
                      value={selectedUpgradePackage}
                      onChange={(e) => setSelectedUpgradePackage(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a package...</option>
                      {packages.map((pkg: any) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - IDR {pkg.price.toLocaleString()} ({pkg.duration} year{pkg.duration > 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedUpgradePackage && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                      {(() => {
                        const selectedPkg = packages.find((p: any) => p.id === selectedUpgradePackage);
                        const currentPkg = packages.find((p: any) => p.name === selectedOrder.package?.name);
                        const priceDiff = (selectedPkg?.price || 0) - (currentPkg?.price || 0);
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Current</p>
                                <p className="text-lg font-bold text-gray-900">IDR {currentPkg?.price.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{currentPkg?.duration}y</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">New</p>
                                <p className="text-lg font-bold text-gray-900">IDR {selectedPkg?.price.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{selectedPkg?.duration}y</p>
                              </div>
                            </div>
                            <div className="border-t border-green-300 pt-4">
                              <p className={`text-sm font-bold ${priceDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {priceDiff > 0 ? 'Additional cost: +' : 'Refund: +'} IDR {Math.abs(priceDiff).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('details'); setSelectedUpgradePackage(''); }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleUpgradePackage}
                      disabled={upgradeLoading || !selectedUpgradePackage}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-5 h-5" />
                      {upgradeLoading ? 'Processing...' : 'Upgrade Package'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <OrderAddModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchOrders(); }}
          clients={clients} domains={domains} packages={packages} templates={templates} services={services}
        />
      )}
    </div>
  );
}

function OrderAddModal({ onClose, onSuccess, clients, domains, packages, templates, services }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerEmail: '', customerName: '', customerPhone: '',
    domainName: '', domainId: '', templateId: '', packageId: '',
    subtotal: 0, discount: 0, total: 0, services: [] as any[],
    status: 'PENDING',
  });

  useEffect(() => {
    const dom = domains.find((d: any) => d.id === formData.domainId);
    const pkg = packages.find((p: any) => p.id === formData.packageId);
    const tmp = templates.find((t: any) => t.id === formData.templateId);

    // If package includes free domain, domain price is 0
    const domainPrice = pkg?.freeDomain ? 0 : (dom?.price || 0);

    // Calculate subtotal - all fields are now optional
    const pkgPrice = formData.packageId && pkg ? pkg.price : 0;
    const tmpPrice = formData.templateId && tmp ? tmp.price : 0;
    const sub = domainPrice + pkgPrice + tmpPrice;
    const svcTotal = formData.services.reduce((acc, s) => acc + s.price, 0);
    const total = sub + svcTotal - formData.discount;
    setFormData(prev => ({ ...prev, subtotal: sub + svcTotal, total: total > 0 ? total : 0 }));
  }, [formData.domainId, formData.packageId, formData.templateId, formData.services, formData.discount, domains, packages, templates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) onSuccess();
      else alert('Failed to create order');
    } catch (error) { alert('Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 italic">Create New Order</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Client *</label>
              <select required className="w-full px-4 py-2 border rounded-lg" value={formData.customerEmail}
                onChange={(e) => {
                  const c = clients.find((cl: any) => cl.email === e.target.value);
                  setFormData({ ...formData, customerEmail: e.target.value, customerName: c?.name || '', customerPhone: c?.phone || '' });
                }}>
                <option value="">Choose Client</option>
                {clients.map((c: any) => <option key={c.id} value={c.email}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Domain Name *</label>
              <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={formData.domainName}
                onChange={(e) => setFormData({ ...formData, domainName: e.target.value })} placeholder="mysite" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Extension *</label>
              <select required className="w-full px-4 py-2 border rounded-lg" value={formData.domainId}
                onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}>
                <option value="">Pilih Extension</option>
                {domains.map((d: any) => <option key={d.id} value={d.id}>{d.extension}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Package (Optional)</label>
              <select className="w-full px-4 py-2 border rounded-lg" value={formData.packageId}
                onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}>
                <option value="">Tidak ada (Hanya Layanan)</option>
                {packages.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Template (Optional)</label>
              <select className="w-full px-4 py-2 border rounded-lg" value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}>
                <option value="">Tidak ada</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Additional Services</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-100">
              {services.filter((s: any) => s.isActive).map((s: any) => (
                <label key={s.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:border-cyan-200 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-cyan-600 rounded"
                    checked={formData.services.some(x => x.id === s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setFormData({ ...formData, services: [...formData.services, { id: s.id, price: s.price }] });
                      else setFormData({ ...formData, services: formData.services.filter(x => x.id !== s.id) });
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-900 leading-tight">{s.name}</p>
                    <p className="text-[9px] text-cyan-600 font-bold leading-none mt-0.5">+IDR {s.price.toLocaleString()}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl">
            <div className="flex justify-between font-bold text-cyan-700">
              <span>TOTAL:</span>
              <span>IDR {formData.total.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2">Cancel</button>
            <button type="submit" disabled={loading} className="bg-cyan-600 text-white px-8 py-2 rounded-xl font-bold">
              {loading ? '...' : 'CONFIRM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
