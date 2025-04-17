import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create context
type SupabaseContextType = {
  supabase: SupabaseClient;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Get Supabase configuration at runtime
const getSupabaseConfig = () => {
  // For local development, use Vite environment variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // For production, use values injected at runtime by Netlify
  const runtimeUrl = window.__SUPABASE_URL__;
  const runtimeKey = window.__SUPABASE_ANON_KEY__;
  
  // Always prioritize environment variables during development
  // Only fall back to runtime values if env variables are not available
  const supabaseUrl = envUrl || '';
  const supabaseAnonKey = envKey || '';
  
  console.log('Supabase URL:', supabaseUrl ? 'URL configured' : 'Missing URL');
  console.log('Supabase Anon Key:', supabaseAnonKey ? 'Key configured' : 'Missing key');
  
  return { supabaseUrl, supabaseAnonKey };
};

// Provider component
export const SupabaseProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeSupabase = () => {
      const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase configuration is missing or incorrect.');
        return null;
      }
      
      return createClient(supabaseUrl, supabaseAnonKey);
    };
    
    const client = initializeSupabase();
    if (client) {
      setSupabase(client);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!supabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Configuration Error</h1>
        <p className="text-gray-800 mb-4">
          Unable to connect to Supabase. Please check your environment configuration.
        </p>
        <p className="text-gray-600 text-sm">
          Make sure your .env file contains valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values.
        </p>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};

// Hook for using Supabase
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};