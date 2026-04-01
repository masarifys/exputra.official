import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { resolveClientSessionCustomer } from '@/lib/client-session';
import PrintButton from './PrintButton';

export default async function PrintInvoicePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const invoiceId = params.id;

    // Check auth
    const session = await resolveClientSessionCustomer();
    if (!session?.email) {
        return <div className="p-10 text-center text-red-600 font-bold">Unauthorized. Silakan login.</div>;
    }

    // Fetch Settings
    let settings = await prisma.siteSetting.findFirst();

    let printData = null;

    // 1. Check in Website Orders
    const order = await prisma.order.findUnique({
        where: { invoiceId },
        include: { package: true }
    });

    if (order) {
        if (order.customerEmail !== session.email) return <div className="p-10 text-center text-red-500 font-bold">Forbidden</div>;
        printData = {
            invoiceId: order.invoiceId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            date: order.createdAt,
            status: order.status,
            subtotal: order.subtotal,
            discount: order.discount,
            tax: 0,
            total: order.total,
            notes: order.notes || '',
            items: [
                {
                    description: `Website Creation - ${order.package?.name || 'Custom Package'} (${order.domainName})`,
                    quantity: 1,
                    price: order.subtotal,
                    total: order.subtotal
                }
            ]
        };
    } else {
        // 2. Check in Service Orders
        const serviceOrder = await (prisma as any).serviceOrder.findUnique({
            where: { invoiceId },
            include: { service: true }
        });

        if (serviceOrder) {
            if (serviceOrder.customerEmail !== session.email) return <div className="p-10 text-center text-red-500 font-bold">Forbidden</div>;
            printData = {
                invoiceId: serviceOrder.invoiceId,
                customerName: serviceOrder.customerName,
                customerEmail: serviceOrder.customerEmail,
                customerPhone: serviceOrder.customerPhone,
                date: serviceOrder.createdAt,
                status: serviceOrder.status,
                subtotal: serviceOrder.subtotal,
                discount: 0,
                tax: 0,
                total: serviceOrder.total,
                notes: serviceOrder.notes || '',
                items: [
                    {
                        description: `Service - ${serviceOrder.service?.name || ''} (${serviceOrder.packageName || ''})`,
                        quantity: serviceOrder.packageMultiplier || 1,
                        price: serviceOrder.subtotal / (serviceOrder.packageMultiplier || 1),
                        total: serviceOrder.subtotal
                    }
                ]
            };
        } else {
            // 3. Check in dedicated Invoices
            const adminInvoice = await prisma.invoice.findUnique({
                where: { invoiceNumber: invoiceId },
                include: { items: true }
            });

            if (adminInvoice) {
                if (adminInvoice.customerEmail !== session.email) return <div className="p-10 text-center text-red-500 font-bold">Forbidden</div>;
                printData = {
                    invoiceId: adminInvoice.invoiceNumber,
                    customerName: adminInvoice.customerName,
                    customerEmail: adminInvoice.customerEmail,
                    customerPhone: adminInvoice.customerPhone || '',
                    date: adminInvoice.issueDate,
                    status: adminInvoice.status,
                    subtotal: adminInvoice.subtotal,
                    discount: adminInvoice.discount,
                    tax: adminInvoice.tax,
                    total: adminInvoice.total,
                    notes: adminInvoice.notes || '',
                    items: adminInvoice.items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.total
                    }))
                };
            }
        }
    }

    if (!printData) {
        return notFound();
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    return (
        <div className="bg-gray-100 min-h-screen py-10 font-sans print:bg-white print:py-0">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden print:shadow-none print:rounded-none">
                {/* PDF Toolbar */}
                <div className="bg-gray-800 px-6 py-4 flex justify-between items-center print:hidden">
                    <h1 className="text-white font-bold text-lg">Document Viewer</h1>
                    <PrintButton />
                </div>

                {/* Invoice Content */}
                <div className="p-10 md:p-16 printable-area">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-gray-100 pb-8 mb-8">
                        <div>
                            {settings?.logo ? (
                                <img 
                                    src={settings.logo.startsWith('http') || settings.logo.startsWith('/') ? settings.logo : `/${settings.logo}`} 
                                    alt={settings?.siteName || 'Logo'} 
                                    className="h-14 w-auto object-contain mb-4" 
                                />
                            ) : (
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-2xl mb-4 shadow-sm">
                                    {(settings?.siteName || 'EX').substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{settings?.siteName || 'Bisnis Anda'}</h2>
                            {settings?.contactEmail && <p className="text-sm text-gray-500 font-medium mt-1">{settings.contactEmail}</p>}
                            {settings?.contactPhone && <p className="text-sm text-gray-500 font-medium">{settings.contactPhone}</p>}
                        </div>
                        <div className="text-right">
                            <h1 className="text-5xl font-black text-gray-100 uppercase tracking-widest mb-2 select-none">Invoice</h1>
                            <p className="text-xl font-bold text-gray-900">#{printData.invoiceId}</p>
                            
                            <div className="mt-4 flex flex-col gap-1 items-end">
                                <span className={`inline-flex px-3 py-1 text-xs rounded-full font-bold uppercase tracking-wider 
                                    ${printData.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                      printData.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                      printData.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'}`}>
                                    {printData.status}
                                </span>
                                <p className="text-sm font-medium text-gray-500 mt-2">
                                    Date: <span className="text-gray-900 font-bold">{formatDate(printData.date)}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Billed To */}
                    <div className="mb-10 p-5 bg-gray-50 rounded-xl border border-gray-100">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Billed To</h3>
                        <p className="text-xl font-black text-gray-900">{printData.customerName}</p>
                        <p className="text-gray-600 font-medium mt-1">{printData.customerEmail}</p>
                        {printData.customerPhone && <p className="text-gray-600 font-medium">{printData.customerPhone}</p>}
                    </div>

                    {/* Table */}
                    <div className="mb-10 rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-200 text-xs font-black text-gray-600 uppercase tracking-wider">
                                    <th className="p-4 w-1/2">Item Description</th>
                                    <th className="p-4 text-center">Qty</th>
                                    <th className="p-4 text-right">Unit Price</th>
                                    <th className="p-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {printData.items.map((item: any, index: number) => (
                                    <tr key={index} className="bg-white">
                                        <td className="p-4 font-bold text-gray-900">{item.description}</td>
                                        <td className="p-4 text-center text-gray-600 font-medium">{item.quantity}</td>
                                        <td className="p-4 text-right text-gray-600 font-medium">{formatCurrency(item.price)}</td>
                                        <td className="p-4 text-right font-black text-gray-900">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Calculation */}
                    <div className="flex justify-end mb-10">
                        <div className="w-full max-w-sm space-y-3 p-5 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="flex justify-between text-gray-600 font-medium">
                                <span>Subtotal</span>
                                <span className="font-bold text-gray-900">{formatCurrency(printData.subtotal)}</span>
                            </div>
                            {printData.discount > 0 && (
                                <div className="flex justify-between text-red-500 font-medium">
                                    <span>Discount</span>
                                    <span className="font-bold">-{formatCurrency(printData.discount)}</span>
                                </div>
                            )}
                            {printData.tax > 0 && (
                                <div className="flex justify-between text-gray-600 font-medium">
                                    <span>Tax / Fee</span>
                                    <span className="font-bold">{formatCurrency(printData.tax)}</span>
                                </div>
                            )}
                            
                            <div className="pt-4 mt-2 border-t-2 border-gray-200 flex justify-between items-center">
                                <span className="font-black text-gray-900 text-lg">Total Due</span>
                                <span className="font-black text-3xl text-blue-600 tracking-tight">
                                    {formatCurrency(printData.total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Notes */}
                    <div className="pt-8 border-t-2 border-dashed border-gray-200 text-center">
                        <p className="font-bold text-gray-900 mb-1">Thank you for your business!</p>
                        <p className="text-sm text-gray-500 font-medium">If you have any questions concerning this invoice, contact {settings?.contactEmail || 'admin@example.com'}</p>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        body { background: white; margin: 0; padding: 0; }
                        @page { size: auto; margin: 0; }
                    }
                `}} />
            </div>
        </div>
    );
}
