// Business Document Types for JOEASSIST

export interface BusinessEntity {
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  logoUrl?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    sortCode?: string;
  };
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDocument {
  id: string;
  user_id?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  sender: BusinessEntity;
  recipient: BusinessEntity;
  items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  payment_terms?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface ReceiptDocument {
  id: string;
  user_id?: string;
  invoice_id?: string;
  receipt_number: string;
  payment_date: string;
  payer: BusinessEntity;
  recipient: BusinessEntity;
  payment_method: string;
  transaction_ref?: string;
  description: string;
  amount_paid: number;
  currency: string;
  balance_remaining: number;
  is_platform_verified: boolean;
  authorized_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProposalDeliverable {
  id: string;
  title: string;
  description: string;
}

export interface ProposalTimelinePhase {
  id: string;
  phase: string;
  duration: string;
  deliverables: string;
}

export interface ProposalPricingItem {
  id: string;
  item: string;
  cost: number;
}

export interface ProposalDocument {
  id: string;
  user_id?: string;
  proposal_number: string;
  title: string;
  sender: BusinessEntity;
  client: BusinessEntity;
  executive_summary: string;
  client_needs: string;
  proposed_solution: string;
  deliverables: ProposalDeliverable[];
  timeline: ProposalTimelinePhase[];
  pricing_breakdown: ProposalPricingItem[];
  total_budget: number;
  currency: string;
  terms_and_conditions: string;
  assumptions_exclusions: string;
  signature_name: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryNoteItem {
  id: string;
  itemNumber: string;
  description: string;
  quantityOrdered: number;
  quantityDelivered: number;
  unit: string;
  remarks?: string;
}

export interface DeliveryNoteDocument {
  id: string;
  user_id?: string;
  delivery_note_number: string;
  order_ref?: string;
  delivery_date: string;
  sender: BusinessEntity;
  recipient: BusinessEntity;
  delivery_address: string;
  items: DeliveryNoteItem[];
  delivery_instructions?: string;
  received_by_name?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'returned';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CoverLetterDocument {
  id: string;
  user_id?: string;
  cv_id?: string;
  title: string;
  target_job_title: string;
  company_name: string;
  hiring_manager_name?: string;
  job_description?: string;
  tone: string;
  length: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface ATSAuditResult {
  id: string;
  user_id?: string;
  cv_id?: string;
  target_job_title: string;
  job_description: string;
  overall_score: number;
  keyword_score: number;
  experience_score: number;
  education_score: number;
  formatting_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  warnings: string[];
  recommendations: string[];
  tailored_suggestions: string[];
  created_at?: string;
}
