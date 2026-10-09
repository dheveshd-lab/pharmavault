import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'pharmavault_supabase_url';
const STORAGE_KEY_KEY = 'pharmavault_supabase_anon_key';

export interface SupabaseConfigStatus {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'custom' | 'none';
}

export function getSupabaseConfig(): SupabaseConfigStatus {
  // 1. Check custom localStorage overrides first
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  if (customUrl && customKey && isValidSupabaseUrl(customUrl)) {
    return {
      url: customUrl.trim(),
      anonKey: customKey.trim(),
      isConfigured: true,
      source: 'custom',
    };
  }

  // 2. Check Vite environment variables
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (envUrl && envKey && isValidSupabaseUrl(envUrl) && !envUrl.includes('your-project-ref')) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  return {
    url: envUrl || '',
    anonKey: envKey || '',
    isConfigured: false,
    source: 'none',
  };
}

export function isValidSupabaseUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
}

export function resetSupabaseClient(): void {
  clientInstance = null;
}

export function setCustomSupabaseConfig(url: string, anonKey: string): boolean {
  if (!isValidSupabaseUrl(url) || !anonKey.trim()) {
    return false;
  }
  localStorage.setItem(STORAGE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  resetSupabaseClient();
  return true;
}

export function clearCustomSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_KEY_KEY);
  resetSupabaseClient();
}
