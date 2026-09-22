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
// Cloud API Helpers
// -------------------------------------------------------------

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

export async function apiRegister(
  name: string,
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create account.');
  }

  const session: AuthSession = {
    user: data.user,
    token: data.token,
  };
  saveStoredSession(session);
  return session;
}

export async function apiLogin(email: string, password: string): Promise<AuthSession> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid email or password.');
  }

  const session: AuthSession = {
    user: data.user,
    token: data.token,
  };
  saveStoredSession(session);
  return session;
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeader(),
    });
  } catch (err) {
    console.warn('Logout network error:', err);
  } finally {
    clearStoredSession();
  }
}

export async function apiGetCurrentUser(): Promise<User | null> {
  const session = getStoredSession();
  if (!session?.token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeader(),
    });

    if (!res.ok) {
      clearStoredSession();
      return null;
    }

    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function apiForgotPassword(
  email: string
): Promise<{ success: boolean; message: string; devResetCode?: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to process forgot password request.');
  }
  return data;
}

export async function apiResetPassword(
  email: string,
  resetCode: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, resetCode, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password.');
  }
  return data;
}

// -------------------------------------------------------------
// Cloud Image Upload
// -------------------------------------------------------------
export async function apiUploadImage(imageBase64: string, filename?: string): Promise<string> {
  const res = await fetch('/api/upload/image', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ imageBase64, filename }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload medicine image.');
  }
  return data.url;
}

// -------------------------------------------------------------
// Cloud Inventory Endpoints
// -------------------------------------------------------------

export async function apiFetchInventory(): Promise<AppData> {
  const res = await fetch('/api/inventory', {
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    throw new Error('Failed to load inventory from cloud.');
  }

  const data = await res.json();
  return {
    medicines: Array.isArray(data.medicines) ? data.medicines : [],
    batches: Array.isArray(data.batches) ? data.batches : [],
    suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
    dispensingRecords: Array.isArray(data.dispensingRecords) ? data.dispensingRecords : [],
    isDemoData: false,
  };
}

export async function apiSyncInventory(data: AppData): Promise<void> {
  const res = await fetch('/api/inventory/sync', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to synchronize inventory.');
  }
}

export async function apiSaveMedicine(medicine: Medicine): Promise<Medicine> {
  const res = await fetch('/api/medicines', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(medicine),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save medicine.');
  }
  return data.medicine;
}

export async function apiDeleteMedicine(id: string): Promise<void> {
  const res = await fetch(`/api/medicines/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete medicine.');
  }
}

export async function apiSaveBatch(batch: Batch): Promise<Batch> {
  const res = await fetch('/api/batches', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(batch),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save batch.');
  }
  return data.batch;
}

export async function apiDeleteBatch(id: string): Promise<void> {
  const res = await fetch(`/api/batches/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete batch.');
  }
}

export async function apiSaveSupplier(supplier: Supplier): Promise<Supplier> {
  const res = await fetch('/api/suppliers', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(supplier),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save supplier.');
  }
  return data.supplier;
}

export async function apiDeleteSupplier(id: string): Promise<void> {
  const res = await fetch(`/api/suppliers/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete supplier.');
  }
}

export async function apiRecordDispense(
  record: DispensingRecord,
  updatedBatches: Batch[]
): Promise<DispensingRecord> {
  const res = await fetch('/api/dispense', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ record, updatedBatches }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to record dispensing transaction.');
  }
  return data.record;
}
