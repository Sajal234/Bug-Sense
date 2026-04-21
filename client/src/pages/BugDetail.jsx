import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../api/axios';
import useAuth from '../hooks/useAuth';
import {
  BUG_SEVERITY_OPTIONS,
  bugSeverityTone,
  bugStatusTone,
  getEntityId,
  getPendingBugFix,
  isReopenRequestPending
} from '../utils/bugs';
import { formatDateTime, formatLabel } from '../utils/formatters';

const initialFixForm = {
  summary: '',
  commitUrl: '',
  proof: ''
};

const initialSeverityReviewForm = {
  reason: '',
  proposedSeverity: ''
};

const sectionClass =
  'border-t border-gray-200 pt-5 dark:border-[#242A33] sm:pt-6';

const surfaceClass =
  'rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#242A33] dark:bg-[#12161C] sm:p-5';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[14px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2C2C2C] dark:bg-[#111111] dark:text-white';

const textareaClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-[14px] text-gray-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2C2C2C] dark:bg-[#111111] dark:text-white';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white';

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2C2C2C] dark:bg-[#111111] dark:text-[#E2E8F0] dark:hover:bg-[#202020]';

const dangerButtonClass =
  'inline-flex items-center justify-center rounded-md border border-red-200 px-4 py-2.5 text-[14px] font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10';

const looksLikeObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

const BugDetail = () => {
  const { user } = useAuth();
  const { projectId, bugId } = useParams();
  const location = useLocation();

  const [project, setProject] = useState(location.state?.project || null);
  const [bug, setBug] = useState(null);
  const [comments, setComments] = useState([]);
  const [assignableMembers, setAssignableMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [commentLoading, setCommentLoading] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState('');
  const [editingCommentText, setEditingCommentText] = useState('');
  const [approvalSeverity, setApprovalSeverity] = useState('MEDIUM');
  const [decisionReason, setDecisionReason] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [fixForm, setFixForm] = useState(initialFixForm);
  const [severityReviewForm, setSeverityReviewForm] = useState(initialSeverityReviewForm);
  const [reopenReason, setReopenReason] = useState('');
  const [bugTab, setBugTab] = useState('workflow');

  const loadBugPage = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      setError('');

      try {
        const bugRequest = api.get(`/projects/${projectId}/bugs/${bugId}`);
        const commentsRequest = api.get(`/projects/${projectId}/bugs/${bugId}/comments`, { params: { limit: 50 } });
        const projectRequest = location.state?.project ? null : api.get('/projects/my-projects');

        const [projectResponse, bugResponse, commentsResponse] = await Promise.all([
          projectRequest,
          bugRequest,
          commentsRequest
        ]);

        const nextProject =
          location.state?.project ||
          projectResponse?.data?.data?.find((item) => item._id === projectId) ||
          null;

        setProject(nextProject);
        setBug(bugResponse?.data?.data || null);
        setComments(commentsResponse?.data?.data?.comments || []);
      } catch (loadError) {
        setError(loadError?.message || 'Unable to load this bug right now.');
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [bugId, location.state, projectId]
  );

  useEffect(() => {
    loadBugPage();
  }, [loadBugPage]);

  useEffect(() => {
    setBugTab('workflow');
  }, [bugId]);

  const isLead = Boolean(project?.lead && user?._id && getEntityId(project.lead) === user._id);
  const pendingFix = getPendingBugFix(bug);
  const pendingReview = bug?.reviewRequests?.find((request) => request.status === 'PENDING') || null;
  const reopenPending = isReopenRequestPending(bug);
  const assignedUserId = getEntityId(bug?.assignedTo);
  const isAssignedToMe = Boolean(user?._id && assignedUserId === user._id);
  const canAssignBug = isLead && ['OPEN', 'ASSIGNED', 'REOPENED'].includes(bug?.status);

  const loadAssignableMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError('');

    try {
      const response = await api.get(`/projects/${projectId}/members`, {
        timeout: 8000
      });

      const membersPanel = response?.data?.data || null;
      const nextMembers = [];
      const seen = new Set();

      if (membersPanel?.lead?._id) {
        nextMembers.push({
          ...membersPanel.lead,
          role: 'LEAD'
        });
        seen.add(membersPanel.lead._id);
      }

      for (const member of membersPanel?.members || []) {
        const memberId = member.user?._id;

        if (!memberId || seen.has(memberId)) {
          continue;
        }

        nextMembers.push({
          ...member.user,
          role: member.role
        });
        seen.add(memberId);
      }

      setAssignableMembers(nextMembers);
    } catch (requestError) {
      setMembersError(requestError?.message || 'Unable to load team members right now.');
      setAssignableMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!canAssignBug || membersLoading || assignableMembers.length > 0 || membersError) {
      return;
    }

    loadAssignableMembers();
  }, [assignableMembers.length, canAssignBug, loadAssignableMembers, membersError, membersLoading]);

  useEffect(() => {
    if (!bug) {
      return;
    }

    setAssignUserId(getEntityId(bug.assignedTo));

    const suggestedSeverity =
      pendingReview?.proposedSeverity ||
      (bug.suggestedSeverity && bug.suggestedSeverity !== 'UNCONFIRMED' ? bug.suggestedSeverity : '') ||
      'MEDIUM';

    setApprovalSeverity(suggestedSeverity);
  }, [bug, pendingReview?.proposedSeverity]);

  const assignableMemberNameById = useMemo(
    () =>
      assignableMembers.reduce((lookup, member) => {
        lookup[member._id] = member.name;
        return lookup;
      }, {}),
    [assignableMembers]
  );

  const activeWorkflow = (() => {
    if (!bug) {
      return 'none';
    }

    if (isLead && bug.status === 'PENDING_REVIEW' && !reopenPending) {
      return 'review-bug';
    }

    if (isLead && reopenPending) {
      return 'review-reopen';
    }

    if (isLead && bug.status === 'AWAITING_VERIFICATION' && pendingFix) {
      return 'review-fix';
    }

    if (isLead && bug.status === 'REVIEW_REQUESTED' && pendingReview) {
      return 'review-severity';
    }

    if (bug.status === 'ASSIGNED' && isAssignedToMe) {
      return 'submit-fix';
    }

    if (canAssignBug) {
      return 'assign';
    }

    if (['OPEN', 'ASSIGNED', 'REOPENED'].includes(bug.status) && bug.severity !== 'UNCONFIRMED') {
      return 'request-severity-review';
    }

    if (bug.status === 'RESOLVED') {
      return 'request-reopen';
    }

    return 'none';
  })();

  const workflowMeta = (() => {
    switch (activeWorkflow) {
      case 'review-bug':
        return {
          title: 'Review report',
          hint: 'Approve it into the project workflow or send it back with a clear reason.'
        };
      case 'review-reopen':
        return {
          title: 'Review reopen request',
          hint: 'Decide whether this resolved issue should move back into active work.'
        };
      case 'review-fix':
        return {
          title: 'Review submitted fix',
          hint: 'Check the submitted fix and decide if the bug can be marked resolved.'
        };
      case 'review-severity':
        return {
          title: 'Review severity change',
          hint: 'Confirm whether the bug priority should change for the team.'
        };
      case 'submit-fix':
        return {
          title: 'Submit fix',
          hint: 'Share the summary and commit so the lead can verify the result.'
        };
      case 'assign':
        return {
          title: bug?.assignedTo ? 'Reassign owner' : 'Assign owner',
          hint: 'Choose the teammate who should take the next step on this bug.'
        };
      case 'request-severity-review':
        return {
          title: 'Request severity review',
          hint: 'Ask the lead to revisit the current severity with a short reason.'
        };
      case 'request-reopen':
        return {
          title: 'Request reopen',
          hint: 'Use this only if the issue still happens after it was marked resolved.'
        };
      default:
        return {
          title: 'No action needed',
          hint: 'Nothing is blocked right now. Use comments if the team needs more context.'
        };
    }
  })();

  const resetActionMessages = () => {
    setNotice('');
    setActionError('');
  };

  const refreshBugData = async () => {
    const [bugResponse, commentsResponse] = await Promise.all([
      api.get(`/projects/${projectId}/bugs/${bugId}`),
      api.get(`/projects/${projectId}/bugs/${bugId}/comments`, { params: { limit: 50 } })
    ]);

    setBug(bugResponse?.data?.data || null);
    setComments(commentsResponse?.data?.data?.comments || []);
  };

  const runBugAction = async (actionKey, requestFn, onSuccess) => {
    setActionLoading(actionKey);
    setActionError('');
    setNotice('');

    try {
      const response = await requestFn();

      if (onSuccess) {
        onSuccess(response);
      }

      setNotice(response?.data?.message || 'Updated successfully.');
      await refreshBugData();
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to update this bug right now.');
    } finally {
      setActionLoading('');
    }
  };

  const runCommentAction = async (actionKey, requestFn, onSuccess) => {
    setCommentLoading(actionKey);
    setCommentError('');
    setNotice('');

    try {
      const response = await requestFn();

      if (onSuccess) {
        onSuccess(response);
      }

      setNotice(response?.data?.message || 'Comment updated.');
      await refreshBugData();
    } catch (requestError) {
      setCommentError(requestError?.message || 'Unable to update comments right now.');
    } finally {
      setCommentLoading('');
    }
  };

  const handleApproveBug = () =>
    runBugAction('approve-bug', () =>
      api.patch(`/projects/${projectId}/bugs/${bugId}/approve`, {
        severity: approvalSeverity
      })
    );

  const handleRejectBug = () => {
    const normalizedReason = decisionReason.trim();

    if (!normalizedReason) {
      setActionError('A reason is required.');
      return;
    }

    runBugAction(
      'reject-bug',
      () =>
        api.patch(`/projects/${projectId}/bugs/${bugId}/reject`, {
          reason: normalizedReason
        }),
      () => {
        setDecisionReason('');
      }
    );
  };

  const handleAssignBug = () => {
    if (!assignUserId) {
      setActionError('Choose a teammate first.');
      return;
    }

    runBugAction('assign-bug', () =>
      api.patch(`/projects/${projectId}/bugs/${bugId}/assign`, {
        assignedTo: assignUserId
      })
    );
  };

  const handleSubmitFix = (event) => {
    event.preventDefault();

    const summary = fixForm.summary.trim();
    const commitUrl = fixForm.commitUrl.trim();
    const proof = fixForm.proof.trim();

    if (!summary || !commitUrl) {
      setActionError('Summary and commit URL are required.');
      return;
    }

    runBugAction(
      'submit-fix',
      () =>
        api.post(`/projects/${projectId}/bugs/${bugId}/fix`, {
          summary,
          commitUrl,
          proof
        }),
      () => {
        setFixForm(initialFixForm);
      }
    );
  };

  const handleAcceptFix = () => {
    if (!pendingFix?._id) {
      return;
    }

    runBugAction('accept-fix', () =>
      api.patch(`/projects/${projectId}/bugs/${bugId}/fixes/${pendingFix._id}/accept`)
    );
  };

  const handleRejectFix = () => {
    const normalizedReason = decisionReason.trim();

    if (!pendingFix?._id) {
      return;
    }

    if (!normalizedReason) {
      setActionError('A reason is required to reject the fix.');
      return;
    }

    runBugAction(
      'reject-fix',
      () =>
        api.patch(`/projects/${projectId}/bugs/${bugId}/fixes/${pendingFix._id}/reject`, {
          reason: normalizedReason
        }),
      () => {
        setDecisionReason('');
      }
    );
  };

  const handleRequestSeverityReview = (event) => {
    event.preventDefault();

    const normalizedReason = severityReviewForm.reason.trim();

    if (!normalizedReason) {
      setActionError('A reason is required.');
      return;
    }

    const payload = {
      reason: normalizedReason
    };

    if (severityReviewForm.proposedSeverity) {
      payload.proposedSeverity = severityReviewForm.proposedSeverity;
    }

    runBugAction(
      'request-severity-review',
      () => api.patch(`/projects/${projectId}/bugs/${bugId}/severity-review`, payload),
      () => {
        setSeverityReviewForm(initialSeverityReviewForm);
      }
    );
  };

  const handleApproveSeverityReview = () => {
    if (!approvalSeverity) {
      setActionError('Choose the next severity.');
      return;
    }

    runBugAction('approve-severity-review', () =>
      api.patch(`/projects/${projectId}/bugs/${bugId}/severity-review/approve`, {
        newSeverity: approvalSeverity
      })
    );
  };

  const handleRejectSeverityReview = () => {
    const normalizedReason = decisionReason.trim();

    if (!normalizedReason) {
      setActionError('A reason is required.');
      return;
    }

    runBugAction(
      'reject-severity-review',
      () =>
        api.patch(`/projects/${projectId}/bugs/${bugId}/severity-review/reject`, {
          reason: normalizedReason
        }),
      () => {
        setDecisionReason('');
      }
    );
  };

  const handleRequestReopen = () => {
    const normalizedReason = reopenReason.trim();

    if (!normalizedReason) {
      setActionError('Explain why this bug should be reopened.');
      return;
    }

    runBugAction(
      'request-reopen',
      () =>
        api.patch(`/projects/${projectId}/bugs/${bugId}/request-reopen`, {
          reason: normalizedReason
        }),
      () => {
        setReopenReason('');
      }
    );
  };

  const handleApproveReopen = () =>
    runBugAction('approve-reopen', () => api.patch(`/projects/${projectId}/bugs/${bugId}/approve-reopen`));

  const handleRejectReopen = () => {
    const normalizedReason = decisionReason.trim();

    if (!normalizedReason) {
      setActionError('A reason is required.');
      return;
    }

    runBugAction(
      'reject-reopen',
      () =>
        api.patch(`/projects/${projectId}/bugs/${bugId}/reject-reopen`, {
          reason: normalizedReason
        }),
      () => {
        setDecisionReason('');
      }
    );
  };

  const handleAddComment = (event) => {
    event.preventDefault();

    const normalizedText = commentText.trim();

    if (!normalizedText) {
      setCommentError('Write a comment first.');
      return;
    }

    runCommentAction(
      'add-comment',
      () =>
        api.post(`/projects/${projectId}/bugs/${bugId}/comments`, {
          text: normalizedText
        }),
      () => {
        setCommentText('');
      }
    );
  };

  const handleSaveComment = (commentId) => {
    const normalizedText = editingCommentText.trim();

    if (!normalizedText) {
      setCommentError('Comment text cannot be empty.');
      return;
    }

    runCommentAction(
      `edit-comment-${commentId}`,
      () =>
        api.patch(`/projects/${projectId}/bugs/${bugId}/comments/${commentId}`, {
          text: normalizedText
        }),
      () => {
        setEditingCommentId('');
        setEditingCommentText('');
      }
    );
  };

  const handleDeleteComment = (commentId) =>
    runCommentAction(`delete-comment-${commentId}`, () =>
      api.delete(`/projects/${projectId}/bugs/${bugId}/comments/${commentId}`)
    );

  const getHistoryMeta = (item) => {
    if (!item?.meta) {
      return '';
    }

    if (item.action === 'Bug assigned' || item.action === 'Bug reassigned') {
      const assigneeName =
        assignableMemberNameById[item.to] ||
        (item.to === assignedUserId ? bug?.assignedTo?.name : '');

      if (assigneeName) {
        return item.action === 'Bug reassigned' ? `Reassigned to ${assigneeName}` : `Assigned to ${assigneeName}`;
      }

      return 'Assignment updated';
    }

    if (item.action === 'Fix submitted') {
      return 'Fix submitted for verification';
    }

    if (item.action === 'Bug resolved' && item.meta.includes('Fix ID')) {
      return 'Submitted fix accepted';
    }

    if (item.action === 'Fix rejected' && item.meta.includes('Fix ID')) {
      return 'Submitted fix rejected';
    }

    if (looksLikeObjectId(item.meta) || item.meta.includes('Fix ID')) {
      return '';
    }

    return item.meta;
  };

  const showTransitionBadge = (item) => {
    if (!item) {
      return false;
    }

    return Boolean((item.from || item.to) && !looksLikeObjectId(item.from) && !looksLikeObjectId(item.to));
  };

  const renderWorkflowCard = () => {
    const renderAssignControls = (label = 'Assign bug') => (
      <>
        {membersError ? (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <p>{membersError}</p>
            <button
              type="button"
              onClick={loadAssignableMembers}
              disabled={membersLoading}
              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-2 text-[13px] font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-[#111111] dark:text-red-300 dark:hover:bg-red-500/10"
            >
              {membersLoading ? 'Retrying...' : 'Retry loading team'}
            </button>
          </div>
        ) : (
          <>
            <select
              value={assignUserId}
              onChange={(event) => {
                setAssignUserId(event.target.value);
                resetActionMessages();
              }}
              disabled={membersLoading}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">{membersLoading ? 'Loading team...' : 'Choose a teammate'}</option>
              {assignableMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} · {member.role === 'LEAD' ? 'Lead' : formatLabel(member.role)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAssignBug}
              disabled={actionLoading === 'assign-bug' || membersLoading}
              className={primaryButtonClass}
            >
              {actionLoading === 'assign-bug' ? 'Saving assignment...' : label}
            </button>
          </>
        )}
      </>
    );

    switch (activeWorkflow) {
      case 'review-bug':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">Severity</label>
              <select
                value={approvalSeverity}
              onChange={(event) => {
                setApprovalSeverity(event.target.value);
                resetActionMessages();
              }}
              className={inputClass}
            >
                {BUG_SEVERITY_OPTIONS.map((severity) => (
                  <option key={severity} value={severity}>
                    {formatLabel(severity)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApproveBug}
                disabled={actionLoading === 'approve-bug'}
                className={primaryButtonClass}
              >
                {actionLoading === 'approve-bug' ? 'Approving...' : 'Approve bug'}
              </button>
            </div>

            <textarea
              value={decisionReason}
              rows={3}
              onChange={(event) => {
                setDecisionReason(event.target.value);
                resetActionMessages();
              }}
              placeholder="Reason for rejecting this report"
              className={textareaClass}
            />

            <button
              type="button"
              onClick={handleRejectBug}
              disabled={actionLoading === 'reject-bug'}
              className={dangerButtonClass}
            >
              {actionLoading === 'reject-bug' ? 'Rejecting...' : 'Reject bug'}
            </button>
          </div>
        );

      case 'review-reopen':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-[#2A2A2A] dark:text-[#C9CDD4]">
              {bug?.history?.[bug.history.length - 1]?.meta || 'No reason provided.'}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApproveReopen}
                disabled={actionLoading === 'approve-reopen'}
                className={primaryButtonClass}
              >
                {actionLoading === 'approve-reopen' ? 'Approving...' : 'Approve reopen'}
              </button>
            </div>

            <textarea
              value={decisionReason}
              rows={3}
              onChange={(event) => {
                setDecisionReason(event.target.value);
                resetActionMessages();
              }}
              placeholder="Reason for rejecting this reopen request"
              className={textareaClass}
            />

            <button
              type="button"
              onClick={handleRejectReopen}
              disabled={actionLoading === 'reject-reopen'}
              className={dangerButtonClass}
            >
              {actionLoading === 'reject-reopen' ? 'Rejecting...' : 'Reject reopen'}
            </button>
          </div>
        );

      case 'review-fix':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-[#2A2A2A] dark:text-[#C9CDD4]">
              <p className="font-medium text-gray-900 dark:text-white">{pendingFix?.summary}</p>
              <a
                href={pendingFix?.commitUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-sm font-medium text-blue-600 underline underline-offset-4 dark:text-blue-300"
              >
                Open commit
              </a>
              {pendingFix?.proof ? <p className="mt-2">{pendingFix.proof}</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAcceptFix}
                disabled={actionLoading === 'accept-fix'}
                className={primaryButtonClass}
              >
                {actionLoading === 'accept-fix' ? 'Accepting...' : 'Accept fix'}
              </button>
            </div>

            <textarea
              value={decisionReason}
              rows={3}
              onChange={(event) => {
                setDecisionReason(event.target.value);
                resetActionMessages();
              }}
              placeholder="Reason for rejecting this fix"
              className={textareaClass}
            />

            <button
              type="button"
              onClick={handleRejectFix}
              disabled={actionLoading === 'reject-fix'}
              className={dangerButtonClass}
            >
              {actionLoading === 'reject-fix' ? 'Rejecting...' : 'Reject fix'}
            </button>
          </div>
        );

      case 'review-severity':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-[#2A2A2A] dark:text-[#C9CDD4]">
              <p>{pendingReview?.reason || 'No reason provided.'}</p>
              {pendingReview?.proposedSeverity ? (
                <p className="mt-2">
                  Suggested severity:{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatLabel(pendingReview.proposedSeverity)}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-700 dark:text-[#E2E8F0]">New severity</label>
              <select
                value={approvalSeverity}
                onChange={(event) => {
                  setApprovalSeverity(event.target.value);
                  resetActionMessages();
                }}
                className={inputClass}
              >
                {BUG_SEVERITY_OPTIONS.map((severity) => (
                  <option key={severity} value={severity}>
                    {formatLabel(severity)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleApproveSeverityReview}
                disabled={actionLoading === 'approve-severity-review'}
                className={primaryButtonClass}
              >
                {actionLoading === 'approve-severity-review' ? 'Approving...' : 'Approve change'}
              </button>
            </div>

            <textarea
              value={decisionReason}
              rows={3}
              onChange={(event) => {
                setDecisionReason(event.target.value);
                resetActionMessages();
              }}
              placeholder="Reason for rejecting this request"
              className={textareaClass}
            />

            <button
              type="button"
              onClick={handleRejectSeverityReview}
              disabled={actionLoading === 'reject-severity-review'}
              className={dangerButtonClass}
            >
              {actionLoading === 'reject-severity-review' ? 'Rejecting...' : 'Reject request'}
            </button>
          </div>
        );

      case 'submit-fix':
        return (
          <form onSubmit={handleSubmitFix} className="space-y-4">
            <textarea
              value={fixForm.summary}
              rows={4}
              onChange={(event) => {
                setFixForm((current) => ({ ...current, summary: event.target.value }));
                resetActionMessages();
              }}
              placeholder="What changed and how does it fix the bug?"
              className={textareaClass}
            />

            <input
              type="url"
              value={fixForm.commitUrl}
              onChange={(event) => {
                setFixForm((current) => ({ ...current, commitUrl: event.target.value }));
                resetActionMessages();
              }}
              placeholder="https://github.com/..."
              className={inputClass}
            />

            <textarea
              value={fixForm.proof}
              rows={3}
              onChange={(event) => {
                setFixForm((current) => ({ ...current, proof: event.target.value }));
                resetActionMessages();
              }}
              placeholder="Optional proof: what did you verify?"
              className={textareaClass}
            />

            <button
              type="submit"
              disabled={actionLoading === 'submit-fix'}
              className={primaryButtonClass}
            >
              {actionLoading === 'submit-fix' ? 'Submitting fix...' : 'Submit fix'}
            </button>

            {isLead ? (
              <div className="space-y-3 rounded-xl border border-gray-200 px-4 py-4 dark:border-[#2A2A2A]">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Need to hand this off instead?</p>
                {renderAssignControls('Reassign bug')}
              </div>
            ) : null}
          </form>
        );

      case 'assign':
        return (
          <div className="space-y-4">
            {renderAssignControls(bug?.assignedTo ? 'Reassign bug' : 'Assign bug')}
          </div>
        );

      case 'request-severity-review':
        return (
          <form onSubmit={handleRequestSeverityReview} className="space-y-4">
            <select
              value={severityReviewForm.proposedSeverity}
              onChange={(event) => {
                setSeverityReviewForm((current) => ({ ...current, proposedSeverity: event.target.value }));
                resetActionMessages();
              }}
              className={inputClass}
            >
              <option value="">No suggested severity</option>
              {BUG_SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>
                  {formatLabel(severity)}
                </option>
              ))}
            </select>

            <textarea
              value={severityReviewForm.reason}
              rows={3}
              onChange={(event) => {
                setSeverityReviewForm((current) => ({ ...current, reason: event.target.value }));
                resetActionMessages();
              }}
              placeholder="Why should the severity change?"
              className={textareaClass}
            />

            <button
              type="submit"
              disabled={actionLoading === 'request-severity-review'}
              className={secondaryButtonClass}
            >
              {actionLoading === 'request-severity-review' ? 'Submitting request...' : 'Request review'}
            </button>
          </form>
        );

      case 'request-reopen':
        return (
          <div className="space-y-4">
            <textarea
              value={reopenReason}
              rows={3}
              onChange={(event) => {
                setReopenReason(event.target.value);
                resetActionMessages();
              }}
              placeholder="Why should this bug be reopened?"
              className={textareaClass}
            />

            <button
              type="button"
              onClick={handleRequestReopen}
              disabled={actionLoading === 'request-reopen'}
              className={secondaryButtonClass}
            >
              {actionLoading === 'request-reopen' ? 'Submitting...' : 'Request reopen'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const historyItems = Array.isArray(bug?.history) ? bug.history.slice().reverse() : [];
  const bugTabs = [
    { id: 'workflow', label: 'Workflow' },
    { id: 'discussion', label: 'Discussion' },
    { id: 'activity', label: 'Activity' }
  ];

const discussionSection = bug ? (
    <div className="space-y-8">
      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Comments</h2>
          <span className="text-[12px] font-medium text-gray-500 dark:text-[#8A8A8A]">
            {comments.length} comment{comments.length === 1 ? '' : 's'}
          </span>
        </div>

        <form onSubmit={handleAddComment} className="mt-5 space-y-3">
          <textarea
            value={commentText}
            rows={4}
            disabled={commentLoading === 'add-comment'}
            onChange={(event) => {
              setCommentText(event.target.value);
              if (commentError) {
                setCommentError('');
              }
            }}
            placeholder="Add a note for the team."
            className={textareaClass}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={commentLoading === 'add-comment'}
              className={primaryButtonClass}
            >
              {commentLoading === 'add-comment' ? 'Posting comment...' : 'Add comment'}
            </button>
            {commentError ? <span className="text-sm text-red-600 dark:text-red-300">{commentError}</span> : null}
          </div>
        </form>

        <div className="mt-6">
          {comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#2A2A2A] dark:text-[#8A8A8A]">
              No comments yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-[#2A2A2A]">
              {comments.map((comment) => {
                const commentId = comment._id;
                const isEditing = editingCommentId === commentId;
                const isAuthor = getEntityId(comment.createdBy) === user?._id;
                const canDelete = isAuthor || isLead;
                const authorName = comment.createdBy?.name || 'Team member';

                return (
                  <article key={commentId} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-xs font-semibold text-gray-700 dark:border-[#242A33] dark:text-white">
                        {authorName.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{authorName}</p>
                            <p className="mt-1 text-[12px] text-gray-500 dark:text-[#8A8A8A]">
                              {formatDateTime(comment.createdAt)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {isAuthor ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(commentId);
                                  setEditingCommentText(comment.text);
                                  setCommentError('');
                                }}
                                className="rounded-md border border-gray-200 px-3 py-1.5 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#2C2C2C] dark:text-[#E2E8F0] dark:hover:bg-[#202020]"
                              >
                                Edit
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(commentId)}
                                disabled={commentLoading === `delete-comment-${commentId}`}
                                className="rounded-md border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                              >
                                {commentLoading === `delete-comment-${commentId}` ? 'Deleting...' : 'Delete'}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-3 space-y-3">
                            <textarea
                              rows={3}
                              value={editingCommentText}
                              onChange={(event) => setEditingCommentText(event.target.value)}
                              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-[14px] text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-[#2C2C2C] dark:bg-[#161616] dark:text-white"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                              type="button"
                              onClick={() => handleSaveComment(commentId)}
                              disabled={commentLoading === `edit-comment-${commentId}`}
                              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#EDEDED] dark:text-[#111111] dark:hover:bg-white"
                            >
                                {commentLoading === `edit-comment-${commentId}` ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId('');
                                  setEditingCommentText('');
                                }}
                                className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#2C2C2C] dark:text-[#E2E8F0] dark:hover:bg-[#202020]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-[#C9CDD4]">
                            {comment.text}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {bug.stackTrace ? (
        <section className={sectionClass}>
          <details className={surfaceClass}>
            <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white">
              Technical details
            </summary>
            <pre className="mt-4 overflow-x-auto text-[12px] leading-6 text-gray-700 dark:text-[#E2E8F0]">
              {bug.stackTrace}
            </pre>
          </details>
        </section>
      ) : null}
    </div>
  ) : null;

  const workflowSection = bug ? (
    <section className={sectionClass}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.1fr)]">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Current state</h2>
            <p className="text-sm text-gray-500 dark:text-[#A1A1AA]">
              The key context behind this bug right now.
            </p>
          </div>

          <div className={`${surfaceClass} grid gap-4 sm:grid-cols-2`}>
            {[
              ['Project', project?.name || 'Project'],
              ['Assignee', bug.assignedTo?.name || 'Unassigned'],
              ['Reporter', bug.createdBy?.name || 'Unknown user'],
              ['Created', formatDateTime(bug.createdAt)],
              ['Environment', formatLabel(bug.environment)],
              ['Module', bug.moduleName || 'Not specified'],
              ['Status', formatLabel(bug.status)],
              ['Severity', formatLabel(bug.severity)],
              ['Pending step', workflowMeta.title]
            ].map(([label, value]) => (
              <div key={label} className="space-y-1">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-[#7A7A7A]">
                  {label}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">{workflowMeta.title}</h2>
            <p className="text-sm text-gray-500 dark:text-[#A1A1AA]">{workflowMeta.hint}</p>
          </div>

          {actionError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {actionError}
            </div>
          ) : null}

          <div className={surfaceClass}>{renderWorkflowCard()}</div>
        </div>
      </div>
    </section>
  ) : null;

  const activitySection = bug ? (
    <section className={sectionClass}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Activity</h2>
        <span className="text-[12px] font-medium text-gray-500 dark:text-[#8A8A8A]">
          {historyItems.length}
        </span>
      </div>

      <div className="mt-6">
        {historyItems.length > 0 ? (
          <div className="space-y-0">
            {historyItems.map((item, index) => {
              const historyMeta = getHistoryMeta(item);

              return (
                <div
                  key={`${item.action}-${item.createdAt}-${index}`}
                  className="grid grid-cols-[16px_minmax(0,1fr)] gap-4 pb-6 last:pb-0"
                >
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-2.5 w-2.5 rounded-sm bg-gray-300 dark:bg-[#5A5A5A]" />
                    {index !== historyItems.length - 1 ? (
                      <span className="mt-2 h-full w-px bg-gray-200 dark:bg-[#2A2A2A]" />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{item.action}</p>
                      {showTransitionBadge(item) ? (
                        <span className="text-[12px] font-medium text-gray-500 dark:text-[#8A8A8A]">
                          {item.from ? formatLabel(item.from) : 'None'} → {item.to ? formatLabel(item.to) : 'None'}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-[12px] text-gray-500 dark:text-[#8A8A8A]">
                      {item.by?.name || 'System'} • {formatDateTime(item.createdAt)}
                    </p>

                    {historyMeta ? (
                      <p className="mt-2 text-sm text-gray-600 dark:text-[#C9CDD4]">{historyMeta}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-[#2A2A2A] dark:text-[#8A8A8A]">
            No activity yet.
          </div>
        )}
      </div>
    </section>
  ) : null;

  return (
    <div className="space-y-6">
      <section className="space-y-6 border-b border-gray-200 pb-6 dark:border-[#242A33]">
        {!loading && bug ? (
          <div className="space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#8A8A8A]">
              Bug workflow
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium">
              <span className={`${bugStatusTone(bug.status)} border-0 bg-transparent px-0 py-0`}>
                {formatLabel(bug.status)}
              </span>
              <span
                className={`border-0 bg-transparent px-0 py-0 dark:border-0 ${bugSeverityTone(
                  bug.severity
                )}`}
              >
                {formatLabel(bug.severity)}
              </span>
              <span className="text-gray-700 dark:text-[#E2E8F0]">
                {formatLabel(bug.bugType)}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                {bug.title}
              </h1>
              <p className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-[#C9CDD4]">
                {bug.description}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-[#8A8A8A]">
              Bug workflow
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Bug detail
            </h1>
          </div>
        )}
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

      {loading && !bug ? (
        <div className={`${sectionClass} text-sm text-gray-500 dark:text-[#8A8A8A]`}>Loading bug details...</div>
      ) : null}

      {!loading && bug ? (
        <div className="space-y-6">
          <div className="border-b border-gray-200 dark:border-[#242A33]">
            <div className="flex gap-6 overflow-x-auto">
              {bugTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBugTab(tab.id)}
                  className={`min-w-[108px] border-b-2 px-1 py-4 text-left text-sm font-medium transition ${
                    bugTab === tab.id
                      ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-[#8A8A8A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {bugTab === 'discussion' ? discussionSection : null}
          {bugTab === 'workflow' ? workflowSection : null}
          {bugTab === 'activity' ? activitySection : null}
        </div>
      ) : null}
    </div>
  );
};

export default BugDetail;
