import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import useAuth from '../hooks/useAuth';
import ProjectCard from '../components/projects/ProjectCard';

const PROJECT_ROLES = [
  'FULLSTACK',
  'FRONTEND',
  'BACKEND',
  'QA',
  'DESIGNER',
  'OTHER'
];

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-[#2B3038] dark:bg-[#101318] dark:text-white';

const Projects = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');

  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [joinForm, setJoinForm] = useState({ inviteCode: '', role: 'FULLSTACK' });
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const loadProjects = async () => {
    setError('');

    try {
      const response = await api.get('/projects/my-projects');
      setProjects(response?.data?.data || []);
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load your projects right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (!location.state?.notice) {
      return;
    }

    setNotice(location.state.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handleCreateProject = async (event) => {
    event.preventDefault();

    const normalizedName = createForm.name.trim();
    const normalizedDescription = createForm.description.trim();

    if (!normalizedName) {
      setCreateError('Project name is required.');
      return;
    }

    setCreateLoading(true);
    setCreateError('');
    setJoinError('');
    setNotice('');

    try {
      await api.post('/projects', {
        name: normalizedName,
        description: normalizedDescription
      });

      setCreateForm({ name: '', description: '' });
      setNotice('Project created successfully.');
      setActiveTab('all');
      await loadProjects();
    } catch (requestError) {
      setCreateError(requestError?.message || 'Unable to create project.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinProject = async (event) => {
    event.preventDefault();

    const normalizedInviteCode = joinForm.inviteCode.trim();

    if (!normalizedInviteCode) {
      setJoinError('Invite code is required.');
      return;
    }

    setJoinLoading(true);
    setJoinError('');
    setCreateError('');
    setNotice('');

    try {
      await api.post('/projects/join', {
        inviteCode: normalizedInviteCode,
        role: joinForm.role
      });

      setJoinForm({ inviteCode: '', role: 'FULLSTACK' });
      setNotice('Project joined successfully.');
      setActiveTab('all');
      await loadProjects();
    } catch (requestError) {
      setJoinError(requestError?.message || 'Unable to join project.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-gray-200 pb-6 dark:border-[#242A33]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#8A8A8A]">
            Projects
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Projects
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-[#C9CDD4]">
            Manage your workspaces and collaborate with your team.
          </p>
        </div>
      </section>

      <section className="border-b border-gray-200 dark:border-[#242A33]">
        <div className="flex flex-wrap gap-6 text-sm">
          {[
            { id: 'all', label: `All projects (${projects.length})` },
            { id: 'manage', label: 'Create or join' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-3 font-medium transition ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-[#8A8A8A] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {activeTab === 'all' ? (
        <section className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {loading ? (
              <div className="border-t border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-[#2A2A2A] dark:text-[#8A8A8A] lg:col-span-2">
                Loading your projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="border-t border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-[#2A2A2A] dark:text-[#8A8A8A] lg:col-span-2">
                You are not part of any project yet.
              </div>
            ) : (
              projects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  currentUserId={user?._id}
                />
              ))
            )}
          </div>
        </section>
      ) : (
        <section className="grid gap-10 xl:grid-cols-2 xl:gap-12">
          <form
            onSubmit={handleCreateProject}
            className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-[#242A33] dark:bg-[#12161C] sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Create project</h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="create-project-name" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Project name
                </label>
                <input
                  id="create-project-name"
                  type="text"
                  value={createForm.name}
                  disabled={createLoading}
                  onChange={(event) => {
                    setCreateForm((current) => ({ ...current, name: event.target.value }));
                    if (createError) {
                      setCreateError('');
                    }
                  }}
                  placeholder="Bug-Sense Web App"
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="create-project-description" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Description
                </label>
                <textarea
                  id="create-project-description"
                  value={createForm.description}
                  disabled={createLoading}
                  onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="A short description so people understand the project."
                  className={`${fieldClass} min-h-[108px] resize-none`}
                />
              </div>

              {createError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {createError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={createLoading}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createLoading ? 'Creating project...' : 'Create project'}
              </button>
            </div>
          </form>

          <form
            onSubmit={handleJoinProject}
            className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-[#242A33] dark:bg-[#12161C] sm:p-6"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Join project</h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="join-invite-code" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Invite code
                </label>
                <input
                  id="join-invite-code"
                  type="text"
                  value={joinForm.inviteCode}
                  disabled={joinLoading}
                  onChange={(event) => {
                    setJoinForm((current) => ({ ...current, inviteCode: event.target.value.toUpperCase() }));
                    if (joinError) {
                      setJoinError('');
                    }
                  }}
                  placeholder="AB12CD34"
                  className={`${fieldClass} font-mono uppercase tracking-[0.18em]`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="join-role" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Role
                </label>
                <select
                  id="join-role"
                  value={joinForm.role}
                  disabled={joinLoading}
                  onChange={(event) => setJoinForm((current) => ({ ...current, role: event.target.value }))}
                  className={fieldClass}
                >
                  {PROJECT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.toLowerCase().replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {joinError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {joinError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={joinLoading}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2B3038] dark:bg-[#101318] dark:text-[#E2E8F0] dark:hover:bg-[#171B22]"
              >
                {joinLoading ? 'Joining project...' : 'Join project'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default Projects;
