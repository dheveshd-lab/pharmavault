import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured, getSupabaseConfig, SupabaseConfigStatus } from '../utils/supabaseClient';
import { UserProfile } from '../types';
import { fetchRemoteProfile, upsertRemoteProfile } from '../utils/supabaseDb';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  configStatus: SupabaseConfigStatus;
  authError: string | null;
  isSandboxMode: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName?: string, pharmacyName?: string) => Promise<{ success: boolean; error?: string; confirmationRequired?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  enableSandboxMode: () => void;
  clearAuthError: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<SupabaseConfigStatus>(() => getSupabaseConfig());
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(() => {
    // If not configured and local sandbox was chosen
    return localStorage.getItem('pharmavault_sandbox_mode') === 'true';
  });

  const loadUserProfile = useCallback(async (userId: string, userEmail?: string, userMeta?: any) => {
    try {
      const remote = await fetchRemoteProfile(userId);
      if (remote) {
        setProfile(remote);
      } else {
        // Fallback default profile
        const defaultProfile: UserProfile = {
          id: userId,
          fullName: userMeta?.full_name || userEmail?.split('@')[0] || 'Pharmacist',
          pharmacyName: userMeta?.pharmacy_name || 'PharmaVault',
          licenseNumber: '',
          phone: '',
          currency: 'INR',
          taxRatePercent: 12.0,
          createdAt: new Date().toISOString(),
        };
        setProfile(defaultProfile);
        await upsertRemoteProfile(defaultProfile);
      }
    } catch (err) {
      console.warn('Could not load user profile:', err);
    }
  }, []);

  // Initialize Auth & Listen for auth state changes
  useEffect(() => {
    const config = getSupabaseConfig();
    setConfigStatus(config);

    if (!config.isConfigured) {
      setIsLoading(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Check existing session on boot
    client.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn('Error fetching Supabase session:', error.message);
        setAuthError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        loadUserProfile(data.session.user.id, data.session.user.email, data.session.user.user_metadata);
      }
      setIsLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      console.warn('Supabase initialization failed:', err);
      setIsLoading(false);
    });

    // 2. Set up auth state change listener
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        await loadUserProfile(newSession.user.id, newSession.user.email, newSession.user.user_metadata);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (!client) {
      const msg = 'Supabase is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setIsSandboxMode(false);
        localStorage.removeItem('pharmavault_sandbox_mode');
        await loadUserProfile(data.user.id, data.user.email, data.user.user_metadata);
        return { success: true };
      }

      return { success: false, error: 'Sign in failed.' };
    } catch (err: any) {
      const msg = err?.message || 'Network error during sign in.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    pharmacyName?: string
  ): Promise<{ success: boolean; error?: string; confirmationRequired?: boolean }> => {
    setAuthError(null);
    const client = getSupabaseClient();
    if (!client) {
      const msg = 'Supabase is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName || 'Pharmacist',
            pharmacyName: pharmacyName || 'PharmaVault',
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        return { success: false, error: error.message };
      }

      if (data.user && !data.session) {
        // Email confirmation is required by Supabase project settings
        return { success: true, confirmationRequired: true };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setIsSandboxMode(false);
        localStorage.removeItem('pharmavault_sandbox_mode');
        await loadUserProfile(data.user.id, data.user.email, data.user.user_metadata);
        return { success: true };
      }

      return { success: false, error: 'Failed to create account.' };
    } catch (err: any) {
      const msg = err?.message || 'Registration error.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async (): Promise<void> => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsSandboxMode(false);
    localStorage.removeItem('pharmavault_sandbox_mode');
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send reset email.' };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!profile) return false;
    const updated: UserProfile = { ...profile, ...updates };
    setProfile(updated);
    if (user && isSupabaseConfigured()) {
      return await upsertRemoteProfile(updated);
    }
    return true;
  };

  const enableSandboxMode = () => {
    setIsSandboxMode(true);
    localStorage.setItem('pharmavault_sandbox_mode', 'true');
    setProfile({
      id: 'local-pharmacist-sandbox',
      fullName: 'Clinical Pharmacist',
      pharmacyName: 'PharmaVault Dispensary',
      licenseNumber: 'REG-PH-2026',
      phone: '+1 (555) 019-2834',
      currency: 'INR',
      taxRatePercent: 12.0,
      createdAt: new Date().toISOString(),
    });
  };

  const clearAuthError = () => setAuthError(null);

  const refreshSession = async () => {
    const config = getSupabaseConfig();
    setConfigStatus(config);
    const client = getSupabaseClient();
    if (client) {
      const { data } = await client.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isSupabaseConnected: configStatus.isConfigured,
        configStatus,
        authError,
        isSandboxMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
        enableSandboxMode,
        clearAuthError,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
