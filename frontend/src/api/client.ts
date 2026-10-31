/**
 * Centralized API client for Brightloop Subscription Management System.
 * Shared contract client with robust error parsing, token persistence, and 401 handling.
 */

import type {
  HealthResponse,
  TokenResponse,
  User,
  UserRegisterPayload,
  UserLoginPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ValidationErrorItem,
  Product,
  ProductCreatePayload,
  ProductVariant,
  ProductVariantCreatePayload,
  SubscriptionPlan,
  SubscriptionPlanCreatePayload,
  Subscription,
  Invoice,
  Payment,
  MRRReport,
  RevenueReport,
} from './types';

export class ApiClientError extends Error {
  status: number;
  validationErrors?: ValidationErrorItem[];

  constructor(message: string, status: number, validationErrors?: ValidationErrorItem[]) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private token: string | null = null;
  private onUnauthorizedCallback?: () => void;

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

  onUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
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

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError: unknown) {
      const msg = networkError instanceof Error ? networkError.message : 'Network error';
      throw new ApiClientError(
        `Unable to reach Brightloop API server. Please ensure the backend is running. (${msg})`,
        0
      );
    }

    if (!response.ok) {
      if (response.status === 401 && this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback();
      }

      let errorMsg = `Request failed with status ${response.status}`;
      let validationErrors: ValidationErrorItem[] | undefined;

      try {
        const errorBody = await response.json();
        if (typeof errorBody.detail === 'string') {
          errorMsg = errorBody.detail;
        } else if (Array.isArray(errorBody.detail)) {
          // FastAPI / Pydantic validation error schema
          validationErrors = errorBody.detail.map((item: { loc?: string[]; msg?: string }) => {
            const field = item.loc ? item.loc[item.loc.length - 1] : undefined;
            return {
              field: typeof field === 'string' ? field : undefined,
              message: item.msg || 'Invalid field value',
            };
          });
          errorMsg = validationErrors.map((v) => (v.field ? `${v.field}: ${v.message}` : v.message)).join('; ');
        } else if (errorBody.message) {
          errorMsg = errorBody.message;
        }
      } catch {
        errorMsg = response.statusText || errorMsg;
      }

      throw new ApiClientError(errorMsg, response.status, validationErrors);
    }

    return response.json();
  }

  // Health Endpoint
  health = {
    check: (): Promise<HealthResponse> => this.request<HealthResponse>('/health'),
  };

  // Auth Endpoints (Member 2)
  auth = {
    register: (data: UserRegisterPayload): Promise<User> =>
      this.request<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: UserLoginPayload): Promise<TokenResponse> =>
      this.request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    getMe: (): Promise<User> => this.request<User>('/auth/me'),
    forgotPassword: (data: ForgotPasswordPayload): Promise<{ message: string }> =>
      this.request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resetPassword: (data: ResetPasswordPayload): Promise<{ message: string }> =>
      this.request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Catalog Endpoints (Member 2)
  catalog = {
    getProducts: (): Promise<Product[]> => this.request<Product[]>('/catalog/products'),
    getProduct: (id: number): Promise<Product> => this.request<Product>(`/catalog/products/${id}`),
    createProduct: (data: ProductCreatePayload): Promise<Product> =>
      this.request<Product>('/catalog/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id: number, data: Partial<ProductCreatePayload>): Promise<Product> =>
      this.request<Product>(`/catalog/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id: number): Promise<{ success: boolean; message?: string }> =>
      this.request<{ success: boolean; message?: string }>(`/catalog/products/${id}`, { method: 'DELETE' }),
    createVariant: (productId: number, data: ProductVariantCreatePayload): Promise<ProductVariant> =>
      this.request<ProductVariant>(`/catalog/products/${productId}/variants`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Subscriptions Endpoints (Member 3)
  subscriptions = {
    getPlans: (): Promise<SubscriptionPlan[]> => this.request<SubscriptionPlan[]>('/subscriptions/plans'),
    getPlan: (id: number): Promise<SubscriptionPlan> => this.request<SubscriptionPlan>(`/subscriptions/plans/${id}`),
    createPlan: (data: SubscriptionPlanCreatePayload): Promise<SubscriptionPlan> =>
      this.request<SubscriptionPlan>('/subscriptions/plans', { method: 'POST', body: JSON.stringify(data) }),
    updatePlan: (id: number, data: Partial<SubscriptionPlanCreatePayload>): Promise<SubscriptionPlan> =>
      this.request<SubscriptionPlan>(`/subscriptions/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePlan: (id: number): Promise<{ success: boolean; message?: string }> =>
      this.request<{ success: boolean; message?: string }>(`/subscriptions/plans/${id}`, { method: 'DELETE' }),
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
