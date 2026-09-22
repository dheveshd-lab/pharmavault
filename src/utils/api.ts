import { AppData, AuthSession, Batch, DispensingRecord, Medicine, Supplier, User } from '../types';

const AUTH_STORAGE_KEY = 'pharmavault_auth_session';

// -------------------------------------------------------------
// Token & Session Storage
// -------------------------------------------------------------

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.token && parsed.user) {
      return parsed as AuthSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: AuthSession): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to store session in localStorage:', err);
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session from localStorage:', err);
  }
}

// -------------------------------------------------------------
// API URL & Safe Request Helpers
// -------------------------------------------------------------

// Optional custom API URL; defaults to empty string '' for same-project Vercel deployments.
// Resulting fetch calls use relative paths: `${API_URL}/api/auth/login` -> '/api/auth/login'
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  return API_URL;
}

function getAuthHeader(): Record<string, string> {
  const session = getStoredSession();
  if (session?.token) {
    return {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json',
    };
  }
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Robust fetch wrapper that strictly checks response content-type, status,
 * and URL before attempting JSON parsing. Never throws unexpected token JSON errors on HTML.
 */
export async function safeApiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(fullUrl, options);
  } catch (networkErr: any) {
    throw new Error(
      `Network error: Unable to connect to server at ${fullUrl}. Please check your connection or backend URL.`
    );
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let errorMessage = '';

    if (isJson) {
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorData.message || '';
      } catch {
        // Fall through to text handling if JSON parsing fails
      }
    }

    if (!errorMessage) {
      try {
        const text = await res.text();
        const trimmed = text.trim();
        // Check for HTML document or standard Vercel / server 404 / 502 pages
        if (
          trimmed.startsWith('<!DOCTYPE') ||
          trimmed.startsWith('<html') ||
          trimmed.startsWith('The page') ||
          trimmed.includes('<body')
        ) {
          if (res.status === 404) {
            errorMessage = `Service endpoint not found (404) at ${fullUrl}. If deployed on Vercel, ensure VITE_API_URL or serverless functions are configured.`;
          } else if (res.status === 502 || res.status === 503 || res.status === 504) {
            errorMessage = `Server temporarily unavailable (${res.status}). Please try again shortly.`;
          } else {
            errorMessage = `Server returned an HTML error response (HTTP ${res.status}).`;
          }
        } else {
          errorMessage = trimmed.slice(0, 250) || `Request failed with status ${res.status}.`;
        }
      } catch {
        errorMessage = `Request failed with status ${res.status}.`;
      }
    }

    throw new Error(errorMessage || `Request failed with status ${res.status}.`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  // Handle expected JSON responses
  if (isJson) {
    try {
      return (await res.json()) as T;
    } catch {
      throw new Error('Server returned an invalid JSON response.');
    }
  }

  // Fallback for non-JSON OK responses
  const rawText = await res.text();
  try {
    return JSON.parse(rawText) as T;
  } catch {
    return rawText as unknown as T;
  }
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

export async function apiRegister(
  name: string,
  email: string,
  password: string
): Promise<AuthSession> {
  const data = await safeApiFetch<{ user: User; token: string }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const session: AuthSession = {
    user: data.user,
    token: data.token,
  };
  saveStoredSession(session);
  return session;
}

export async function apiLogin(email: string, password: string): Promise<AuthSession> {
  const data = await safeApiFetch<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const session: AuthSession = {
    user: data.user,
    token: data.token,
  };
  saveStoredSession(session);
  return session;
}

export async function apiLogout(): Promise<void> {
  try {
    await safeApiFetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeader(),
    });
  } catch (err) {
    console.warn('Logout network notice:', err);
  } finally {
    clearStoredSession();
  }
}

export async function apiGetCurrentUser(): Promise<User | null> {
  const session = getStoredSession();
  if (!session?.token) return null;

  try {
    const data = await safeApiFetch<{ user: User }>('/api/auth/me', {
      headers: getAuthHeader(),
    });
    return data?.user || null;
  } catch {
    clearStoredSession();
    return null;
  }
}

export async function apiForgotPassword(
  email: string
): Promise<{ success: boolean; message: string; devResetCode?: string }> {
  return safeApiFetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function apiResetPassword(
  email: string,
  resetCode: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  return safeApiFetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetCode, newPassword }),
  });
}

// -------------------------------------------------------------
// Cloud Image Upload
// -------------------------------------------------------------
export async function apiUploadImage(imageBase64: string, filename?: string): Promise<string> {
  const data = await safeApiFetch<{ url: string }>('/api/upload/image', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ imageBase64, filename }),
  });
  return data.url;
}

// -------------------------------------------------------------
// Cloud Inventory Endpoints
// -------------------------------------------------------------

export async function apiFetchInventory(): Promise<AppData> {
  const data = await safeApiFetch<any>('/api/inventory', {
    headers: getAuthHeader(),
  });

  return {
    medicines: Array.isArray(data.medicines) ? data.medicines : [],
    batches: Array.isArray(data.batches) ? data.batches : [],
    suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
    dispensingRecords: Array.isArray(data.dispensingRecords) ? data.dispensingRecords : [],
    isDemoData: false,
  };
}

export async function apiSyncInventory(data: AppData): Promise<void> {
  await safeApiFetch('/api/inventory/sync', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });
}

export async function apiSaveMedicine(medicine: Medicine): Promise<Medicine> {
  const data = await safeApiFetch<{ medicine: Medicine }>('/api/medicines', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(medicine),
  });
  return data.medicine;
}

export async function apiDeleteMedicine(id: string): Promise<void> {
  await safeApiFetch(`/api/medicines/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
}

export async function apiSaveBatch(batch: Batch): Promise<Batch> {
  const data = await safeApiFetch<{ batch: Batch }>('/api/batches', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(batch),
  });
  return data.batch;
}

export async function apiDeleteBatch(id: string): Promise<void> {
  await safeApiFetch(`/api/batches/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
}

export async function apiSaveSupplier(supplier: Supplier): Promise<Supplier> {
  const data = await safeApiFetch<{ supplier: Supplier }>('/api/suppliers', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(supplier),
  });
  return data.supplier;
}

export async function apiDeleteSupplier(id: string): Promise<void> {
  await safeApiFetch(`/api/suppliers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
}

export async function apiRecordDispense(
  record: DispensingRecord,
  updatedBatches: Batch[]
): Promise<DispensingRecord> {
  const data = await safeApiFetch<{ record: DispensingRecord }>('/api/dispense', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ record, updatedBatches }),
  });
  return data.record;
}
