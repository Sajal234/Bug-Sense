import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/axios';
import useAuth from '../hooks/useAuth';
import BrandMark from '../components/BrandMark';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { accessToken, isAuthReady, loginContext, user } = useAuth();

  if (!isAuthReady && user) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 text-sm text-gray-500 dark:text-[#A1A1AA]">
        Restoring your session...
      </div>
    );
  }

  if (isAuthReady && accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    const normalizedName = formData.name.trim();
    const normalizedEmail = formData.email.trim();
    
    // Client-side validation fallback
    if (!normalizedName || !normalizedEmail || formData.password === '') {
       setError("All fields are required.");
       return;
    }

    if (/\s/.test(formData.password)) {
      setError('Password cannot contain spaces.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const submittedPassword = formData.password;

      const response = await api.post('/users/register', {
        name: normalizedName,
        email: normalizedEmail,
        password: submittedPassword
      });

      if (response?.data?.success) {
        const loginResponse = await api.post('/users/login', {
          email: normalizedEmail,
          password: submittedPassword
        });

        if (!loginResponse?.data?.success) {
          throw new Error('Your account was created, but sign-in could not be completed.');
        }

        const { user: authenticatedUser, accessToken: nextAccessToken } = loginResponse.data.data;

        loginContext(authenticatedUser, nextAccessToken);
        setFormData({ name: '', email: '', password: '' });
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err?.message || "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <BrandMark className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white mb-2">
            Create an account
          </h1>
        </div>

        <div className="mb-6 space-y-4">
          <GoogleAuthButton disabled={loading} label="Continue with Google" />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-[#2C2C2C]" />
            </div>
            <div className="relative flex justify-center text-[12px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-[#6B7280]">
              <span className="bg-[#FAFAFA] px-3 dark:bg-[#0E0E0E]">Or create with email</span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-md text-[13px] text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              disabled={loading}
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-300 dark:border-[#2C2C2C] rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[14px] text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-300 dark:border-[#2C2C2C] rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[14px] text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]" htmlFor="password">
                Password
              </label>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              disabled={loading}
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-300 dark:border-[#2C2C2C] rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[14px] text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-[14px] font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-[14px] text-gray-600 dark:text-[#A1A1AA]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-gray-900 dark:text-white hover:underline underline-offset-4 transition-all">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
