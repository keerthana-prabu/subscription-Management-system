/**
 * Shared API Types and Data Contracts
 * Mirroring backend Pydantic schemas for end-to-end type safety.
 */

export type UserRole = 'admin' | 'sales' | 'finance' | 'customer';

export interface UserRegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

export interface ValidationErrorItem {
  field?: string;
  message: string;
}

export interface ApiError {
  message: string;
  status: number;
  validationErrors?: ValidationErrorItem[];
}

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

export type ProductType = 'service' | 'storable' | 'consumable' | 'subscription';

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  brand?: string;
  billing_metric: string;
  base_price: string | number;
  price_adjustment?: number;
  final_price?: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  product_type?: ProductType;
  sales_price?: number | string;
  cost_price?: number | string;
  description?: string;
  is_active: boolean;
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface ProductCreatePayload {
  name: string;
  code: string;
  product_type?: ProductType;
  sales_price?: number;
  cost_price?: number;
  description?: string;
  is_active: boolean;
  variants?: Array<ProductVariantCreatePayload>;
}

export interface ProductVariantCreatePayload {
  sku: string;
  name: string;
  brand?: string;
  billing_metric: string;
  base_price: number;
  price_adjustment?: number;
  currency?: string;
  is_active?: boolean;
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

export interface QuotationTemplateCreatePayload {
  name: string;
  description?: string;
  terms_and_conditions?: string;
  default_validity_days: number;
  is_active?: boolean;
}

export type QuotationStatus = 'draft' | 'sent' | 'confirmed' | 'converted' | 'expired';

export interface QuotationLineItem {
  id: number;
  quotation_id?: number;
  product_id: number;
  product_name: string;
  variant_id?: number;
  variant_name?: string;
  sku: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_percentage: number;
  discount_percentage?: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  template_id?: number;
  template_name?: string;
  status: QuotationStatus;
  valid_until: string;
  notes?: string;
  terms_and_conditions?: string;
  currency: string;
  subtotal: number;
  tax_total: number;
  total_amount: number;
  items: QuotationLineItem[];
  converted_subscription_id?: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationCreatePayload {
  customer_id: number;
  customer_name: string;
  customer_email: string;
  template_id?: number;
  template_name?: string;
  valid_until: string;
  notes?: string;
  terms_and_conditions?: string;
  currency?: string;
  items: Array<{
    product_id: number;
    product_name: string;
    variant_id?: number;
    variant_name?: string;
    sku: string;
    quantity: number;
    unit_price: number;
    tax_percentage: number;
    discount_percentage?: number;
  }>;
}

export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type PlanBillingInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'draft' | 'active' | 'paused' | 'cancelled' | 'expired';

export interface SubscriptionItemInput {
  variant_id: number;
  quantity: number;
  unit_price?: number;
  product_name?: string;
  variant_name?: string;
  sku?: string;
}

export interface SubscriptionCreatePayload {
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  plan_id: number;
  start_date?: string;
  auto_renew?: boolean;
  payment_terms?: string;
  items?: SubscriptionItemInput[];
}

export interface SubscriptionStatusChangePayload {
  reason?: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description?: string;
  billing_cycle: BillingCycle;
  billing_interval?: PlanBillingInterval;
  billing_interval_count: number;
  base_price: string | number;
  price?: number;
  min_quantity?: number;
  currency: string;
  trial_period_days: number;
  start_date?: string;
  end_date?: string;
  auto_close?: boolean;
  early_close_allowed?: boolean;
  pause_allowed?: boolean;
  auto_renew?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanCreatePayload {
  name: string;
  code: string;
  description?: string;
  billing_cycle?: BillingCycle;
  billing_interval?: PlanBillingInterval;
  billing_interval_count: number;
  base_price: number;
  min_quantity?: number;
  currency?: string;
  trial_period_days?: number;
  start_date?: string;
  end_date?: string;
  auto_close?: boolean;
  early_close_allowed?: boolean;
  pause_allowed?: boolean;
  auto_renew?: boolean;
  is_active: boolean;
}

export interface SubscriptionItem {
  id: number;
  subscription_id: number;
  variant_id: number;
  quantity: number;
  unit_price: string | number;
  product_name?: string;
  variant_name?: string;
  sku?: string;
  subtotal?: number;
}

export interface SubscriptionLifecycleEvent {
  state: string;
  timestamp: string;
  note?: string;
  performed_by?: string;
}

export interface Subscription {
  id: number;
  subscription_number?: string;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  plan_id: number;
  plan_name?: string;
  plan_code?: string;
  billing_interval?: PlanBillingInterval;
  billing_cycle?: BillingCycle;
  status: SubscriptionStatus;
  start_date: string;
  current_period_start: string;
  current_period_end: string;
  next_billing_date?: string;
  trial_end?: string;
  paused_at?: string;
  cancelled_at?: string;
  auto_renew: boolean;
  payment_terms?: string;
  currency?: string;
  subtotal?: number;
  tax_total?: number;
  total_amount?: number;
  items: SubscriptionItem[];
  related_quotation_id?: number;
  related_invoice_id?: number;
  lifecycle_history?: SubscriptionLifecycleEvent[];
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'draft' | 'posted' | 'paid' | 'void' | 'uncollectible';
export type DiscountType = 'percentage' | 'fixed_amount';

export interface TaxRate {
  id: number;
  name: string;
  rate_percentage: string | number;
  country: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TaxRateCreatePayload {
  name: string;
  rate_percentage: number;
  country: string;
  is_active?: boolean;
}

export interface Discount {
  id: number;
  code: string;
  name?: string;
  discount_type: DiscountType;
  amount: string | number;
  min_purchase_amount?: number;
  min_quantity?: number;
  valid_from?: string;
  valid_until?: string;
  max_uses?: number;
  usage_count?: number;
  applies_to?: 'all' | 'products' | 'subscriptions';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DiscountCreatePayload {
  code: string;
  name?: string;
  discount_type: DiscountType;
  amount: number;
  min_purchase_amount?: number;
  min_quantity?: number;
  valid_from?: string | null;
  valid_until?: string | null;
  max_uses?: number | null;
  applies_to?: 'all' | 'products' | 'subscriptions';
  is_active?: boolean;
}

export interface InvoiceLineItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: string | number;
  tax_rate_id?: number | null;
  tax_percentage?: number;
  tax_amount: string | number;
  subtotal: string | number;
  total_amount: string | number;
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate_id?: number | null;
}

export interface InvoiceCreatePayload {
  customer_id: number;
  subscription_id?: number | null;
  currency?: string;
  due_date: string;
  items: InvoiceLineItemInput[];
  discount_code?: string | null;
  customer_name?: string;
  customer_email?: string;
  payment_terms?: string;
  notes?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  subscription_id?: number;
  subscription_number?: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: string | number;
  discount_total: string | number;
  tax_total: string | number;
  total_amount: string | number;
  amount_paid?: string | number;
  due_date: string;
  paid_at?: string;
  payment_terms?: string;
  notes?: string;
  items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PaymentMethod = 'credit_card' | 'bank_transfer' | 'manual';

export interface Payment {
  id: number;
  invoice_id: number;
  invoice_number?: string;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  failure_reason?: string;
  notes?: string;
  paid_at?: string;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentCreatePayload {
  invoice_id: number;
  amount: number;
  currency?: string;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  notes?: string;
  payment_date?: string;
}

export interface PaymentRefundPayload {
  reason: string;
}

export interface SubscriptionStatusCount {
  status: string;
  count: number;
}

export interface SubscriptionReport {
  total_count: number;
  by_status: SubscriptionStatusCount[];
  by_plan: Record<string, number>;
}

export interface MRRReport {
  total_mrr: string | number;
  arr: string | number;
  currency: string;
  active_subscriptions: number;
  churn_rate_percentage: string | number;
}

export interface RevenueTimeSeriesPoint {
  period: string;
  gross_revenue: string | number;
  net_revenue: string | number;
  tax_collected: string | number;
  discounts_given: string | number;
  currency: string;
}

export interface RevenueReport {
  start_date: string;
  end_date: string;
  currency: string;
  total_gross_revenue: string | number;
  total_net_revenue: string | number;
  total_tax_collected: string | number;
  total_refunds: string | number;
  breakdown_by_period: RevenueTimeSeriesPoint[];
}
