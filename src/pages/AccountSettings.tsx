import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RefreshCw, Key, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';

type ApiKeyFormData = {
  api_key: string;
  api_secret: string;
};

type PasswordFormData = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const AccountSettings: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [apiKeySuccess, setApiKeySuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  const apiKeyForm = useForm<ApiKeyFormData>({
    defaultValues: {
      api_key: '',
      api_secret: ''
    }
  });
  
  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    }
  });
  
  const { register: registerApiKey, handleSubmit: handleSubmitApiKey, setValue: setApiKeyValue } = apiKeyForm;
  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: passwordErrors } } = passwordForm;

  // Fetch API keys if they exist
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('user_id', user.id)
          .eq('exchange', 'bybit')
          .single();
          
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        
        if (data) {
          setApiKeyValue('api_key', data.api_key || '');
          setApiKeyValue('api_secret', data.api_secret || '');
        }
      } catch (error) {
        console.error('Error fetching API keys:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchApiKeys();
  }, [user, supabase, setApiKeyValue]);

  // Save API keys
  const onSaveApiKeys = async (data: ApiKeyFormData) => {
    if (!user) return;
    
    setSavingKeys(true);
    setApiKeySuccess(false);
    
    try {
      // Check if API keys already exist
      const { data: existingKey } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('exchange', 'bybit')
        .single();
        
      if (existingKey) {
        // Update existing keys
        const { error } = await supabase
          .from('api_keys')
          .update({
            api_key: data.api_key,
            api_secret: data.api_secret,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingKey.id);
          
        if (error) throw error;
      } else {
        // Insert new keys
        const { error } = await supabase
          .from('api_keys')
          .insert({
            user_id: user.id,
            exchange: 'bybit',
            api_key: data.api_key,
            api_secret: data.api_secret,
            created_at: new Date().toISOString()
          });
          
        if (error) throw error;
      }
      
      setApiKeySuccess(true);
      setTimeout(() => setApiKeySuccess(false), 3000);
    } catch (error) {
      console.error('Error saving API keys:', error);
      alert('Failed to save API keys');
    } finally {
      setSavingKeys(false);
    }
  };

  // Change password
  const onChangePassword = async (data: PasswordFormData) => {
    setSavingPassword(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    
    if (data.new_password !== data.confirm_password) {
      setPasswordError('New passwords do not match');
      setSavingPassword(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.new_password
      });
      
      if (error) throw error;
      
      setPasswordSuccess(true);
      resetPassword();
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* API Keys */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Key className="text-blue-600 mr-2" size={20} />
            <h2 className="text-xl font-semibold">Bybit API Keys</h2>
          </div>
          
          <form onSubmit={handleSubmitApiKey(onSaveApiKeys)}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter your Bybit API key"
                {...registerApiKey('api_key', { required: true })}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter your Bybit API secret"
                {...registerApiKey('api_secret', { required: true })}
              />
            </div>
            
            <div className="mb-6">
              <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-md">
                <AlertTriangle size={16} className="text-blue-500 mr-2 mt-0.5" />
                <p className="text-sm text-blue-700">
                  The test mode setting is now controlled at the individual bot level. 
                  Please configure each bot's test mode setting separately.
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                type="submit"
                disabled={savingKeys}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                {savingKeys ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <Key size={16} className="mr-2" />
                )}
                Save API Keys
              </button>
              
              {apiKeySuccess && (
                <div className="ml-3 flex items-center text-green-600">
                  <CheckCircle size={16} className="mr-1" />
                  <span className="text-sm">API keys saved successfully!</span>
                </div>
              )}
            </div>
          </form>
        </div>
        
        {/* Change Password */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Shield className="text-blue-600 mr-2" size={20} />
            <h2 className="text-xl font-semibold">Change Password</h2>
          </div>
          
          <form onSubmit={handleSubmitPassword(onChangePassword)}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                className={`w-full px-3 py-2 border rounded-md ${passwordErrors.current_password ? 'border-red-500' : 'border-gray-300'}`}
                {...registerPassword('current_password', { required: 'Current password is required' })}
              />
              {passwordErrors.current_password && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.current_password.message}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                className={`w-full px-3 py-2 border rounded-md ${passwordErrors.new_password ? 'border-red-500' : 'border-gray-300'}`}
                {...registerPassword('new_password', { 
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' } 
                })}
              />
              {passwordErrors.new_password && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.new_password.message}</p>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                className={`w-full px-3 py-2 border rounded-md ${passwordErrors.confirm_password ? 'border-red-500' : 'border-gray-300'}`}
                {...registerPassword('confirm_password', { 
                  required: 'Please confirm your password',
                  validate: (value, formValues) => value === formValues.new_password || 'Passwords do not match'
                })}
              />
              {passwordErrors.confirm_password && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.confirm_password.message}</p>
              )}
            </div>
            
            <div className="flex items-center">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                {savingPassword ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <Shield size={16} className="mr-2" />
                )}
                Change Password
              </button>
              
              {passwordSuccess && (
                <div className="ml-3 flex items-center text-green-600">
                  <CheckCircle size={16} className="mr-1" />
                  <span className="text-sm">Password changed successfully!</span>
                </div>
              )}
              
              {passwordError && (
                <div className="ml-3 flex items-center text-red-600">
                  <XCircle size={16} className="mr-1" />
                  <span className="text-sm">{passwordError}</span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;