/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Supabase Client Initialization & Configuration Helper
 * 
 * Checks for credentials in:
 * 1. Vite environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * 2. LocalStorage override ('case_of_yusuf_supabase_config') for instant in-browser configuration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CONFIG_STORAGE_KEY = 'case_of_yusuf_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'localStorage';
}

let cachedClient: SupabaseClient | null = null;
let currentConfig: SupabaseConfig | null = null;

export function getSupabaseConfig(): SupabaseConfig | null {
  // 1. Check localStorage first (allows user to test live keys immediately in browser)
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          source: 'localStorage'
        };
      }
    }
  } catch {
    // Ignore storage errors
  }

  // 2. Check Vite env variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project-ref') && !envKey.includes('your-anon-public-key')) {
    return {
      url: envUrl.trim(),
      anonKey: envKey.trim(),
      source: 'env'
    };
  }

  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) {
    cachedClient = null;
    currentConfig = null;
    return null;
  }

  // If configuration changed or client not created yet
  if (!cachedClient || currentConfig?.url !== config.url || currentConfig?.anonKey !== config.anonKey) {
    try {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      currentConfig = config;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      cachedClient = null;
      currentConfig = null;
    }
  }

  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
  cachedClient = null; // force re-creation
  getSupabaseClient();
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  cachedClient = null;
  currentConfig = null;
}

/**
 * Tests connection to the Supabase database and checks if the rooms table exists.
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL and anon key are not configured yet.'
    };
  }

  try {
    const { data, error } = await client.from('rooms').select('code').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Connected to Supabase, but the "rooms" table was not found. Please run the SQL schema script in Supabase SQL Editor.'
        };
      }
      return {
        success: false,
        message: `Supabase error (${error.code}): ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase Realtime!'
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown connection error.'
    };
  }
}
