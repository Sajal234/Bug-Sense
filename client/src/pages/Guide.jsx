const bugStates = [
  {
    title: 'Pending review',
    summary: 'Something is waiting for lead review before it can continue in the workflow.',
    detail: 'This is used for newly reported bugs, and also when a resolved bug is being reviewed for reopen approval.'
  },
  {
    title: 'Open',
    summary: 'The bug is accepted and ready to be assigned.',
    detail: 'Use this when the issue is real but no one owns it yet.'
  },
  {
    title: 'Assigned',
    summary: 'Someone now owns the bug and is actively working on it.',
    detail: 'This is the main work-in-progress state for an issue.'
  },
  {
    title: 'Awaiting verification',
    summary: 'A fix was submitted and is waiting for lead verification.',
    detail: 'The work is done for now, but it still needs review before the bug is closed.'
  },
  {
    title: 'Resolved',
    summary: 'The fix was verified and the team considers the issue done.',
    detail: 'If the same issue appears again later, the team can request a reopen instead of creating a duplicate report.'
  },
  {
    title: 'Review requested',
    summary: 'The team asked the lead to review severity before work continues.',
    detail: 'This is used when the reported severity needs a decision from the lead.'
  },
  {
    title: 'Reopened',
    summary: 'A previously resolved issue came back and is active again.',
    detail: 'The bug goes back into work instead of staying closed.'
  },
  {
    title: 'Rejected',
    summary: 'The bug report itself was declined by the lead.',
    detail: 'This is the closed-out state for reports that should not enter active work.'
  }
];

const workflowSteps = [
  {
    title: 'Pending review -> Open',
    detail: 'The lead reviews a new report first. If it is valid, it moves into the open queue.'
  },
  {
    title: 'Open -> Assigned',
    detail: 'Once someone should take ownership, the lead assigns the bug to a teammate.'
  },
  {
    title: 'Assigned -> Awaiting verification',
    detail: 'After the assignee submits a fix, the bug waits for the lead to verify the result.'
  },
  {
    title: 'Awaiting verification -> Resolved',
    detail: 'If the fix is accepted, the bug is resolved. If not, it returns to active work.'
  },
  {
    title: 'Resolved -> Pending review -> Reopened',
    detail: 'If the same issue returns later, the team first requests a reopen, and the lead decides whether it moves back into active work.'
  },
  {
    title: 'Review requested',
    detail: 'Use this when someone needs the lead to decide severity before the team continues.'
  },
  {
    title: 'Pending review -> Rejected',
    detail: 'If the lead decides a new report should not move forward, it is rejected instead of becoming open work.'
  }
];

const Guide = () => {
  return (
    <div className="space-y-12">
      <section className="border-b border-gray-200 pb-6 dark:border-[#242A33]">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#8A8A8A]">
            Guide
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            How Bug-Sense statuses work
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-gray-600 dark:text-[#C9CDD4]">
            A quick reference for reading issue states and understanding what usually happens next in the workflow.
          </p>
        </div>
      </section>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="border-t border-gray-200 pt-6 dark:border-[#242A33]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bug states</h2>

          <div className="mt-6 divide-y divide-gray-200 dark:divide-[#242A33]">
            {bugStates.map((state) => (
              <article key={state.title} className="grid gap-3 py-5 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:gap-8">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{state.title}</p>
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{state.summary}</p>
                  <p className="text-sm leading-6 text-gray-600 dark:text-[#C9CDD4]">{state.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-gray-200 pt-6 dark:border-[#242A33]">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Typical flow</h2>
            <p className="text-sm leading-6 text-gray-600 dark:text-[#C9CDD4]">
              The most common movement through the bug workflow from report to resolution.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-4">
                <span className="pt-0.5 text-[12px] font-semibold tracking-[0.18em] text-gray-400 dark:text-[#7A7A7A]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900 dark:text-white">{step.title}</p>
                  <p className="text-sm leading-6 text-gray-600 dark:text-[#C9CDD4]">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Guide;
