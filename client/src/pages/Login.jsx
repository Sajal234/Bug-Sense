import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error aggressively on typing to improve UX
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Security constraint: prevent default form submission
    
    // Client-side validation fallback
    if (!formData.email || !formData.password) {
       setError("Both email and password are required.");
       return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Connects to /api/v1/users/login based on axios logic and backend app.js configuration
      const response = await api.post('/users/login', {
        email: formData.email.trim(),
        password: formData.password
      });

      // Strict check against backend's ApiResponse format { statusCode, data, message, success }
      if (response?.data?.success) {
        // Navigation lock. Eventually this user data flows into AuthContext
        // const { user, accessToken } = response.data.data;
        
        // Security constraint: Clear state immediately from RAM 
        setFormData({ email: '', password: '' });
        
        // Push user to secure route
        navigate('/dashboard');
      }
    } catch (err) {
      // Extract intercepted message from unified axios interceptor or fallback
      setError(err?.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-8 h-8 bg-blue-600 rounded-[6px] flex items-center justify-center shadow-inner mx-auto mb-4">
            <div className="w-2.5 h-2.5 bg-white rounded-[2px]"></div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white mb-2">
            Welcome back
          </h1>
          <p className="text-[14px] text-gray-600 dark:text-[#A1A1AA]">
            Enter your details to sign in to your workspace.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-md text-[13px] text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

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
              placeholder="name@company.com"
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
              autoComplete="current-password"
              required
              disabled={loading}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-300 dark:border-[#2C2C2C] rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[14px] text-gray-900 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-[14px] font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-[14px] text-gray-600 dark:text-[#A1A1AA]">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-gray-900 dark:text-white hover:underline underline-offset-4 transition-all">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
