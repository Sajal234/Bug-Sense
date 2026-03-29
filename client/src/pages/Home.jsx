import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-4xl mx-auto pt-20 pb-16 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
          Issue tracking, <br className="hidden sm:block" />
          <span className="text-gray-500 dark:text-[#A1A1AA]">without the noise.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 dark:text-[#A1A1AA] mb-10 leading-relaxed font-normal">
          Bug-Sense is a professional, high-performance issue tracker designed to help your team squash bugs faster. No clutter, just the features you need.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/register" 
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center"
          >
            Start building for free
          </Link>
          <Link 
            to="/login" 
            className="w-full sm:w-auto px-6 py-3 rounded-md bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2C2C2C] text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors flex items-center justify-center shadow-sm"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Hero "App Mockup" visualization */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="w-full h-80 sm:h-96 rounded-lg border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#161616] shadow-sm overflow-hidden flex flex-col">
          {/* Mockup Header */}
          <div className="h-12 border-b border-gray-100 dark:border-[#2C2C2C] flex items-center px-4 gap-2 bg-[#FAFAFA] dark:bg-[#0A0A0A]">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          {/* Mockup Body */}
          <div className="flex-1 p-6 flex flex-col gap-4 bg-[#FAFAFA] dark:bg-[#0E0E0E]">
            <div className="w-1/3 h-6 bg-gray-200 dark:bg-[#262626] rounded-md mb-2"></div>
            <div className="w-full h-4 bg-gray-100 dark:bg-[#1A1A1A] rounded-md"></div>
            <div className="w-5/6 h-4 bg-gray-100 dark:bg-[#1A1A1A] rounded-md"></div>
            <div className="w-full h-4 bg-gray-100 dark:bg-[#1A1A1A] rounded-md mt-4"></div>
            <div className="w-4/5 h-4 bg-gray-100 dark:bg-[#1A1A1A] rounded-md"></div>
            <div className="flex gap-2 mt-auto">
              <div className="w-20 h-8 bg-gray-200 dark:bg-[#262626] rounded-md"></div>
              <div className="w-24 h-8 bg-gray-200 dark:bg-[#262626] rounded-md"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200 dark:border-[#2C2C2C]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {/* Feature 1 */}
          <div>
            <div className="w-10 h-10 rounded-md border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#161616] flex items-center justify-center mb-4 shadow-sm">
               <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
            <p className="text-gray-600 dark:text-[#A1A1AA] leading-relaxed text-sm">Built for speed so your team never has to wait. Navigating between issues is absolutely instant.</p>
          </div>
          {/* Feature 2 */}
          <div>
            <div className="w-10 h-10 rounded-md border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#161616] flex items-center justify-center mb-4 shadow-sm">
              <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Professional Design</h3>
            <p className="text-gray-600 dark:text-[#A1A1AA] leading-relaxed text-sm">A clean, high-contrast interface designed specifically for complex software development workflows.</p>
          </div>
          {/* Feature 3 */}
          <div>
             <div className="w-10 h-10 rounded-md border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#161616] flex items-center justify-center mb-4 shadow-sm">
              <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Secure & Reliable</h3>
            <p className="text-gray-600 dark:text-[#A1A1AA] leading-relaxed text-sm">Enterprise-grade security built directly into the core, protecting your source code and metrics.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
