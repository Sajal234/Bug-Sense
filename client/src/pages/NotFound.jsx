import { Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const NotFound = () => {
  const location = useLocation();
  const { accessToken } = useAuth();
  const isAuthenticated = Boolean(accessToken);

  return (
    <div className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-4">
      <div className="relative w-full max-w-3xl">
        <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-black/6 blur-2xl dark:bg-white/8"></div>

        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-[#2C2C2C] dark:bg-[#121212] dark:shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="border-b border-gray-100 bg-[#FAFAFA] px-5 py-4 dark:border-[#232323] dark:bg-[#0E0E0E]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400"></span>
              <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
              <span className="h-3 w-3 rounded-full bg-green-400"></span>
            </div>
          </div>

          <div className="grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div>
              <div className="mb-4 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:border-[#2C2C2C] dark:bg-[#171717] dark:text-[#A1A1AA]">
                Error 404
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                The page you requested doesn&apos;t exist.
              </h1>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={isAuthenticated ? '/dashboard' : '/'}
                  className="inline-flex items-center justify-center rounded-md bg-gray-900 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-gray-800 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white"
                >
                  {isAuthenticated ? 'Open dashboard' : 'Return home'}
                </Link>
                <Link
                  to={isAuthenticated ? '/projects' : '/login'}
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-5 py-3 text-[14px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#2C2C2C] dark:bg-[#161616] dark:text-[#E2E8F0] dark:hover:bg-[#202020]"
                >
                  {isAuthenticated ? 'Open projects' : 'Go to sign in'}
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-[#FBFBFB] p-4 dark:border-[#2C2C2C] dark:bg-[#161616]">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-[#262626]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-[#7A7A7A]">
                    Requested Path
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    Route lookup failed
                  </p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  Missing
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-[13px] text-gray-700 dark:border-[#2C2C2C] dark:bg-[#111111] dark:text-[#D4D4D4]">
                {location.pathname}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
