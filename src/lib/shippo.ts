// Shippo Shipping API integration

const SHIPPO_API_BASE = 'https://api.goshippo.com';

interface ShippoAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

interface ShippoParcel {
  length: string;
  width: string;
  height: string;
  distance_unit: 'in' | 'cm';
  weight: string;
  mass_unit: 'lb' | 'kg' | 'oz' | 'g';
}

export interface ShippoRate {
  object_id: string;
  provider: string;
  servicelevel: {
    name: string;
    token: string;
  };
  amount: string;
  currency: string;
  estimated_days: number;
  duration_terms: string;
}

export interface ShippoShipment {
  object_id: string;
  status: string;
  address_from: ShippoAddress;
  address_to: ShippoAddress;
  parcels: ShippoParcel[];
  rates: ShippoRate[];
}

export interface ShippoTransaction {
  object_id: string;
  status: string;
  tracking_number: string;
  tracking_url_provider: string;
  label_url: string;
  commercial_invoice_url?: string;
  rate: string;
  messages: Array<{ text: string }>;
}

async function shippoRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiToken = process.env.SHIPPO_API_TOKEN;
  if (!apiToken) {
    throw new Error('Shippo API token not configured');
  }

  const response = await fetch(`${SHIPPO_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `ShippoToken ${apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.message || 'Shippo API error');
  }

  return response.json();
}

export async function createShipment(
  addressFrom: ShippoAddress,
  addressTo: ShippoAddress,
  parcel: ShippoParcel
): Promise<ShippoShipment> {
  return shippoRequest<ShippoShipment>('/shipments/', {
    method: 'POST',
    body: JSON.stringify({
      address_from: addressFrom,
      address_to: addressTo,
      parcels: [parcel],
      async: false,
    }),
  });
}

export async function getRates(shipmentId: string): Promise<ShippoRate[]> {
  const response = await shippoRequest<{ results: ShippoRate[] }>(
    `/shipments/${shipmentId}/rates/`
  );
  return response.results;
}

export async function purchaseLabel(
  rateId: string,
  labelFormat: 'PDF' | 'PNG' | 'ZPL' = 'PDF'
): Promise<ShippoTransaction> {
  return shippoRequest<ShippoTransaction>('/transactions/', {
    method: 'POST',
    body: JSON.stringify({
      rate: rateId,
      label_file_type: labelFormat,
      async: false,
    }),
  });
}

export async function getTransaction(transactionId: string): Promise<ShippoTransaction> {
  return shippoRequest<ShippoTransaction>(`/transactions/${transactionId}/`);
}

export async function validateAddress(address: ShippoAddress): Promise<{
  is_valid: boolean;
  messages: Array<{ text: string; source: string }>;
}> {
  const response = await shippoRequest<any>('/addresses/', {
    method: 'POST',
    body: JSON.stringify({
      ...address,
      validate: true,
    }),
  });

  return {
    is_valid: response.validation_results?.is_valid ?? false,
    messages: response.validation_results?.messages ?? [],
  };
}

// Tracking webhook handler types
export interface TrackingUpdate {
  tracking_number: string;
  carrier: string;
  tracking_status: {
    status: string;
    status_date: string;
    status_details: string;
    location: {
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  };
  tracking_history: Array<{
    status: string;
    status_date: string;
    status_details: string;
    location: {
      city: string;
      state: string;
    };
  }>;
}

export async function registerTrackingWebhook(
  carrier: string,
  trackingNumber: string,
  webhookUrl: string
): Promise<void> {
  await shippoRequest('/tracks/', {
    method: 'POST',
    body: JSON.stringify({
      carrier,
      tracking_number: trackingNumber,
      metadata: webhookUrl,
    }),
  });
}

// Default from address (can be configured in settings)
export function getDefaultFromAddress(): ShippoAddress {
  return {
    name: process.env.SHIPPO_FROM_NAME || 'Enchanted Park Pickups',
    street1: process.env.SHIPPO_FROM_STREET1 || '',
    street2: process.env.SHIPPO_FROM_STREET2,
    city: process.env.SHIPPO_FROM_CITY || 'Orlando',
    state: process.env.SHIPPO_FROM_STATE || 'FL',
    zip: process.env.SHIPPO_FROM_ZIP || '',
    country: 'US',
    phone: process.env.SHIPPO_FROM_PHONE,
    email: process.env.SHIPPO_FROM_EMAIL,
  };
}

// Common parcel presets
export const PARCEL_PRESETS = {
  small: {
    name: 'Small Box',
    length: '8',
    width: '6',
    height: '4',
    distance_unit: 'in' as const,
    weight: '1',
    mass_unit: 'lb' as const,
  },
  medium: {
    name: 'Medium Box',
    length: '12',
    width: '10',
    height: '6',
    distance_unit: 'in' as const,
    weight: '2',
    mass_unit: 'lb' as const,
  },
  large: {
    name: 'Large Box',
    length: '16',
    width: '12',
    height: '8',
    distance_unit: 'in' as const,
    weight: '5',
    mass_unit: 'lb' as const,
  },
  padded_envelope: {
    name: 'Padded Envelope',
    length: '10',
    width: '7',
    height: '1',
    distance_unit: 'in' as const,
    weight: '0.5',
    mass_unit: 'lb' as const,
  },
};
