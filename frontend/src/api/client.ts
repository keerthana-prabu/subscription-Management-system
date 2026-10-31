/**
 * Centralized API client for Brightloop Subscription Management System.
 * Shared contract client for frontend developer (Member 1).
 */

import type {
  HealthResponse,
  TokenResponse,
  User,
  Product,
  SubscriptionPlan,
  Subscription,
  Invoice,
  Payment,
  MRRReport,
  RevenueReport,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorBody.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Health Endpoint
  health = {
    check: (): Promise<HealthResponse> => this.request<HealthResponse>('/health'),
  };

  // Auth Endpoints (Member 2)
  auth = {
    register: (data: unknown): Promise<User> =>
      this.request<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: unknown): Promise<TokenResponse> =>
      this.request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    getMe: (): Promise<User> => this.request<User>('/auth/me'),
  };

  // Catalog Endpoints (Member 2)
  catalog = {
    getProducts: (): Promise<Product[]> => this.request<Product[]>('/catalog/products'),
  };

  // Subscriptions Endpoints (Member 3)
  subscriptions = {
    getPlans: (): Promise<SubscriptionPlan[]> => this.request<SubscriptionPlan[]>('/subscriptions/plans'),
    getSubscriptions: (): Promise<Subscription[]> => this.request<Subscription[]>('/subscriptions/subscriptions'),
  };

  // Billing Endpoints (Member 3)
  billing = {
    getInvoices: (): Promise<Invoice[]> => this.request<Invoice[]>('/billing/invoices'),
  };

  // Payments Endpoints (Member 4)
  payments = {
    createPayment: (data: unknown): Promise<Payment> =>
      this.request<Payment>('/payments/payments', { method: 'POST', body: JSON.stringify(data) }),
  };

  // Financial Reports Endpoints (Member 4)
  reports = {
    getMRR: (): Promise<MRRReport> => this.request<MRRReport>('/reports/mrr'),
    getRevenue: (): Promise<RevenueReport> => this.request<RevenueReport>('/reports/revenue'),
  };
}

export const api = new ApiClient();
