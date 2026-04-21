export const BUG_STATUS_OPTIONS = [
  'PENDING_REVIEW',
  'OPEN',
  'ASSIGNED',
  'REVIEW_REQUESTED',
  'AWAITING_VERIFICATION',
  'RESOLVED',
  'REOPENED',
  'REJECTED'
];

export const BUG_SEVERITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const BUG_SEVERITY_WITH_UNCONFIRMED = ['UNCONFIRMED', ...BUG_SEVERITY_OPTIONS];
export const BUG_ENVIRONMENT_OPTIONS = ['PRODUCTION', 'STAGING', 'DEVELOPMENT'];
export const BUG_TYPE_OPTIONS = ['UI', 'FUNCTIONAL', 'BACKEND', 'DATABASE', 'API', 'SECURITY', 'INFRA', 'OTHER'];

export const getEntityId = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || '';
};

export const bugStatusTone = (status) => {
  switch (status) {
    case 'OPEN':
    case 'REOPENED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20';
    case 'ASSIGNED':
    case 'AWAITING_VERIFICATION':
    case 'REVIEW_REQUESTED':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20';
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10';
  }
};

export const bugSeverityTone = (severity) => {
  switch (severity) {
    case 'CRITICAL':
      return 'text-rose-600 dark:text-rose-300';
    case 'HIGH':
      return 'text-orange-600 dark:text-orange-300';
    case 'MEDIUM':
      return 'text-amber-600 dark:text-amber-300';
    case 'LOW':
      return 'text-emerald-600 dark:text-emerald-300';
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
};

export const getLastBugHistoryItem = (bug) => {
  if (!Array.isArray(bug?.history) || bug.history.length === 0) {
    return null;
  }

  return bug.history[bug.history.length - 1];
};

export const isReopenRequestPending = (bug) =>
  bug?.status === 'PENDING_REVIEW' && getLastBugHistoryItem(bug)?.action === 'Reopen requested';

export const getPendingBugFix = (bug) =>
  Array.isArray(bug?.fixes) ? bug.fixes.find((fix) => fix.status === 'PENDING') || null : null;
