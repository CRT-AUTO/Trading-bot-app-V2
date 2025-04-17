import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, RefreshCw, Mail, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type RegisterFormData = {
  email: string;
  password: string;
  confirm_password: string;
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>();
  const password = watch('password');

  useEffect(() => {
    // Redirect if already logged in
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error, user } = await signUp(data.email, data.password);
      
      if (error) throw error;
      
      if (user) {
        // Success - will be redirected by the useEffect when session updates
        // But we can also navigate manually
        navigate('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Bot size={48} className="text-blue-600" />
        </div>
        
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
          Trading Bot Platform
        </h1>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <h2 className="text-center text-xl font-semibold text-gray-900 mb-6">
            Create your account
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertTriangle size={16} className="text-red-500 mr-2 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm ${
                    errors.confirm_password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  {...register('confirm_password', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                />
              </div>
              {errors.confirm_password && <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {loading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  'Register'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 flex items-center justify-center">
            <div className="text-sm">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 flex items-center inline-flex">
                  <ArrowLeft size={14} className="mr-1" /> Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;