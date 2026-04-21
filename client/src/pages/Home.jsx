import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const aboutValues = [
  {
    index: '01',
    title: 'Clarity over clutter',
    text: 'Bugs, fixes, and reviews stay readable so the next step is obvious.'
  },
  {
    index: '02',
    title: 'Shared ownership',
    text: 'Projects, assignees, comments, and approvals stay connected in one flow.'
  },
  {
    index: '03',
    title: 'Calm by default',
    text: 'The interface is designed for everyday work, not for dashboard noise.'
  }
];

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full px-3 pb-16 pt-18 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-2xl">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="mb-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
              Issue tracking, <br className="hidden sm:block" />
              <span className="text-gray-500 dark:text-[#A1A1AA]">without the noise.</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg font-normal leading-relaxed text-gray-600 dark:text-[#A1A1AA] sm:text-xl">
              <span className="sm:hidden">
                A focused bug tracker for teams that want speed, clarity, and less clutter.
              </span>
              <span className="hidden sm:inline">
                Bug-Sense is a professional, high-performance issue tracker designed to help your team squash bugs faster. No clutter, just the features you need.
              </span>
            </p>

            <div className="mx-auto flex w-full max-w-[28rem] flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="flex min-h-12 w-full items-center justify-center rounded-md bg-gray-900 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 sm:min-h-0 sm:w-auto"
              >
                {user ? 'Open dashboard' : 'Start building for free'}
              </Link>
              {user ? (
                <Link
                  to="/projects"
                  className="flex min-h-12 w-full items-center justify-center rounded-md border border-gray-200 bg-white px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-[#2C2C2C] dark:bg-[#161616] dark:text-white dark:hover:bg-[#262626] sm:min-h-0 sm:w-auto"
                >
                  View projects
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex min-h-12 w-full items-center justify-center rounded-md border border-gray-200 bg-white px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-[#2C2C2C] dark:bg-[#161616] dark:text-white dark:hover:bg-[#262626] sm:min-h-0 sm:w-auto"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hero "App Mockup" visualization */}
      <section className="w-full px-3 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-2xl">
          <div className="relative mx-auto max-w-[30rem] sm:max-w-7xl">
          <div className="relative flex h-[20rem] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-[#2C2C2C] dark:bg-[#161616] sm:h-96">
            {/* Mockup Header */}
            <div className="flex h-10 items-center gap-2 border-b border-gray-100 bg-[#FAFAFA] px-3 dark:border-[#2C2C2C] dark:bg-[#0A0A0A] sm:h-12 sm:px-4">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400 sm:h-3 sm:w-3"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400 sm:h-3 sm:w-3"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-green-400 sm:h-3 sm:w-3"></div>
            </div>
            {/* Mockup Body */}
            <div className="flex-1 bg-[#FAFAFA] dark:bg-[#0E0E0E]">
              <div className="grid h-full grid-cols-[46px_1fr] sm:grid-cols-[46px_150px_1fr]">
                <div className="border-r border-gray-200 bg-[#F3F4F6] px-3 py-4 dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <div className="space-y-4">
                    <div className="h-2.5 w-2.5 rounded-sm bg-[#2563EB] dark:bg-[#3794FF]"></div>
                    <div className="h-2.5 w-2.5 rounded-sm bg-gray-300 dark:bg-[#4B4B4B]"></div>
                    <div className="h-2.5 w-2.5 rounded-sm bg-gray-300 dark:bg-[#4B4B4B]"></div>
                    <div className="h-2.5 w-2.5 rounded-sm bg-gray-300 dark:bg-[#4B4B4B]"></div>
                  </div>
                </div>

                <div className="hidden border-r border-gray-200 bg-[#FAFAFA] sm:block dark:border-[#2A2A2A] dark:bg-[#1A1A1A]">
                  <div className="px-3 py-3 text-[10px] uppercase tracking-[0.14em] text-gray-400 dark:text-[#7D7D7D]">
                    Explorer
                  </div>
                  <div className="space-y-1 px-2 pb-3 text-[11px] text-gray-600 dark:text-[#B9B9B9]">
                    <div className="rounded px-2 py-1 text-gray-400 dark:text-[#8A8A8A]">src</div>
                    <div className="rounded px-2 py-1 text-gray-400 dark:text-[#8A8A8A]">payments</div>
                    <div className="rounded bg-white px-2 py-1 text-gray-800 dark:bg-[#252526] dark:text-[#D4D4D4]">checkout.ts</div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col bg-white dark:bg-[#1E1E1E]">
                  <div className="flex h-8 items-end border-b border-gray-200 bg-[#F3F4F6] px-2.5 dark:border-[#2A2A2A] dark:bg-[#252526] sm:h-10 sm:px-3">
                    <div className="rounded-t-md border border-b-0 border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-700 dark:border-[#3A3A3A] dark:bg-[#1E1E1E] dark:text-[#D4D4D4]">
                      checkout.ts
                    </div>
                  </div>

                  <div className="flex-1 px-3 py-3 font-mono text-[9.5px] leading-5 text-[#1F2937] dark:text-[#D4D4D4] sm:px-5 sm:py-4 sm:text-[12px] sm:leading-7">
                    <div className="space-y-1">
                      <div className="flex">
                        <span className="w-8 select-none text-gray-400 dark:text-[#6A9955]/80">12</span>
                        <span>
                          <span className="text-[#0000FF] dark:text-[#569CD6]">const</span>{' '}
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">total</span>{' '}
                          <span>=</span>{' '}
                          <span className="text-[#795E26] dark:text-[#DCDCAA]">items</span>
                          <span>.</span>
                          <span className="text-[#795E26] dark:text-[#DCDCAA]">reduce</span>
                          <span>((</span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">sum</span>
                          <span>, </span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">item</span>
                          <span>) =&gt; </span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">sum</span>
                          <span> + </span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">item</span>
                          <span>.</span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">price</span>
                          <span>, </span>
                          <span className="text-[#098658] dark:text-[#B5CEA8]">0</span>
                          <span>);</span>
                        </span>
                      </div>

                      <div className="flex">
                        <span className="w-8 select-none text-gray-400 dark:text-[#6A9955]/80">13</span>
                        <span>
                          <span className="text-[#0000FF] dark:text-[#569CD6]">const</span>{' '}
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">discount</span>{' '}
                          <span>= </span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">appliedCoupon</span>
                          <span>?.</span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">value</span>{' '}
                          <span>?? </span>
                          <span className="text-[#098658] dark:text-[#B5CEA8]">0</span>
                          <span>;</span>
                        </span>
                      </div>

                      <div className="flex">
                        <span className="w-8 select-none text-gray-400 dark:text-[#6A9955]/80">14</span>
                        <span>
                          <span className="text-[#0000FF] dark:text-[#569CD6]">const</span>{' '}
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">finalTotal</span>{' '}
                          <span>= </span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">total</span>
                          <span> - </span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">discount</span>
                          <span>;</span>
                        </span>
                      </div>

                      <div className="flex">
                        <span className="w-8 select-none text-gray-400 dark:text-[#6A9955]/80">15</span>
                        <span>
                          <span className="text-[#795E26] dark:text-[#DCDCAA]">setSummary</span>
                          <span>((</span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">prev</span>
                          <span>) =&gt; ({' '}</span>
                          <span>...</span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">prev</span>
                          <span>, </span>
                          <span className="relative inline-block">
                            <span>
                              <span className="text-[#1F2937] dark:text-[#9CDCFE]">total</span>
                              <span>: </span>
                              <span className="text-[#1F2937] dark:text-[#9CDCFE]">total</span>
                            </span>
                            <svg
                              aria-hidden="true"
                              className="pointer-events-none absolute -bottom-1 left-0 h-2 w-full"
                              viewBox="0 0 120 8"
                              preserveAspectRatio="none"
                            >
                              <path
                                d="M0 6 C4 2 8 2 12 6 S20 10 24 6 S32 2 36 6 S44 10 48 6 S56 2 60 6 S68 10 72 6 S80 2 84 6 S92 10 96 6 S104 2 108 6 S116 10 120 6"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          <span>{' '}));</span>
                        </span>
                      </div>

                      <div className="flex">
                        <span className="w-8 select-none text-gray-400 dark:text-[#6A9955]/80">16</span>
                        <span>
                          <span className="text-[#0000FF] dark:text-[#569CD6]">return</span>{' '}
                          <span className="text-[#795E26] dark:text-[#DCDCAA]">formatCurrency</span>
                          <span>(</span>
                          <span className="text-[#1F2937] dark:text-[#9CDCFE]">finalTotal</span>
                          <span>);</span>
                        </span>
                      </div>

                      <div className="flex">
                        <span className="w-8 select-none text-gray-400 dark:text-[#6A9955]/80">17</span>
                        <span>{'}'}</span>
                      </div>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 sm:mt-6 sm:px-3 sm:py-1.5 sm:text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      <span>summary total ignores the applied discount</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 bg-[#F3F4F6] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-gray-500 dark:border-[#2A2A2A] dark:bg-[#252526] dark:text-[#A1A1AA] sm:px-3 sm:py-1.5 sm:text-[10px]">
                    <span>Problems 1</span>
                    <span>TypeScript</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="w-full px-3 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-screen-2xl border-t border-gray-200 pt-12 dark:border-[#2C2C2C]">
        <div className="grid grid-cols-1 gap-0 text-left md:grid-cols-3 md:divide-x md:divide-gray-200 dark:md:divide-[#2C2C2C]">
          {/* Feature 1 */}
          <div className="py-6 md:px-8">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white dark:border-[#2C2C2C] dark:bg-[#161616]">
               <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h3>
            <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-[#A1A1AA]">
              <span className="sm:hidden">Built for quick bug work without delays.</span>
              <span className="hidden sm:inline">Built for speed so your team never has to wait. Navigating between issues is absolutely instant.</span>
            </p>
          </div>
          {/* Feature 2 */}
          <div className="border-t border-gray-200 py-6 md:border-t-0 md:px-8 dark:border-[#2C2C2C]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white dark:border-[#2C2C2C] dark:bg-[#161616]">
              <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Professional Design</h3>
            <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-[#A1A1AA]">
              <span className="sm:hidden">A clean interface built for real team workflows.</span>
              <span className="hidden sm:inline">A clean, high-contrast interface designed specifically for complex software development workflows.</span>
            </p>
          </div>
          {/* Feature 3 */}
          <div className="border-t border-gray-200 py-6 md:border-t-0 md:px-8 dark:border-[#2C2C2C]">
             <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white dark:border-[#2C2C2C] dark:bg-[#161616]">
              <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Secure & Reliable</h3>
            <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-[#A1A1AA]">
              <span className="sm:hidden">Secure enough for serious product work.</span>
              <span className="hidden sm:inline">Enterprise-grade security built directly into the core, protecting your source code and metrics.</span>
            </p>
          </div>
        </div>
        </div>
      </section>

      <section
        id="about"
        className="w-full scroll-mt-28 px-3 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-screen-2xl border-t border-gray-200 pt-16 dark:border-[#2C2C2C]">
        <div className="grid gap-10 text-left lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:items-start lg:gap-16">
          <div className="max-w-3xl space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-[#8A8A8A]">
              Why Bug-Sense
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Built for teams that want less noise and faster decisions.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-gray-600 dark:text-[#C9CDD4]">
              <span className="sm:hidden">
                Reports, ownership, fixes, and review decisions stay in one calm workflow.
              </span>
              <span className="hidden sm:inline">
                Bug-Sense brings reports, ownership, fixes, and review decisions into one calm workflow so teams can move from issue to resolution without losing context.
              </span>
            </p>
          </div>

          <div className="max-w-[520px] divide-y divide-gray-200 justify-self-start dark:divide-[#2C2C2C] lg:justify-self-end">
            {aboutValues.map((item) => (
              <article key={item.title} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 py-5 first:pt-0 last:pb-0">
                <span className="pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-[#8A8A8A]">
                  {item.index}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-[#C9CDD4]">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
