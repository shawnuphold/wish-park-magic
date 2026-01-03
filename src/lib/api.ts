// API configuration and utilities
// Uses relative URLs (same-origin) by default

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const apiEndpoints = {
  // Request endpoints
  submitRequest: `${API_BASE}/wp-json/enchanted/v1/requests`,
  getRequest: (id: string) => `${API_BASE}/wp-json/enchanted/v1/requests/${id}`,
  
  // Portal endpoints
  getMyRequests: `${API_BASE}/wp-json/enchanted/v1/portal/me/requests`,
  sendLookupCode: `${API_BASE}/wp-json/enchanted/v1/portal/lookup/send-code`,
  verifyLookupCode: `${API_BASE}/wp-json/enchanted/v1/portal/lookup/verify-code`,
  
  // Inventory endpoints
  getInventory: `${API_BASE}/wp-json/enchanted/v1/inventory`,
  submitBuyRequest: (id: string) => `${API_BASE}/wp-json/enchanted/v1/inventory/${id}/buy-request`,
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      credentials: 'include', // Include cookies for auth
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Request failed with status ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

// Request types
export interface RequestFormData {
  fullName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  park: string;
  timeSensitive: boolean;
  neededByDate?: string;
  itemDescription: string;
  referenceUrls?: string;
  images?: File[];
}

export interface RequestSubmissionResponse {
  request_id: string;
  message: string;
}

export interface RequestDetails {
  id: string;
  date: string;
  park: string;
  status: string;
  needed_by?: string;
  full_name: string;
  email: string;
  phone: string;
  shipping_address: string;
  item_description: string;
  reference_urls?: string;
  time_sensitive: boolean;
  images?: string[];
}

// Inventory types
export interface InventoryItem {
  id: string;
  title: string;
  price: number;
  image: string;
  park: string;
  description?: string;
}

export interface BuyRequestFormData {
  name: string;
  email: string;
  phone: string;
  message?: string;
}
