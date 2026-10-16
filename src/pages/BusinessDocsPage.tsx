import React, { useState } from 'react';
import { 
  InvoiceDocument, ReceiptDocument, ProposalDocument, DeliveryNoteDocument, 
  InvoiceLineItem, BusinessEntity, DeliveryNoteItem 
} from '../types/business';
import { exportElementToPDF } from '../lib/pdfExport';
import { useEntitlements } from '../context/EntitlementsContext';
import { 
  FileText, Receipt, Briefcase, Truck, Download, Plus, Trash2, 
  CheckCircle2, Sparkles, Building, Printer, Copy 
} from 'lucide-react';

interface BusinessDocsPageProps {
  setCurrentTab: (tab: string) => void;
}

export const BusinessDocsPage: React.FC<BusinessDocsPageProps> = ({ setCurrentTab }) => {
  const { isWatermarkFree } = useEntitlements();
  const [docType, setDocType] = useState<'invoice' | 'receipt' | 'proposal' | 'delivery'>('invoice');
  const [isExporting, setIsExporting] = useState(false);

  // Shared Sender Profile
  const [sender, setSender] = useState<BusinessEntity>({
    name: 'JOEASSIST Enterprises Ltd',
    email: 'josepchiemezie@gmail.com',
    phone: '08039448648',
    address: 'Plot 14 Victoria Island, Lagos, Nigeria',
    taxId: 'TIN-98745612-001',
    bankDetails: {
      bankName: 'Zenith Bank PLC',
      accountName: 'Joseph Chiemezie Enterprises',
      accountNumber: '2109845321',
    }
  });

  // Client / Recipient Profile
  const [client, setClient] = useState<BusinessEntity>({
    name: 'Horizon Digital Media Group',
    email: 'billing@horizondigital.ng',
    phone: '08023456789',
    address: 'Central Business District, Abuja, Nigeria',
  });

  // 1. INVOICE STATE
  const [invoice, setInvoice] = useState<InvoiceDocument>({
    id: 'inv-' + Date.now(),
    invoice_number: 'INV-2026-0042',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    sender,
    recipient: client,
    items: [
      { id: '1', description: 'Enterprise Full-Stack Cloud Architecture & Development', quantity: 1, unitPrice: 450000, amount: 450000 },
      { id: '2', description: 'AI Agent & Database Indexing Optimization', quantity: 1, unitPrice: 180000, amount: 180000 },
    ],
    subtotal: 630000,
    tax_rate: 7.5, // Nigerian VAT 7.5%
    tax_amount: 47250,
    discount_amount: 20000,
    total: 657250,
    amount_paid: 200000,
    balance_due: 457250,
    currency: 'NGN',
    payment_terms: 'Payment due within 14 days of invoice date. Bank transfer accepted.',
    notes: 'Thank you for your business. For billing queries, contact 08039448648.',
    status: 'partially_paid'
  });

  // 2. RECEIPT STATE
  const [receipt, setReceipt] = useState<ReceiptDocument>({
    id: 'rec-' + Date.now(),
    receipt_number: 'REC-2026-0089',
    payment_date: new Date().toISOString().split('T')[0],
    payer: client,
    recipient: sender,
    payment_method: 'Electronic Bank Transfer',
    transaction_ref: 'TRX_NIP_9876543210',
    description: 'Part payment for Enterprise Cloud Architecture & Development Services',
    amount_paid: 200000,
    currency: 'NGN',
    balance_remaining: 457250,
    is_platform_verified: true,
    authorized_notes: 'Payment confirmed received into Zenith Bank Account by Accounts Dept.'
  });

  // 3. PROPOSAL STATE
  const [proposal, setProposal] = useState<ProposalDocument>({
    id: 'prop-' + Date.now(),
    proposal_number: 'PROP-2026-015',
    title: 'Digital Transformation & AI Automation Systems Proposal',
    sender,
    client,
    executive_summary: 'JOEASSIST Enterprises proposes a complete end-to-end modernization of your digital workflow, integrating automated document creation, high-performance database architectures, and secure payment processing.',
    client_needs: 'The client requires a dependable, modern web platform accessible on mobile devices with automated invoicing, document generation, and Nigerian payment integrations.',
    proposed_solution: 'Implement a modern web application built on React, PostgreSQL with Row Level Security, Paystack gateway, and AI-assisted processing.',
    deliverables: [
      { id: '1', title: 'System Architecture Design', description: 'Detailed database schema and API documentation.' },
      { id: '2', title: 'Core Application Engine', description: 'React frontend with responsive Android and desktop views.' },
      { id: '3', title: 'Payment & AI Integration', description: 'Paystack checkout integration and automated AI document drafting.' }
    ],
    timeline: [
      { id: '1', phase: 'Phase 1: Architecture & Prototyping', duration: '2 Weeks', deliverables: 'Schema, wireframes, environment setup.' },
      { id: '2', phase: 'Phase 2: Full Build & Testing', duration: '3 Weeks', deliverables: 'Working application, automated tests, deployment.' }
    ],
    pricing_breakdown: [
      { id: '1', item: 'Platform Architecture & UI/UX Design', cost: 350000 },
      { id: '2', item: 'AI & Payment Gateway Engineering', cost: 450000 },
      { id: '3', item: 'Deployment & Support', cost: 150000 }
    ],
    total_budget: 950000,
    currency: 'NGN',
    terms_and_conditions: '50% mobilization advance upon signing, 50% upon final acceptance.',
    assumptions_exclusions: 'Third-party cloud infrastructure hosting fees are billed directly to client.',
    signature_name: 'Joseph Chiemezie (Founder & Lead Engineer)',
    status: 'draft'
  });

  // 4. DELIVERY NOTE STATE
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNoteDocument>({
    id: 'del-' + Date.now(),
    delivery_note_number: 'DN-2026-0031',
    order_ref: 'PO-HORIZON-892',
    delivery_date: new Date().toISOString().split('T')[0],
    sender,
    recipient: client,
    delivery_address: 'Plot 48 Adetokunbo Ademola Crescent, Wuse II, Abuja, Nigeria',
    items: [
      { id: '1', itemNumber: '001', description: 'Complete Source Code Bundle (USB Encrypted Key)', quantityOrdered: 1, quantityDelivered: 1, unit: 'Kit' },
      { id: '2', itemNumber: '002', description: 'Printed System Architecture Manuals', quantityOrdered: 3, quantityDelivered: 3, unit: 'Copies' },
    ],
    delivery_instructions: 'Deliver to 2nd Floor Reception, Attention: Head of Engineering.',
    received_by_name: 'Engr. Dapo Alabi',
    status: 'delivered',
    notes: 'Items inspected and confirmed in pristine operating order upon physical handover.'
  });

  // Deterministic Invoice Calculations
  const updateInvoiceCalculations = (items: InvoiceLineItem[], taxRate: number, discount: number, paid: number) => {
    const sub = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
    const tax = Math.round((sub * taxRate) / 100);
    const tot = Math.max(0, sub + tax - discount);
    const bal = Math.max(0, tot - paid);

    setInvoice(prev => ({
      ...prev,
      items,
      subtotal: sub,
      tax_rate: taxRate,
      tax_amount: tax,
      discount_amount: discount,
      total: tot,
      amount_paid: paid,
      balance_due: bal,
    }));
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportElementToPDF('business-doc-printable', {
        filename: `${docType.toUpperCase()}_JOEASSIST.pdf`,
        isWatermarkFree,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
          Enterprise Business Documentation Center
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Invoices, Receipts, Proposals & Delivery Notes
        </h1>
        <p className="text-sm text-gray-600">
          Create legally compliant Nigerian business paperwork with verified arithmetic calculations and instant PDF export.
        </p>
      </div>

      {/* Document Type Selector Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 bg-gray-100 rounded-2xl gap-1">
          {[
            { id: 'invoice', label: '1. Invoices', icon: FileText },
            { id: 'receipt', label: '2. Receipts', icon: Receipt },
            { id: 'proposal', label: '3. Proposals', icon: Briefcase },
            { id: 'delivery', label: '4. Delivery Notes', icon: Truck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDocType(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                docType === tab.id ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Preview Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
        {/* Left Form Controls */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-bold text-gray-900 text-sm capitalize">{docType} Details & Settings</h3>
            <span className="text-[11px] font-mono text-gray-500">
              {docType === 'invoice' && invoice.invoice_number}
              {docType === 'receipt' && receipt.receipt_number}
              {docType === 'proposal' && proposal.proposal_number}
              {docType === 'delivery' && deliveryNote.delivery_note_number}
            </span>
          </div>

          {/* SENDER SETTINGS */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-600 uppercase">Your Business / Sender Details</label>
            <input
              type="text"
              value={sender.name}
              onChange={(e) => setSender(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Business Name"
              className="w-full p-2 text-xs border rounded-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={sender.phone}
                onChange={(e) => setSender(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone"
                className="p-2 text-xs border rounded-lg"
              />
              <input
                type="email"
                value={sender.email}
                onChange={(e) => setSender(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="p-2 text-xs border rounded-lg"
              />
            </div>
            <input
              type="text"
              value={sender.address}
              onChange={(e) => setSender(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Address"
              className="w-full p-2 text-xs border rounded-lg"
            />
          </div>

          {/* RECIPIENT SETTINGS */}
          <div className="space-y-2 pt-2 border-t">
            <label className="text-[11px] font-bold text-gray-600 uppercase">Customer / Client Details</label>
            <input
              type="text"
              value={client.name}
              onChange={(e) => setClient(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Client / Customer Name"
              className="w-full p-2 text-xs border rounded-lg"
            />
            <input
              type="text"
              value={client.address}
              onChange={(e) => setClient(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Client Address"
              className="w-full p-2 text-xs border rounded-lg"
            />
          </div>

          {/* DOCUMENT SPECIFIC CONTROLS */}
          {docType === 'invoice' && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Line Items</label>
                <button
                  onClick={() => {
                    const newItem: InvoiceLineItem = {
                      id: Date.now().toString(),
                      description: 'New Service / Product Item',
                      quantity: 1,
                      unitPrice: 50000,
                      amount: 50000
                    };
                    const updated = [...invoice.items, newItem];
                    updateInvoiceCalculations(updated, invoice.tax_rate, invoice.discount_amount, invoice.amount_paid);
                  }}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {invoice.items.map((it, idx) => (
                <div key={it.id} className="p-2 bg-gray-50 border rounded-lg space-y-1 relative">
                  <input
                    type="text"
                    value={it.description}
                    onChange={(e) => {
                      const desc = e.target.value;
                      const updated = invoice.items.map(item => item.id === it.id ? { ...item, description: desc } : item);
                      updateInvoiceCalculations(updated, invoice.tax_rate, invoice.discount_amount, invoice.amount_paid);
                    }}
                    className="w-full p-1 text-xs border rounded bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={it.quantity}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        const updated = invoice.items.map(item => item.id === it.id ? { ...item, quantity: q, amount: q * item.unitPrice } : item);
                        updateInvoiceCalculations(updated, invoice.tax_rate, invoice.discount_amount, invoice.amount_paid);
                      }}
                      placeholder="Qty"
                      className="p-1 text-xs border rounded bg-white"
                    />
                    <input
                      type="number"
                      value={it.unitPrice}
                      onChange={(e) => {
                        const p = Number(e.target.value);
                        const updated = invoice.items.map(item => item.id === it.id ? { ...item, unitPrice: p, amount: item.quantity * p } : item);
                        updateInvoiceCalculations(updated, invoice.tax_rate, invoice.discount_amount, invoice.amount_paid);
                      }}
                      placeholder="Price (₦)"
                      className="p-1 text-xs border rounded bg-white"
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">VAT Tax Rate (%)</label>
                  <input
                    type="number"
                    value={invoice.tax_rate}
                    onChange={(e) => updateInvoiceCalculations(invoice.items, Number(e.target.value), invoice.discount_amount, invoice.amount_paid)}
                    className="w-full p-1 text-xs border rounded"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Discount (₦)</label>
                  <input
                    type="number"
                    value={invoice.discount_amount}
                    onChange={(e) => updateInvoiceCalculations(invoice.items, invoice.tax_rate, Number(e.target.value), invoice.amount_paid)}
                    className="w-full p-1 text-xs border rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {docType === 'receipt' && (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase">Payment Description</label>
                <input
                  type="text"
                  value={receipt.description}
                  onChange={(e) => setReceipt(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 text-xs border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Amount Paid (₦)</label>
                  <input
                    type="number"
                    value={receipt.amount_paid}
                    onChange={(e) => setReceipt(prev => ({ ...prev, amount_paid: Number(e.target.value) }))}
                    className="w-full p-2 text-xs border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Payment Method</label>
                  <input
                    type="text"
                    value={receipt.payment_method}
                    onChange={(e) => setReceipt(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full p-2 text-xs border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-600 uppercase">Transaction Reference</label>
                <input
                  type="text"
                  value={receipt.transaction_ref || ''}
                  onChange={(e) => setReceipt(prev => ({ ...prev, transaction_ref: e.target.value }))}
                  className="w-full p-2 text-xs border rounded-lg font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Live Document Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-700 capitalize">{docType} Official A4 Document</span>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 border"
                title="Print"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>

          {/* Printable Document Canvas */}
          <div className="bg-slate-100 p-4 rounded-2xl border border-gray-200 flex justify-center overflow-x-auto">
            <div
              id="business-doc-printable"
              className="bg-white p-8 sm:p-12 shadow-xl rounded-lg w-[210mm] min-h-[297mm] text-gray-900 font-sans leading-relaxed text-xs space-y-6"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-6">
                <div>
                  <h2 className="text-xl font-black text-blue-900">{sender.name}</h2>
                  <p className="text-gray-600 mt-1">{sender.address}</p>
                  <p className="text-gray-600">{sender.phone} • {sender.email}</p>
                  {sender.taxId && <p className="text-gray-500 font-mono text-[10px]">TIN: {sender.taxId}</p>}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black uppercase text-gray-900 tracking-wider block">
                    {docType}
                  </span>
                  <span className="font-mono text-xs font-bold text-blue-600">
                    {docType === 'invoice' && invoice.invoice_number}
                    {docType === 'receipt' && receipt.receipt_number}
                    {docType === 'proposal' && proposal.proposal_number}
                    {docType === 'delivery' && deliveryNote.delivery_note_number}
                  </span>
                  <p className="text-gray-500 mt-1 text-[11px]">
                    Date: {new Date().toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>

              {/* Billed To / Recipient */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  {docType === 'receipt' ? 'Received From:' : 'Billed / Delivered To:'}
                </span>
                <p className="font-bold text-gray-900 text-sm">{client.name}</p>
                <p className="text-gray-600 text-xs">{client.address}</p>
                <p className="text-gray-600 text-xs">{client.phone} • {client.email}</p>
              </div>

              {/* 1. INVOICE PREVIEW TABLE */}
              {docType === 'invoice' && (
                <div className="space-y-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-900 text-gray-900 font-bold uppercase text-[10px]">
                        <th className="py-2">Description</th>
                        <th className="py-2 text-center w-16">Qty</th>
                        <th className="py-2 text-right w-28">Unit Price</th>
                        <th className="py-2 text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoice.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-2.5 font-medium">{it.description}</td>
                          <td className="py-2.5 text-center">{it.quantity}</td>
                          <td className="py-2.5 text-right font-mono">₦{it.unitPrice.toLocaleString()}</td>
                          <td className="py-2.5 text-right font-bold font-mono">₦{it.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Calculation Box */}
                  <div className="flex justify-end pt-4">
                    <div className="w-64 space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">₦{invoice.subtotal.toLocaleString()}</span>
                      </div>
                      {invoice.discount_amount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Discount:</span>
                          <span className="font-mono">-₦{invoice.discount_amount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600">
                        <span>VAT ({invoice.tax_rate}%):</span>
                        <span className="font-mono">₦{invoice.tax_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-gray-900 border-t pt-1.5">
                        <span>Total Due:</span>
                        <span className="font-mono text-blue-900">₦{invoice.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Amount Paid:</span>
                        <span className="font-mono">₦{invoice.amount_paid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-black text-sm text-red-700 border-t pt-1.5 bg-red-50 p-1.5 rounded">
                        <span>Balance Due:</span>
                        <span className="font-mono">₦{invoice.balance_due.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  {sender.bankDetails && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
                      <span className="font-bold text-blue-900 block mb-1">Bank Payment Instructions:</span>
                      <p>Bank: <strong>{sender.bankDetails.bankName}</strong></p>
                      <p>Account Name: <strong>{sender.bankDetails.accountName}</strong></p>
                      <p>Account Number: <strong className="font-mono text-blue-900">{sender.bankDetails.accountNumber}</strong></p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. RECEIPT PREVIEW */}
              {docType === 'receipt' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Amount Paid in Full / Part
                    </span>
                    <h3 className="text-3xl font-black text-emerald-950 font-mono">
                      ₦{receipt.amount_paid.toLocaleString()}
                    </h3>
                    {receipt.is_platform_verified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Platform Verified Transaction
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-gray-500 block">Payment Method:</span>
                      <p className="font-semibold text-gray-900">{receipt.payment_method}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 block">Transaction Reference:</span>
                      <p className="font-mono text-gray-900">{receipt.transaction_ref}</p>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-gray-500 block">Description:</span>
                    <p className="text-gray-800 mt-0.5">{receipt.description}</p>
                  </div>

                  <div className="border-t pt-4 flex justify-between items-center text-xs text-gray-500">
                    <span>Authorized Official Signatory</span>
                    <span className="font-serif italic font-bold text-gray-900">Joseph Chiemezie</span>
                  </div>
                </div>
              )}

              {/* 3. PROPOSAL PREVIEW */}
              {docType === 'proposal' && (
                <div className="space-y-4 text-xs">
                  <h3 className="text-base font-bold text-blue-900">{proposal.title}</h3>
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] mb-1">Executive Summary</h4>
                    <p className="text-gray-700 leading-relaxed">{proposal.executive_summary}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] mb-1">Proposed Solution</h4>
                    <p className="text-gray-700 leading-relaxed">{proposal.proposed_solution}</p>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-sm">
                    <span>Total Proposed Budget:</span>
                    <span className="font-mono text-blue-900">₦{proposal.total_budget.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* 4. DELIVERY NOTE PREVIEW */}
              {docType === 'delivery' && (
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span>Order Reference: <strong>{deliveryNote.order_ref}</strong></span>
                    <span>Status: <strong className="uppercase text-emerald-700">{deliveryNote.status}</strong></span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-900 font-bold uppercase text-[10px]">
                        <th className="py-2">Item</th>
                        <th className="py-2">Description</th>
                        <th className="py-2 text-center">Qty Ordered</th>
                        <th className="py-2 text-center">Qty Delivered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {deliveryNote.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-2 font-mono">{it.itemNumber}</td>
                          <td className="py-2 font-medium">{it.description}</td>
                          <td className="py-2 text-center">{it.quantityOrdered}</td>
                          <td className="py-2 text-center font-bold text-blue-800">{it.quantityDelivered}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t pt-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-gray-500 block">Received By:</span>
                      <p className="font-semibold text-gray-900">{deliveryNote.received_by_name}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 block">Receiver Signature:</span>
                      <p className="font-serif italic text-gray-900 mt-1">Confirmed Delivered</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Watermark notice */}
              {!isWatermarkFree && (
                <div className="mt-8 pt-4 border-t text-[10px] text-gray-400 text-center">
                  Created with JOEASSIST Free Starter • Upgrade to remove watermark
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
