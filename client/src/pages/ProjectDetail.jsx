import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/axios';
import useAuth from '../hooks/useAuth';
import {
  BUG_ENVIRONMENT_OPTIONS,
  BUG_SEVERITY_WITH_UNCONFIRMED,
  BUG_TYPE_OPTIONS,
  bugSeverityTone,
  bugStatusTone,
  getEntityId
} from '../utils/bugs';
import { formatDate, formatLabel } from '../utils/formatters';

const PROJECT_ROLES = ['FULLSTACK', 'FRONTEND', 'BACKEND', 'QA', 'DESIGNER', 'OTHER'];

const emptyProjectPanel = {
  stats: null,
  members: null,
  workload: []
};

const initialBugForm = {
  title: '',
  description: '',
  bugType: 'FUNCTIONAL',
  environment: 'PRODUCTION',
  moduleName: '',
  stackTrace: ''
};

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-[#2B3038] dark:bg-[#101318] dark:text-white';

const issueToolbarFieldClass =
  'min-h-[3.25rem] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-[#2B3038] dark:bg-[#101318] dark:text-white';

const issueToolbarSelectClass =
  `${issueToolbarFieldClass} appearance-none pr-12`;

const textareaClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-[14px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-[#2B3038] dark:bg-[#101318] dark:text-white';

const primaryButtonClass =
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2B3038] dark:bg-[#101318] dark:text-[#E2E8F0] dark:hover:bg-[#171B22]';

const dangerButtonClass =
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[14px] font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20';

const ProjectDetail = () => {
  const { user } = useAuth();
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [project, setProject] = useState(location.state?.project || null);
  const [projectPanel, setProjectPanel] = useState(emptyProjectPanel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isInviteVisible, setIsInviteVisible] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [accessNotice, setAccessNotice] = useState('');
  const [addMemberForm, setAddMemberForm] = useState({
    email: '',
    role: 'FULLSTACK'
  });
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [leaveProjectLoading, setLeaveProjectLoading] = useState(false);
  const [leaveProjectError, setLeaveProjectError] = useState('');
  const [roleDrafts, setRoleDrafts] = useState({});
  const [roleUpdateLoadingId, setRoleUpdateLoadingId] = useState('');
  const [roleUpdateError, setRoleUpdateError] = useState('');
  const [removeMemberLoadingId, setRemoveMemberLoadingId] = useState('');
  const [removeMemberError, setRemoveMemberError] = useState('');
  const [transferLeadLoadingId, setTransferLeadLoadingId] = useState('');
  const [transferLeadError, setTransferLeadError] = useState('');
  const [memberActionDialog, setMemberActionDialog] = useState(null);
  const [quickView, setQuickView] = useState('all');
  const [bugSearch, setBugSearch] = useState('');
  const [bugFilters, setBugFilters] = useState({
    status: '',
    severity: ''
  });
  const [bugs, setBugs] = useState([]);
  const [bugLoading, setBugLoading] = useState(true);
  const [bugError, setBugError] = useState('');
  const [bugForm, setBugForm] = useState(initialBugForm);
  const [createBugLoading, setCreateBugLoading] = useState(false);
  const [createBugError, setCreateBugError] = useState('');
  const [isCreateBugOpen, setIsCreateBugOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('issues');

  const loadProjectSummary = useCallback(async () => {
    setError('');

    try {
      const [projectsResponse, statsResponse, membersResponse, workloadResponse] = await Promise.all([
        api.get('/projects/my-projects'),
        api.get(`/projects/${projectId}/stats`),
        api.get(`/projects/${projectId}/members`),
        api.get(`/projects/${projectId}/workload`)
      ]);

      const nextProject =
        projectsResponse?.data?.data?.find((item) => item._id === projectId) || null;

      if (!nextProject) {
        setError('Project not found or you no longer have access to it.');
        setProject(null);
      } else {
        setProject(nextProject);
      }

      setProjectPanel({
        stats: statsResponse?.data?.data || null,
        members: membersResponse?.data?.data || null,
        workload: workloadResponse?.data?.data || []
      });
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load this project right now.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadBugs = useCallback(async () => {
    setBugLoading(true);
    setBugError('');

    try {
      const params = {
        limit: bugFilters.status === 'UNASSIGNED' ? 100 : 20
      };

      if (bugFilters.status && bugFilters.status !== 'UNASSIGNED') {
        params.status = bugFilters.status;
      }

      if (bugFilters.severity) {
        params.severity = bugFilters.severity;
      }

      const response = await api.get(`/projects/${projectId}/bugs`, { params });
      setBugs(response?.data?.data?.bugs || []);
    } catch (loadError) {
      setBugError(loadError?.message || 'Unable to load bugs right now.');
    } finally {
      setBugLoading(false);
    }
  }, [bugFilters.severity, bugFilters.status, projectId]);

  useEffect(() => {
    loadProjectSummary();
  }, [loadProjectSummary]);

  useEffect(() => {
    loadBugs();
  }, [loadBugs]);

  useEffect(() => {
    setMobileTab('issues');
  }, [projectId]);

  const teamMembers = useMemo(() => {
    if (!projectPanel.members) {
      return [];
    }

    const entries = [];
    const seen = new Set();

    if (projectPanel.members.lead?._id) {
      entries.push({
        ...projectPanel.members.lead,
        role: 'LEAD'
      });
      seen.add(projectPanel.members.lead._id);
    }

    for (const member of projectPanel.members.members || []) {
      const memberId = member.user?._id;
      if (!memberId || seen.has(memberId)) {
        continue;
      }

      seen.add(memberId);
      entries.push({
        ...member.user,
        role: member.role
      });
    }

    return entries;
  }, [projectPanel.members]);

  useEffect(() => {
    setRoleDrafts((current) => {
      const nextDrafts = {};

      for (const member of teamMembers) {
        if (member.role !== 'LEAD') {
          nextDrafts[member._id] = current[member._id] || member.role;
        }
      }

      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextDrafts);

      if (
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => current[key] === nextDrafts[key])
      ) {
        return current;
      }

      return nextDrafts;
    });
  }, [teamMembers]);

  const workloadByMemberId = projectPanel.workload.reduce((lookup, entry) => {
    const developerId = entry.developer?._id;

    if (developerId) {
      lookup[developerId] = entry.assignedBugs;
    }

    return lookup;
  }, {});

  const myRole = (() => {
    if (!project || !user?._id) {
      return 'Member';
    }

    if (project.lead === user._id) {
      return 'Lead';
    }

    const membership = project.members?.find(
      (member) => member.user === user._id || member.user?._id === user._id
    );

    return membership?.role ? formatLabel(membership.role) : 'Member';
  })();

  const isLead = Boolean(project && user?._id && project.lead === user._id);
  useEffect(() => {
    if (!isLead && mobileTab === 'admin') {
      setMobileTab('team');
    }
  }, [isLead, mobileTab]);
  const projectLeadName = projectPanel.members?.lead?.name || project?.lead?.name || 'Lead';
  const pendingReviewBugs = projectPanel.stats?.bugs?.pendingReview ?? 0;
  const openBugs = projectPanel.stats?.bugs?.open ?? 0;
  const assignedBugs = projectPanel.stats?.bugs?.assigned ?? 0;
  const awaitingVerificationBugs = projectPanel.stats?.bugs?.awaitingVerification ?? 0;
  const reviewBugs = projectPanel.stats?.bugs?.reviewRequested ?? 0;
  const pendingFixes = projectPanel.stats?.fixes?.pending ?? 0;
  const resolvedBugs = projectPanel.stats?.bugs?.resolved ?? 0;
  const normalizedBugSearch = bugSearch.trim().toLowerCase();
  const visibleBugs = bugs.filter((bug) => {
    if (quickView === 'mine' && getEntityId(bug.assignedTo) !== user?._id) {
      return false;
    }

    if (bugFilters.status === 'UNASSIGNED' && getEntityId(bug.assignedTo)) {
      return false;
    }

    if (!normalizedBugSearch) {
      return true;
    }

    return [
      bug.title,
      bug.description,
      bug.moduleName,
      bug.assignedTo?.name,
      bug.createdBy?.name,
      bug.environment,
      bug.bugType
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedBugSearch));
  });
  const hasActiveIssueFilters = Boolean(
    quickView !== 'all' || bugFilters.status || bugFilters.severity || normalizedBugSearch
  );

  const handleToggleInviteCode = async () => {
    if (isInviteVisible) {
      setIsInviteVisible(false);
      setAccessNotice('');
      return;
    }

    if (inviteCode) {
      setInviteError('');
      setIsInviteVisible(true);
      return;
    }

    setInviteLoading(true);
    setInviteError('');

    try {
      const response = await api.get(`/projects/${projectId}/invite-code`);
      const nextInviteCode = response?.data?.data?.inviteCode || '';
      setInviteCode(nextInviteCode);
      setIsInviteVisible(true);
    } catch (requestError) {
      setInviteError(requestError?.message || 'Unable to fetch invite code.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!inviteCode || !isInviteVisible) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteCode);
      setAccessNotice('Invite code copied.');
      setInviteError('');
    } catch {
      setInviteError('Unable to copy invite code.');
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();

    const normalizedEmail = addMemberForm.email.trim();

    if (!normalizedEmail) {
      setAddMemberError('Email is required.');
      return;
    }

    setAddMemberLoading(true);
    setAddMemberError('');
    setAccessNotice('');

    try {
      await api.patch(`/projects/${projectId}/add-member`, {
        email: normalizedEmail,
        role: addMemberForm.role
      });

      setAddMemberForm({
        email: '',
        role: 'FULLSTACK'
      });
      setAccessNotice('Member added successfully.');
      await loadProjectSummary();
    } catch (requestError) {
      setAddMemberError(requestError?.message || 'Unable to add member.');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleCreateBug = async (event) => {
    event.preventDefault();

    const normalizedTitle = bugForm.title.trim();
    const normalizedDescription = bugForm.description.trim();

    if (!normalizedTitle || !normalizedDescription) {
      setCreateBugError('Title and description are required.');
      return;
    }

    setCreateBugLoading(true);
    setCreateBugError('');
    setNotice('');

    try {
      await api.post(`/projects/${projectId}/bugs`, {
        title: normalizedTitle,
        description: normalizedDescription,
        bugType: bugForm.bugType,
        environment: bugForm.environment,
        moduleName: bugForm.moduleName.trim(),
        stackTrace: bugForm.stackTrace.trim()
      });

      setBugForm(initialBugForm);
      setNotice('Bug reported successfully.');
      setIsCreateBugOpen(false);
      await Promise.all([loadProjectSummary(), loadBugs()]);
    } catch (requestError) {
      setCreateBugError(requestError?.message || 'Unable to report this bug.');
    } finally {
      setCreateBugLoading(false);
    }
  };

  const handleLeaveProject = async () => {
    setLeaveProjectLoading(true);
    setLeaveProjectError('');
    setNotice('');

    try {
      await api.patch(`/projects/${projectId}/leave`);
      navigate('/projects', {
        replace: true,
        state: {
          notice: `You left ${project?.name || 'the project'}.`
        }
      });
    } catch (requestError) {
      setLeaveProjectError(requestError?.message || 'Unable to leave this project right now.');
    } finally {
      setLeaveProjectLoading(false);
    }
  };

  const handleRoleDraftChange = (memberId, role) => {
    setRoleDrafts((current) => ({
      ...current,
      [memberId]: role
    }));

    if (roleUpdateError || removeMemberError || transferLeadError) {
      setRoleUpdateError('');
      setRemoveMemberError('');
      setTransferLeadError('');
    }
  };

  const handleChangeMemberRole = async (member) => {
    const nextRole = roleDrafts[member._id] || member.role;

    if (nextRole === member.role) {
      setRoleUpdateError('Choose a different role before saving.');
      return;
    }

    setRoleUpdateLoadingId(member._id);
    setRoleUpdateError('');
    setNotice('');

    try {
      await api.patch(`/projects/${projectId}/members/${member._id}/role`, {
        role: nextRole
      });

      setNotice(`${member.name}'s role was updated to ${formatLabel(nextRole)}.`);
      await loadProjectSummary();
    } catch (requestError) {
      setRoleUpdateError(requestError?.message || 'Unable to update this member role.');
    } finally {
      setRoleUpdateLoadingId('');
    }
  };

  const performTransferLead = async (member) => {
    setTransferLeadLoadingId(member._id);
    setTransferLeadError('');
    setRoleUpdateError('');
    setRemoveMemberError('');
    setNotice('');

    try {
      await api.patch(`/projects/${projectId}/transfer-lead`, {
        newLeadId: member._id
      });

      setNotice(`${member.name} is now the project lead.`);
      await loadProjectSummary();
      setMobileTab('team');
    } catch (requestError) {
      setTransferLeadError(requestError?.message || 'Unable to transfer project leadership.');
    } finally {
      setTransferLeadLoadingId('');
    }
  };

  const performRemoveMember = async (member) => {
    setRemoveMemberLoadingId(member._id);
    setRemoveMemberError('');
    setRoleUpdateError('');
    setNotice('');

    try {
      await api.patch(`/projects/${projectId}/remove-member`, {
        userId: member._id
      });

      setNotice(`${member.name} was removed from the project.`);
      await Promise.all([loadProjectSummary(), loadBugs()]);
    } catch (requestError) {
      setRemoveMemberError(requestError?.message || 'Unable to remove this member.');
    } finally {
      setRemoveMemberLoadingId('');
    }
  };

  const openTransferLeadDialog = (member) => {
    setMemberActionDialog({
      type: 'transfer',
      member,
      title: 'Transfer leadership',
      description: `Transfer project leadership to ${member.name}? You’ll lose lead-only controls after this change.`,
      confirmLabel: 'Transfer lead'
    });
  };

  const openRemoveMemberDialog = (member) => {
    setMemberActionDialog({
      type: 'remove',
      member,
      title: 'Remove member',
      description: `Remove ${member.name} from this project? Their assigned work will be updated automatically.`,
      confirmLabel: 'Remove member'
    });
  };

  const closeMemberActionDialog = () => {
    setMemberActionDialog(null);
  };

  const handleConfirmMemberAction = async () => {
    if (!memberActionDialog) {
      return;
    }

    const { type, member } = memberActionDialog;
    closeMemberActionDialog();

    if (type === 'transfer') {
      await performTransferLead(member);
      return;
    }

    if (type === 'remove') {
      await performRemoveMember(member);
    }
  };

  const openPublicProfile = (member) => {
    navigate(`/people/${member._id}`, {
      state: {
        member: {
          _id: member._id,
          name: member.name,
          role: member.role
        }
      }
    });
  };

  const handleMemberCardKeyDown = (event, member) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPublicProfile(member);
    }
  };

  const workspaceTabs = [
    { id: 'issues', label: 'Issues' },
    { id: 'team', label: 'Team' },
    ...(isLead ? [{ id: 'admin', label: 'Admin' }] : []),
    { id: 'project', label: 'Project' }
  ];

  const issueStatusOptions = [
    { label: 'Unassigned', status: 'UNASSIGNED' },
    { label: 'Pending review', status: 'PENDING_REVIEW' },
    { label: 'Open', status: 'OPEN' },
    { label: 'Assigned', status: 'ASSIGNED' },
    { label: 'Awaiting verification', status: 'AWAITING_VERIFICATION' },
    { label: 'Review requested', status: 'REVIEW_REQUESTED' },
    { label: 'Resolved', status: 'RESOLVED' },
    { label: 'Reopened', status: 'REOPENED' },
    { label: 'Rejected', status: 'REJECTED' }
  ];

  const projectSummaryItems = [
    { label: 'Your role', value: myRole },
    { label: 'Lead', value: projectLeadName },
    { label: 'Team', value: `${teamMembers.length} member${teamMembers.length === 1 ? '' : 's'}` },
    { label: 'Pending fixes', value: pendingFixes }
  ];
  const leadAttentionItems = [
    {
      label: 'New reports',
      count: pendingReviewBugs,
      status: 'PENDING_REVIEW',
      hint: 'Fresh reports waiting for lead review before they enter the workflow.'
    },
    {
      label: 'Severity requests',
      count: reviewBugs,
      status: 'REVIEW_REQUESTED',
      hint: 'Bugs where the team asked the lead to review severity.'
    },
    {
      label: 'Fixes to verify',
      count: awaitingVerificationBugs,
      status: 'AWAITING_VERIFICATION',
      hint: 'Submitted fixes waiting for lead verification.'
    }
  ];

  const clearIssueFilters = () => {
    setQuickView('all');
    setBugSearch('');
    setBugFilters({ status: '', severity: '' });
  };

  const applyLeadAttentionFilter = (status) => {
    setQuickView('all');
    setBugSearch('');
    setBugFilters({
      status,
      severity: ''
    });
  };

  const openLeadAttentionQueue = (status) => {
    applyLeadAttentionFilter(status);
    setMobileTab('issues');
  };

  const renderIssueWorkspace = (idSuffix) => (
    <>
      <div className="px-4 py-5 sm:px-5 sm:py-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All issues</h2>
              <span className="text-sm text-gray-400 dark:text-[#8A8A8A]">{visibleBugs.length}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#8A8A8A]">
              Search, filter, and move work through the project.
            </p>
          </div>

          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.25fr)_180px_180px_180px_auto]">
            <input
              type="search"
              value={bugSearch}
              onChange={(event) => setBugSearch(event.target.value)}
              placeholder="Search issues"
              className={issueToolbarFieldClass}
            />
            <div className="relative">
              <select
                value={quickView}
                onChange={(event) => setQuickView(event.target.value)}
                className={issueToolbarSelectClass}
              >
                <option value="all">All issues</option>
                <option value="mine">Assigned to me</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-500 dark:text-[#8A8A8A]">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <div className="relative">
              <select
                value={bugFilters.status}
                onChange={(event) => setBugFilters((current) => ({ ...current, status: event.target.value }))}
                className={issueToolbarSelectClass}
              >
                <option value="">All statuses</option>
                {issueStatusOptions.map((item) => (
                  <option key={item.status} value={item.status}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-500 dark:text-[#8A8A8A]">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <div className="relative">
              <select
                value={bugFilters.severity}
                onChange={(event) => setBugFilters((current) => ({ ...current, severity: event.target.value }))}
                className={issueToolbarSelectClass}
              >
                <option value="">All severities</option>
                {BUG_SEVERITY_WITH_UNCONFIRMED.map((severity) => (
                  <option key={severity} value={severity}>
                    {formatLabel(severity)}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-500 dark:text-[#8A8A8A]">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreateBugOpen((current) => !current);
                setCreateBugError('');
              }}
              className={`${primaryButtonClass} w-full lg:w-auto lg:px-5`}
            >
              {isCreateBugOpen ? 'Close form' : 'New issue'}
            </button>
          </div>
        </div>
      </div>

      {isCreateBugOpen ? (
        <div className="border-b border-gray-200 px-4 py-5 dark:border-[#242A33] sm:px-5 sm:py-6">
          <form
            onSubmit={handleCreateBug}
            className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#242A33] dark:bg-[#12161C] sm:p-5"
          >
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Create issue</h3>
              <p className="text-sm text-gray-500 dark:text-[#8A8A8A]">
                Capture the issue clearly so the team can triage it quickly.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5 lg:col-span-2">
                <label htmlFor={`bug-title-${idSuffix}`} className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Title
                </label>
                <input
                  id={`bug-title-${idSuffix}`}
                  type="text"
                  value={bugForm.title}
                  disabled={createBugLoading}
                  onChange={(event) => {
                    setBugForm((current) => ({ ...current, title: event.target.value }));
                    if (createBugError) {
                      setCreateBugError('');
                    }
                  }}
                  placeholder="Checkout API returns the wrong payload"
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <label htmlFor={`bug-description-${idSuffix}`} className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Description
                </label>
                <textarea
                  id={`bug-description-${idSuffix}`}
                  value={bugForm.description}
                  rows={4}
                  disabled={createBugLoading}
                  onChange={(event) => setBugForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe the issue, the impact, and how someone can reproduce it."
                  className={textareaClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`bug-type-${idSuffix}`} className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Type
                </label>
                <select
                  id={`bug-type-${idSuffix}`}
                  value={bugForm.bugType}
                  disabled={createBugLoading}
                  onChange={(event) => setBugForm((current) => ({ ...current, bugType: event.target.value }))}
                  className={fieldClass}
                >
                  {BUG_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`bug-environment-${idSuffix}`} className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Environment
                </label>
                <select
                  id={`bug-environment-${idSuffix}`}
                  value={bugForm.environment}
                  disabled={createBugLoading}
                  onChange={(event) => setBugForm((current) => ({ ...current, environment: event.target.value }))}
                  className={fieldClass}
                >
                  {BUG_ENVIRONMENT_OPTIONS.map((environment) => (
                    <option key={environment} value={environment}>
                      {formatLabel(environment)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`bug-module-${idSuffix}`} className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Module name
                </label>
                <input
                  id={`bug-module-${idSuffix}`}
                  type="text"
                  value={bugForm.moduleName}
                  disabled={createBugLoading}
                  onChange={(event) => setBugForm((current) => ({ ...current, moduleName: event.target.value }))}
                  placeholder="Checkout service"
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor={`bug-stack-trace-${idSuffix}`} className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Stack trace
                </label>
                <input
                  id={`bug-stack-trace-${idSuffix}`}
                  type="text"
                  value={bugForm.stackTrace}
                  disabled={createBugLoading}
                  onChange={(event) => setBugForm((current) => ({ ...current, stackTrace: event.target.value }))}
                  placeholder="Optional stack trace or failing method"
                  className={fieldClass}
                />
              </div>
            </div>

            {createBugError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {createBugError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={createBugLoading} className={primaryButtonClass}>
                {createBugLoading ? 'Reporting issue...' : 'Create issue'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBugForm(initialBugForm);
                  setCreateBugError('');
                  setIsCreateBugOpen(false);
                }}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="px-4 py-5 sm:px-5 sm:py-6">
        {bugError ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {bugError}
          </div>
        ) : null}

        {hasActiveIssueFilters ? (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearIssueFilters}
              className="text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-[#A1A1AA] dark:hover:text-white"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div>
          <div className="hidden grid-cols-[minmax(0,1.8fr)_120px_110px_140px_140px_96px] gap-4 border-b border-gray-200 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:border-[#242A33] dark:text-[#7A7A7A] md:grid">
            <span>Issue</span>
            <span>Status</span>
            <span>Severity</span>
            <span>Assignee</span>
            <span>Reporter</span>
            <span>Created</span>
          </div>

          <div className="mb-3 flex items-center justify-between md:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#7A7A7A]">
              Issue list
            </p>
            <span className="text-[12px] text-gray-500 dark:text-[#8A8A8A]">
              {visibleBugs.length}
            </span>
          </div>

          {bugLoading ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-[#8A8A8A]">
              Loading issues...
            </div>
          ) : visibleBugs.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-[#8A8A8A]">
              No issues match the current view.
            </div>
          ) : (
            <div className="space-y-3 pt-3">
              {visibleBugs.map((bug) => (
                <Link
                  key={bug._id}
                  to={`/projects/${projectId}/bugs/${bug._id}`}
                  state={{ project }}
                  className="block rounded-2xl border border-gray-200 bg-white px-4 py-4 transition hover:border-gray-300 hover:bg-gray-50 dark:border-[#242A33] dark:bg-[#12161C] dark:hover:border-[#303743] dark:hover:bg-[#171B22]"
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.8fr)_120px_110px_140px_140px_96px] md:items-start md:gap-x-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {bug.title}
                        </p>
                        {getEntityId(bug.assignedTo) === user?._id ? (
                          <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-[#111111]">
                            Yours
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-[#8A8A8A]">
                        {bug.moduleName ? `${formatLabel(bug.bugType)} · ${bug.moduleName}` : formatLabel(bug.bugType)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-gray-500 dark:text-[#8A8A8A] md:hidden">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${bugStatusTone(bug.status)}`}>
                          {formatLabel(bug.status)}
                        </span>
                        <span className={`font-medium ${bugSeverityTone(bug.severity)}`}>
                          {formatLabel(bug.severity)}
                        </span>
                        <span>{bug.assignedTo?.name || '—'}</span>
                        <span>{formatDate(bug.createdAt)}</span>
                      </div>
                    </div>

                    <div className="hidden md:block md:self-start">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${bugStatusTone(bug.status)}`}>
                        {formatLabel(bug.status)}
                      </span>
                    </div>
                    <div className={`hidden text-sm font-medium md:block md:self-start ${bugSeverityTone(bug.severity)}`}>
                      {formatLabel(bug.severity)}
                    </div>
                    <div className="hidden text-sm text-gray-600 dark:text-[#C9CDD4] md:block md:self-start">
                      {bug.assignedTo?.name || '—'}
                    </div>
                    <div className="hidden text-sm text-gray-600 dark:text-[#C9CDD4] md:block md:self-start">
                      {bug.createdBy?.name || '—'}
                    </div>
                    <div className="hidden text-sm text-gray-500 dark:text-[#8A8A8A] md:block md:self-start">
                      {formatDate(bug.createdAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const teamWorkspace = (
    <section className="border-t border-gray-200 dark:border-[#242A33]">
      <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#7A7A7A] sm:px-5">
        {teamMembers.length} member{teamMembers.length === 1 ? '' : 's'}
      </div>

      {roleUpdateError ? (
        <div className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 sm:mx-5">
          {roleUpdateError}
        </div>
      ) : null}

      {removeMemberError ? (
        <div className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 sm:mx-5">
          {removeMemberError}
        </div>
      ) : null}

      {transferLeadError ? (
        <div className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 sm:mx-5">
          {transferLeadError}
        </div>
      ) : null}

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-[#8A8A8A] sm:px-5">
          Loading team...
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-[#8A8A8A] sm:px-5">
          No team details available.
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-[#242A33]">
            {teamMembers.map((member) => {
              const memberWorkload = workloadByMemberId[member._id] || 0;
              const selectedRole = roleDrafts[member._id] || member.role;
              const isRoleUpdating = roleUpdateLoadingId === member._id;
              const isRemoving = removeMemberLoadingId === member._id;
              const isTransferring = transferLeadLoadingId === member._id;
              const canManageMember = isLead && member.role !== 'LEAD';
              const hasRoleChanges = selectedRole !== member.role;
              const memberInitial = member.name?.trim()?.charAt(0)?.toUpperCase() || '?';

              return (
                <div
                  key={member._id}
                  role="link"
                  tabIndex={0}
                  onClick={() => openPublicProfile(member)}
                  onKeyDown={(event) => handleMemberCardKeyDown(event, member)}
                  className="cursor-pointer space-y-4 px-4 py-5 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:bg-[#11151B] sm:px-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 dark:border-[#2B3038] dark:bg-[#101318] dark:text-white">
                        {memberInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{member.name}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-[#8A8A8A]">
                          {member.role === 'LEAD' ? 'Project lead' : formatLabel(member.role)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{memberWorkload}</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-[#8A8A8A]">
                        assigned
                      </p>
                    </div>
                  </div>

                  {canManageMember ? (
                    <div
                      className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <div className="w-full sm:w-auto sm:min-w-[220px]">
                        <label className="sr-only" htmlFor={`member-role-${member._id}`}>
                          Change role for {member.name}
                        </label>
                        <select
                          id={`member-role-${member._id}`}
                          value={selectedRole}
                          disabled={isRoleUpdating || isRemoving || isTransferring}
                          onChange={(event) => handleRoleDraftChange(member._id, event.target.value)}
                          className={fieldClass}
                        >
                          {PROJECT_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {formatLabel(role)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!hasRoleChanges || isRoleUpdating || isRemoving || isTransferring}
                          onClick={() => handleChangeMemberRole(member)}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2B3038] dark:bg-[#101318] dark:text-[#E2E8F0] dark:hover:bg-[#171B22]"
                        >
                          {isRoleUpdating ? 'Saving...' : 'Save role'}
                        </button>
                        <button
                          type="button"
                          disabled={isRoleUpdating || isRemoving || isTransferring}
                          onClick={() => openTransferLeadDialog(member)}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2B3038] dark:bg-[#101318] dark:text-[#E2E8F0] dark:hover:bg-[#171B22]"
                        >
                          {isTransferring ? 'Transferring...' : 'Make lead'}
                        </button>
                        <button
                          type="button"
                          disabled={isRoleUpdating || isRemoving || isTransferring}
                          onClick={() => openRemoveMemberDialog(member)}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                          {isRemoving ? 'Removing...' : 'Remove member'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );

  const projectWorkspace = (
      <div className="space-y-6 px-4 py-5 sm:px-5 sm:py-6">
        <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-[#242A33]">
        <div className="space-y-3">
          {projectSummaryItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 text-sm text-gray-600 dark:text-[#C9CDD4]"
            >
              <span>{item.label}</span>
              <span className="text-right font-medium text-gray-900 dark:text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-[#242A33]">
        <div className="space-y-2 text-sm text-gray-600 dark:text-[#C9CDD4]">
          <div className="flex items-center justify-between gap-3">
            <span>Open issues</span>
            <span className="font-medium text-gray-900 dark:text-white">{openBugs}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Assigned</span>
            <span className="font-medium text-gray-900 dark:text-white">{assignedBugs}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>In review</span>
            <span className="font-medium text-gray-900 dark:text-white">{reviewBugs}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Resolved</span>
            <span className="font-medium text-gray-900 dark:text-white">{resolvedBugs}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-5 dark:border-[#242A33]">
        {!isLead ? (
          <button
            type="button"
            onClick={handleLeaveProject}
            disabled={leaveProjectLoading}
            className={`${dangerButtonClass} w-full justify-center`}
          >
            {leaveProjectLoading ? 'Leaving project...' : 'Leave project'}
          </button>
        ) : (
          <p className="text-sm leading-6 text-gray-500 dark:text-[#8A8A8A]">
            Transfer leadership before leaving this project.
          </p>
        )}

        {leaveProjectError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {leaveProjectError}
          </div>
        ) : null}
      </div>

      {isLead ? (
        <section className="space-y-5 border-t border-gray-200 pt-5 dark:border-[#242A33]">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project access</h3>
            <p className="text-sm text-gray-500 dark:text-[#8A8A8A]">
              Manage the invite code and add teammates without leaving the workspace.
            </p>
          </div>

          {accessNotice ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              {accessNotice}
            </div>
          ) : null}

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#242A33] dark:bg-[#12161C]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Invite code</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleToggleInviteCode}
                  disabled={inviteLoading}
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2C2C2C] dark:bg-[#161616] dark:text-[#E2E8F0] dark:hover:bg-[#202020]"
                >
                  {inviteLoading ? 'Loading...' : isInviteVisible ? 'Hide' : 'Show'}
                </button>
                {isInviteVisible && inviteCode ? (
                  <button
                    type="button"
                    onClick={handleCopyInviteCode}
                    className={primaryButtonClass.replace('px-4 py-2.5 text-[14px]', 'px-3 py-2 text-[13px]')}
                  >
                    Copy
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-3 font-mono text-[14px] tracking-[0.2em] text-gray-900 dark:border-[#2A2A2A] dark:text-white">
              {isInviteVisible && inviteCode ? inviteCode : '••••••••'}
            </div>

            {inviteError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {inviteError}
              </div>
            ) : null}
          </div>

          <form onSubmit={handleAddMember} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#242A33] dark:bg-[#12161C]">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Add member</p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="member-email-mobile" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Member email
                </label>
                <input
                  id="member-email-mobile"
                  type="email"
                  value={addMemberForm.email}
                  disabled={addMemberLoading}
                  onChange={(event) => {
                    setAddMemberForm((current) => ({ ...current, email: event.target.value }));
                    if (addMemberError) {
                      setAddMemberError('');
                    }
                  }}
                  placeholder="name@company.com"
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="member-role-mobile" className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">
                  Role
                </label>
                <select
                  id="member-role-mobile"
                  value={addMemberForm.role}
                  disabled={addMemberLoading}
                  onChange={(event) => setAddMemberForm((current) => ({ ...current, role: event.target.value }))}
                  className={fieldClass}
                >
                  {PROJECT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {addMemberError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {addMemberError}
              </div>
            ) : null}

            <button type="submit" disabled={addMemberLoading} className={`${primaryButtonClass} w-full justify-center`}>
              {addMemberLoading ? 'Adding member...' : 'Add member'}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );

  const adminWorkspace = isLead ? (
    <div className="space-y-6 px-4 py-5 sm:px-5 sm:py-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Requests needing your attention</h2>
      </div>

      <section className="border-t border-gray-200 pt-6 dark:border-[#242A33]">
        <div className="divide-y divide-gray-200 dark:divide-[#242A33]">
          {leadAttentionItems.map((item) => (
            <div
              key={item.status}
              className="grid gap-4 py-4 md:grid-cols-[minmax(0,1fr)_80px_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                  <span className="text-[12px] font-medium text-gray-400 dark:text-[#8A8A8A]">
                    {item.count > 0 ? 'New' : 'Clear'}
                  </span>
                </div>

                <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-[#8A8A8A]">{item.hint}</p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{item.count}</p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => openLeadAttentionQueue(item.status)}
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#2B3038] dark:bg-[#101318] dark:text-[#E2E8F0] dark:hover:bg-[#171B22]"
                >
                  View in issues
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
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

      <section className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-3 border-b border-gray-200 pb-6 dark:border-[#242A33]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#8A8A8A]">
              Project workspace
            </p>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                {project?.name || 'Project workspace'}
              </h1>
              {project?.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600 dark:text-[#C9CDD4]">
                  {project.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-b border-gray-200 dark:border-[#242A33]">
            <div className={`grid ${workspaceTabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {workspaceTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id)}
                  className={`border-b-2 px-4 py-4 text-center text-sm font-medium transition ${
                    mobileTab === tab.id
                      ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-[#8A8A8A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {mobileTab === 'issues' ? renderIssueWorkspace('main') : null}
          {mobileTab === 'team' ? teamWorkspace : null}
          {mobileTab === 'admin' ? adminWorkspace : null}
          {mobileTab === 'project' ? projectWorkspace : null}
        </div>
      </section>

      {memberActionDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-[#242A33] dark:bg-[#12161C]">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {memberActionDialog.title}
              </h2>
              <p className="text-sm leading-6 text-gray-500 dark:text-[#8A8A8A]">
                {memberActionDialog.description}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeMemberActionDialog}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMemberAction}
                className={memberActionDialog.type === 'remove' ? dangerButtonClass : primaryButtonClass}
              >
                {memberActionDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProjectDetail;
