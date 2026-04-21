import { useEffect, useState } from 'react';
import { api } from '../api/axios';
import useAuth from '../hooks/useAuth';
import { formatDateTime } from '../utils/formatters';

const defaultOverview = {
  projectsJoined: 0,
  bugsReported: 0,
  bugsAssigned: 0,
  fixesSubmitted: 0,
  fixesAccepted: 0,
  fixesRejected: 0,
  successRate: 0
};

const panelClass =
  'rounded-2xl border border-gray-200 bg-white p-5 dark:border-[#2A3038] dark:bg-[#12161C]';

const innerPanelClass =
  'rounded-xl border border-gray-200 bg-[#F8F9FB] px-4 py-4 dark:border-[#242A33] dark:bg-[#0E1116]';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[14px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#242A33] dark:bg-[#0E1116] dark:text-white';

const getSessionDeviceLabel = (userAgent) => {
  if (!userAgent) {
    return 'Unknown device';
  }

  const agent = userAgent.toLowerCase();

  let browser = 'Browser';
  if (agent.includes('edg')) {
    browser = 'Edge';
  } else if (agent.includes('firefox')) {
    browser = 'Firefox';
  } else if (agent.includes('safari') && !agent.includes('chrome')) {
    browser = 'Safari';
  } else if (agent.includes('chrome')) {
    browser = 'Chrome';
  }

  let platform = 'Desktop';
  if (agent.includes('iphone')) {
    platform = 'iPhone';
  } else if (agent.includes('ipad')) {
    platform = 'iPad';
  } else if (agent.includes('android')) {
    platform = 'Android';
  } else if (agent.includes('mac os x') || agent.includes('macintosh')) {
    platform = 'Mac';
  } else if (agent.includes('windows')) {
    platform = 'Windows';
  } else if (agent.includes('linux')) {
    platform = 'Linux';
  }

  return `${browser} on ${platform}`;
};

const getSessionActivityLabel = (session) => {
  if (session.isCurrent) {
    return 'Active on this device';
  }

  return `Last active ${formatDateTime(session.lastUsedAt || session.createdAt)}`;
};

const Profile = () => {
  const { user, logoutContext } = useAuth();
  const [overview, setOverview] = useState(defaultOverview);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');
  const [sessionActionLoadingId, setSessionActionLoadingId] = useState('');
  const [revokeOthersLoading, setRevokeOthersLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setError('');
      setSessionError('');

      try {
        const [overviewResult, sessionsResult] = await Promise.allSettled([
          api.get('/users/me/dashboard'),
          api.get('/users/sessions')
        ]);

        if (!isMounted) {
          return;
        }

        if (overviewResult.status === 'fulfilled') {
          setOverview(overviewResult.value?.data?.data || defaultOverview);
        } else {
          setError(overviewResult.reason?.message || 'Unable to load your profile right now.');
        }

        if (sessionsResult.status === 'fulfilled') {
          setSessions(sessionsResult.value?.data?.data || []);
        } else {
          setSessionError(sessionsResult.reason?.message || 'Unable to load your devices right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshSessions = async () => {
    const response = await api.get('/users/sessions');
    setSessions(response?.data?.data || []);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password must match.');
      return;
    }

    if (/\s/.test(passwordForm.newPassword)) {
      setPasswordError('New password cannot contain spaces.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      await api.post('/users/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });

      await logoutContext();
    } catch (requestError) {
      setPasswordError(requestError?.message || 'Unable to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const statCards = [
    { label: 'Projects', value: overview.projectsJoined },
    { label: 'Reported Bugs', value: overview.bugsReported },
    { label: 'Fixes Submitted', value: overview.fixesSubmitted },
    { label: 'Success Rate', value: `${overview.successRate}%` }
  ];

  const hasOtherSessions = sessions.some((session) => !session.isCurrent);

  const handleRevokeSession = async (sessionId) => {
    setSessionActionLoadingId(sessionId);
    setSessionError('');
    setSessionNotice('');

    try {
      const response = await api.delete(`/users/sessions/${sessionId}`);
      setSessionNotice(response?.data?.message || 'Session signed out successfully.');
      await refreshSessions();
    } catch (requestError) {
      setSessionError(requestError?.message || 'Unable to sign out this device.');
    } finally {
      setSessionActionLoadingId('');
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevokeOthersLoading(true);
    setSessionError('');
    setSessionNotice('');

    try {
      const response = await api.delete('/users/sessions/others');
      const revokedCount = response?.data?.data?.revokedCount ?? 0;
      setSessionNotice(
        revokedCount > 0 ? `Signed out ${revokedCount} other device${revokedCount === 1 ? '' : 's'}.` : 'No other active devices found.'
      );
      await refreshSessions();
    } catch (requestError) {
      setSessionError(requestError?.message || 'Unable to sign out other devices.');
    } finally {
      setRevokeOthersLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-[#7A7A7A]">
          Profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Your account
        </h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className={panelClass}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account info</h2>
            <div className="mt-5 space-y-4">
              <div className={innerPanelClass}>
                <p className="text-[12px] text-gray-500 dark:text-[#8A8A8A]">Name</p>
                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{user?.name || '—'}</p>
              </div>
              <div className={innerPanelClass}>
                <p className="text-[12px] text-gray-500 dark:text-[#8A8A8A]">Email</p>
                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{user?.email || '—'}</p>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contribution snapshot</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className={innerPanelClass}
                >
                  <p className="text-[12px] text-gray-500 dark:text-[#8A8A8A]">{card.label}</p>
                  <p className="mt-3 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
                    {loading ? '...' : card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={panelClass}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change password</h2>

          <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="old-password" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                Current password
              </label>
              <input
                id="old-password"
                type="password"
                value={passwordForm.oldPassword}
                disabled={passwordLoading}
                onChange={(event) => {
                  setPasswordForm((current) => ({ ...current, oldPassword: event.target.value }));
                  if (passwordError) {
                    setPasswordError('');
                  }
                }}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                disabled={passwordLoading}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                disabled={passwordLoading}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                className={inputClass}
              />
            </div>

            {passwordError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {passwordError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={passwordLoading}
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white"
            >
              {passwordLoading ? 'Updating password...' : 'Change password'}
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-5 border-t border-gray-200 pt-6 dark:border-[#242A33]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Devices</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-[#C9CDD4]">
              See where your account is signed in and remove devices you no longer use.
            </p>
          </div>

          {hasOtherSessions ? (
            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={revokeOthersLoading}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#242A33] dark:bg-[#0E1116] dark:text-[#E2E8F0] dark:hover:bg-[#171B22]"
            >
              {revokeOthersLoading ? 'Signing out...' : 'Sign out other devices'}
            </button>
          ) : null}
        </div>

        {sessionNotice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {sessionNotice}
          </div>
        ) : null}

        {sessionError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {sessionError}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#242A33] dark:text-[#8A8A8A]">
            Loading your devices...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#242A33] dark:text-[#8A8A8A]">
            No active devices found.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session._id}
                className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-[#242A33] dark:bg-[#12161C]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getSessionDeviceLabel(session.userAgent)}
                      </p>
                      {session.isCurrent ? (
                        <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-[#111111]">
                          Current device
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-[#8A8A8A]">{getSessionActivityLabel(session)}</p>
                  </div>

                  {!session.isCurrent ? (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session._id)}
                      disabled={sessionActionLoadingId === session._id}
                      className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-[13px] font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      {sessionActionLoadingId === session._id ? 'Signing out...' : 'Sign out'}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
