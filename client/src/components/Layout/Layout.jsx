import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

const Layout = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] dark:bg-[#0E0E0E] text-[#111827] dark:text-[#E2E8F0] font-sans antialiased">
      {/* Navbar - Clean, solid borders, professional tracking tool inspired */}
      <nav className="bg-white dark:bg-[#161616] border-b border-gray-200 dark:border-[#2C2C2C] sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <Link to="/" className="shrink-0 flex items-center gap-2.5 group">
                {/* Simple geometric logo placeholder, no emojis */}
                <div className="w-5 h-5 bg-blue-600 rounded-[4px] flex items-center justify-center shadow-inner">
                  <div className="w-1.5 h-1.5 bg-white rounded-[1px]"></div>
                </div>
                <span className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white">
                  Bug-Sense
                </span>
              </Link>
            </div>
            
            {/* Desktop Navigation (hides on small screens) */}
            <div className="hidden sm:flex items-center space-x-1">
              {/* Theme Toggle Button */}
              <button 
                onClick={toggleTheme}
                className="p-1.5 mr-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <Link 
                to="/dashboard" 
                className="text-[14px] font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
              >
                Dashboard
              </Link>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-800 mx-2"></div>
              <Link 
                to="/login" 
                className="text-[14px] font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
              >
                Log in
              </Link>
              <div className="pl-1">
                <Link 
                  to="/register" 
                  className="text-[14px] font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white px-3 py-1.5 rounded-md transition-colors border border-transparent"
                >
                  Sign up
                </Link>
              </div>
            </div>

            {/* Mobile Navigation Controls */}
            <div className="flex items-center sm:hidden space-x-2">
              <button 
                onClick={toggleTheme}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors focus:outline-none"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Hamburger Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors focus:outline-none"
                aria-label="Toggle mobile menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#161616]">
            <div className="px-4 py-3 space-y-1 shadow-lg border-b border-gray-200 dark:border-[#2C2C2C]">
              <Link 
                to="/dashboard" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-[14px] font-medium text-gray-600 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/login" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-[14px] font-medium text-gray-600 dark:text-gray-300 px-3 py-2.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#262626] transition-colors"
              >
                Log in
              </Link>
              <Link 
                to="/register" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-[14px] font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white px-3 py-2.5 rounded-md text-center mt-2 transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="grow w-full max-w-screen-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
