import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import useTheme from '../../hooks/useTheme';
import useAuth from '../../hooks/useAuth';
import BrandMark from '../BrandMark';

const Layout = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logoutContext } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const topNavLinkClass = ({ isActive }) =>
    `text-[14px] font-medium px-3 py-1.5 transition-colors ${
      isActive
        ? 'text-gray-900 dark:text-white'
        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
    }`;
  const profileButtonClass = ({ isActive }) =>
    `ml-1 flex h-9 w-9 items-center justify-center rounded-full border text-[13px] font-semibold transition-colors ${
      isActive
        ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-[#111111]'
        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-[#2C2C2C] dark:bg-[#161616] dark:text-[#E2E8F0] dark:hover:border-[#3A3A3A] dark:hover:bg-[#202020]'
    }`;
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] dark:bg-[#0E0E0E] text-[#111827] dark:text-[#E2E8F0] font-sans antialiased">
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-[#FAFAFA] transition-colors duration-200 dark:border-[#1F242C] dark:bg-[#0E0E0E]">
        <div className="mx-auto grid h-14 w-full max-w-screen-2xl grid-cols-[auto_1fr_auto] items-center gap-3 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <Link to="/" className="shrink-0 flex items-center gap-2.5 group">
                <BrandMark size="sm" />
                <span className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white">
                  Bug-Sense
                </span>
              </Link>
            </div>

            <div className="hidden lg:flex items-center justify-center gap-2">
              {user ? (
                <>
                  <NavLink to="/" className={topNavLinkClass}>
                    Home
                  </NavLink>
                  <NavLink to="/dashboard" className={topNavLinkClass}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/projects" className={topNavLinkClass}>
                    Projects
                  </NavLink>
                  <NavLink to="/guide" className={topNavLinkClass}>
                    Guide
                  </NavLink>
                </>
              ) : null}
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center justify-end space-x-1">
              <button 
                onClick={toggleTheme}
                className="mr-2 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#161A20] dark:hover:text-gray-100"
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

              {user ? (
                <>
                  <NavLink
                    to="/profile"
                    className={profileButtonClass}
                    aria-label="Open profile"
                    title={user?.name ? `${user.name} profile` : 'Profile'}
                  >
                    {profileInitial}
                  </NavLink>
                  <button 
                    onClick={logoutContext}
                    className="ml-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="rounded-full px-3 py-1.5 text-[14px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#262626] dark:hover:text-gray-100"
                  >
                    Log in
                  </Link>
                  <div className="pl-1">
                    <Link 
                      to="/register" 
                      className="rounded-full border border-transparent bg-blue-600 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400"
                    >
                      Sign up
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Navigation Controls */}
            <div className="flex items-center justify-end lg:hidden space-x-2">
              <button 
                onClick={toggleTheme}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#161A20] dark:hover:text-gray-100"
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
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#161A20] dark:hover:text-gray-100"
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
      </nav>

      {/* Mobile Slide-Over Menu */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition ${isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close mobile menu overlay"
          onClick={closeMobileMenu}
          className={`absolute inset-0 bg-black/45 transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
        />

        <aside
          className={`absolute right-0 top-0 h-full w-[min(21rem,92vw)] border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 dark:border-[#2C2C2C] dark:bg-[#161616] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-[#2C2C2C]">
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-700 dark:border-[#2C2C2C] dark:bg-[#111111] dark:text-[#E2E8F0]">
                      {profileInitial}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-[12px] text-gray-500 dark:text-[#8A8A8A]">Workspace menu</p>
                    </div>
                  </>
                ) : (
                  <>
                    <BrandMark size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Bug-Sense</p>
                      <p className="text-[12px] text-gray-500 dark:text-[#8A8A8A]">Navigation</p>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#202020] dark:hover:text-white"
                aria-label="Close mobile menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              {user ? (
                <div className="space-y-1">
                  <NavLink
                    to="/"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-[#111111]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-[#E2E8F0] dark:hover:bg-[#202020]'
                      }`
                    }
                  >
                    Home
                  </NavLink>
                  <NavLink
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-[#111111]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-[#E2E8F0] dark:hover:bg-[#202020]'
                      }`
                    }
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/guide"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-[#111111]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-[#E2E8F0] dark:hover:bg-[#202020]'
                      }`
                    }
                  >
                    Guide
                  </NavLink>
                  <NavLink
                    to="/projects"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-[#111111]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-[#E2E8F0] dark:hover:bg-[#202020]'
                      }`
                    }
                  >
                    Projects
                  </NavLink>
                  <NavLink
                    to="/profile"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white dark:bg-white dark:text-[#111111]'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-[#E2E8F0] dark:hover:bg-[#202020]'
                      }`
                    }
                  >
                    Profile
                  </NavLink>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="block rounded-xl px-4 py-3 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-[#E2E8F0] dark:hover:bg-[#202020]"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMobileMenu}
                    className="block rounded-xl bg-gray-900 px-4 py-3 text-center text-[14px] font-medium text-white transition-colors hover:bg-gray-800 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>

            {user ? (
              <div className="border-t border-gray-200 p-3 dark:border-[#2C2C2C]">
                <button
                  onClick={() => {
                    closeMobileMenu();
                    logoutContext();
                  }}
                  className="w-full rounded-xl px-4 py-3 text-left text-[14px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {/* Main Content Area */}
      <main className="grow w-full max-w-screen-2xl mx-auto px-3 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-8 lg:px-8">
        <Outlet />
      </main>

      <footer className="mt-14 border-t border-gray-200 dark:border-[#242A33]">
        <div className="mx-auto w-full max-w-screen-2xl px-3 py-5 text-center text-[12px] text-gray-400 dark:text-[#7A7A7A] sm:px-6 lg:px-8">
          <p>© 2026 Bug-Sense. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
