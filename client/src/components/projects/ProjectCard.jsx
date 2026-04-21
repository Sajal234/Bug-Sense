import { Link } from 'react-router-dom';
import { formatDate, formatLabel } from '../../utils/formatters';

const ProjectCard = ({ project, currentUserId }) => {
  const isLead = project.lead === currentUserId;
  const role = isLead
    ? 'Lead'
    : formatLabel(
        project.members?.find(
          (member) => member.user === currentUserId || member.user?._id === currentUserId
        )?.role || 'Member'
      );

  return (
    <Link
      to={`/projects/${project._id}`}
      state={{ project }}
      className="group block rounded-xl border border-gray-200 bg-white px-5 py-5 transition-colors hover:border-gray-300 dark:border-[#242A33] dark:bg-[#101318] dark:hover:border-[#343B46]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-gray-700 dark:text-white dark:group-hover:text-[#F5F5F5]">
              {project.name}
            </h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-[#171B22] dark:text-[#AEB6C2]">
              {role}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-[#A1A1AA]">
            {project.description || 'No description yet.'}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] text-gray-500 dark:text-[#8A8A8A]">
        <span>{project.members?.length || 0} members</span>
        <span className="h-1 w-1 rounded-full bg-current"></span>
        <span>Created {formatDate(project.createdAt)}</span>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 text-sm dark:border-[#242A33]">
        <span className="text-gray-700 dark:text-[#D8DEE8]">Open workspace</span>
        <span className="font-medium text-gray-900 transition-transform group-hover:translate-x-0.5 dark:text-white">
          →
        </span>
      </div>
    </Link>
  );
};

export default ProjectCard;
