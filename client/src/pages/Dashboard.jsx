import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import useAuth from '../hooks/useAuth';
import ProjectCard from '../components/projects/ProjectCard';

const defaultOverview = {
  projectsJoined: 0,
  bugsReported: 0,
  bugsAssigned: 0,
  fixesSubmitted: 0,
  fixesAccepted: 0,
  fixesRejected: 0,
  successRate: 0
};

const Dashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(defaultOverview);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setError('');

      try {
        const [dashboardResponse, projectsResponse] = await Promise.all([
          api.get('/users/me/dashboard'),
          api.get('/projects/my-projects')
        ]);

        if (!isMounted) {
          return;
        }

        setOverview(dashboardResponse?.data?.data || defaultOverview);
        setProjects(projectsResponse?.data?.data || []);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || 'Unable to load your dashboard right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const recentProjects = projects.slice(0, 4);
  const activeProjects = overview.projectsJoined;

  const overviewCards = [
    {
      label: 'Active projects',
      value: activeProjects,
      meta: 'Projects you can work in now'
    },
    {
      label: 'Assigned to you',
      value: overview.bugsAssigned,
      meta: overview.bugsAssigned === 1 ? '1 issue needs your attention' : `${overview.bugsAssigned} issues need your attention`
    },
    {
      label: 'Reported bugs',
      value: overview.bugsReported,
      meta: 'Reports you opened across projects'
    },
    {
      label: 'Fix success',
      value: `${overview.successRate}%`,
      meta: `${overview.fixesAccepted} accepted · ${overview.fixesRejected} rejected`
    }
  ];

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="space-y-4 border-b border-gray-200 pb-6 dark:border-[#242A33]" id="overview">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#8A8A8A]">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Welcome'}
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-[#C9CDD4]">
            Here’s what’s happening across your projects right now.
          </p>
        </div>

        <div className="grid gap-px border-y border-gray-200 bg-gray-200 dark:border-[#242A33] dark:bg-[#242A33] sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <div key={card.label} className="bg-[#FAFAFA] px-5 py-5 dark:bg-[#0E0E0E]">
              <p className="text-[13px] font-medium text-gray-500 dark:text-[#8A8A8A]">{card.label}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                {loading ? '...' : card.value}
              </p>
              <p className="mt-3 text-sm text-gray-500 dark:text-[#8A8A8A]">
                {card.meta}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5" id="recent-projects">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-[#242A33]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">Your projects</h2>
          <Link
            to="/projects"
            className="text-sm font-medium text-gray-700 transition hover:text-gray-900 dark:text-[#E2E8F0] dark:hover:text-white"
          >
            View all →
          </Link>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="border-t border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#2A2A2A] dark:text-[#8A8A8A]">
              Loading your projects...
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="border-t border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#2A2A2A] dark:text-[#8A8A8A]">
              No projects yet. Head to Projects to create or join one.
            </div>
          ) : (
            recentProjects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                currentUserId={user?._id}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
