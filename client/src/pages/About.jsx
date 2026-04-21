import { Link } from 'react-router-dom';

const panelClass =
  'rounded-[22px] border border-gray-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] dark:border-[#2B3038] dark:bg-[#15181d] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,0.6)] sm:rounded-[28px] sm:p-6';

const innerCardClass =
  'rounded-[20px] border border-gray-200 bg-[#F8F9FB] p-5 dark:border-[#2B3038] dark:bg-[#101318] sm:rounded-[24px]';

const values = [
  {
    title: 'Clarity first',
    text: 'Bug-Sense is meant to keep bug tracking readable and focused, so teams can move without confusion.'
  },
  {
    title: 'Team-friendly workflow',
    text: 'Projects, bugs, comments, fixes, and reviews are kept connected so people know what to do next.'
  },
  {
    title: 'Simple by default',
    text: 'The product should feel calm enough for everyday work, not like a dashboard maze.'
  }
];

const About = () => {
  return (
    <div className="space-y-6">
      <section className={panelClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#8A8A8A]">
                About
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                About Bug-Sense
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600 dark:text-[#C9CDD4]">
                A focused bug tracking workspace for small teams that want less noise and clearer execution.
              </p>
            </div>
          </div>

          <Link
            to="/guide"
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-gray-800 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white"
          >
            Open guide
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {values.map((item) => (
          <article
            key={item.title}
            className={innerCardClass}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-[#C9CDD4]">{item.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default About;
