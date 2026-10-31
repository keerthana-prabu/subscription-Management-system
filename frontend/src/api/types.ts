/**
 * Shared API Types and Data Contracts
 * Mirroring backend Pydantic schemas for end-to-end type safety.
 */

export type UserRole = 'admin' | 'sales' | 'finance' | 'customer';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  service: string;
  environment: string;
  timestamp: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  billing_metric: string;
  base_price: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface QuotationTemplate {
  id: number;
  name: string;
  description?: string;
  terms_and_conditions?: string;
  default_validity_days: number;
  created_by_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type SubscriptionStatus = 'draft' | 'active' | 'paused' | 'cancelled' | 'expired';

export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description?: string;
  billing_cycle: BillingCycle;
  billing_interval_count: number;
  base_price: string;
  currency: string;
  trial_period_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionItem {
  id: number;
  subscription_id: number;
  variant_id: number;
  quantity: number;
  unit_price: string;
}

export interface Subscription {
  id: number;
  customer_id: number;
  plan_id: number;
  status: SubscriptionStatus;
  start_date: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  paused_at?: string;
  cancelled_at?: string;
  auto_renew: boolean;
  items: SubscriptionItem[];
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'posted' | 'paid' | 'void' | 'uncollectible';
export type DiscountType = 'percentage' | 'fixed_amount';

export interface TaxRate {
  id: number;
  name: string;
  rate_percentage: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: number;
  code: string;
  discount_type: DiscountType;
  amount: string;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate_id?: number;
  tax_amount: string;
  subtotal: string;
  total_amount: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  subscription_id?: number;
  status: InvoiceStatus;
  currency: string;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total_amount: string;
  due_date: string;
  paid_at?: string;
  items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PaymentMethod = 'credit_card' | 'bank_transfer' | 'manual';

export interface Payment {
  id: number;
  invoice_id: number;
  amount: string;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  failure_reason?: string;
  paid_at?: string;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MRRReport {
  total_mrr: string;
  arr: string;
  currency: string;
  active_subscriptions: number;
  churn_rate_percentage: string;
}

export interface RevenueReport {
  start_date: string;
  end_date: string;
  currency: string;
  total_gross_revenue: string;
  total_net_revenue: string;
  total_tax_collected: string;
  total_refunds: string;
  breakdown_by_period: Array<{
    period: string;
    gross_revenue: string;
    net_revenue: string;
    tax_collected: string;
    discounts_given: string;
    currency: string;
  }>;
}
