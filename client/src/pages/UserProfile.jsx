import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../api/axios';

const defaultOverview = {
  user: null,
  stats: {
    projects: 0,
    bugsReported: 0,
    bugsResolved: 0,
    successRate: 0
  }
};

const innerPanelClass =
  'rounded-xl border border-gray-200 bg-[#F8F9FB] px-4 py-4 dark:border-[#242A33] dark:bg-[#0E1116]';

const UserProfile = () => {
  const { userId } = useParams();
  const location = useLocation();
  const initialMember = location.state?.member || null;

  const [overview, setOverview] = useState(defaultOverview);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadUserProfile = async () => {
      setError('');
      setLoading(true);

      try {
        const response = await api.get(`/users/${userId}/dashboard`);

        if (isMounted) {
          setOverview(response?.data?.data || defaultOverview);
        }
      } catch (loadError) {
        if (isMounted) {
          setOverview(defaultOverview);
          setError(loadError?.message || 'Unable to load this teammate right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const memberName = overview.user?.name || initialMember?.name || 'Team member';
  const statCards = [
    { label: 'Projects', value: overview.stats.projects },
    { label: 'Reported bugs', value: overview.stats.bugsReported },
    { label: 'Resolved bugs', value: overview.stats.bugsResolved },
    { label: 'Success rate', value: `${overview.stats.successRate}%` }
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-[#7A7A7A]">
          Public profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {memberName}
        </h1>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="space-y-5 border-t border-gray-200 pt-5 dark:border-[#242A33]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contribution snapshot</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {statCards.map((card) => (
            <div key={card.label} className={innerPanelClass}>
              <p className="text-[12px] text-gray-500 dark:text-[#8A8A8A]">{card.label}</p>
              <p className="mt-3 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
                {loading ? '...' : card.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default UserProfile;
