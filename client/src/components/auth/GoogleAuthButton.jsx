import { useState } from 'react';
import { buildApiUrl } from '../../api/axios';

const GoogleIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
    <path
      d="M21.805 10.023H12.24v3.955h5.484c-.236 1.273-.965 2.35-2.049 3.073v2.553h3.313c1.939-1.785 3.057-4.414 3.057-7.534 0-.675-.061-1.323-.24-2.047Z"
      fill="#4285F4"
    />
    <path
      d="M12.24 21.96c2.76 0 5.078-.914 6.77-2.478l-3.313-2.553c-.923.62-2.103.987-3.457.987-2.654 0-4.902-1.792-5.706-4.198H3.107v2.632c1.682 3.338 5.134 5.61 9.133 5.61Z"
      fill="#34A853"
    />
    <path
      d="M6.534 13.718a5.86 5.86 0 0 1-.319-1.878c0-.654.111-1.29.319-1.878V7.33H3.107A9.708 9.708 0 0 0 2.08 11.84c0 1.57.375 3.056 1.027 4.51l3.427-2.632Z"
      fill="#FBBC04"
    />
    <path
      d="M12.24 5.765c1.493 0 2.829.513 3.881 1.522l2.909-2.91C17.314 2.784 15 1.72 12.24 1.72c-4 0-7.451 2.272-9.133 5.61l3.427 2.632c.804-2.406 3.052-4.197 5.706-4.197Z"
      fill="#EA4335"
    />
  </svg>
);

const GoogleAuthButton = ({
  disabled = false,
  label = 'Continue with Google'
}) => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = () => {
    setIsRedirecting(true);
    window.location.assign(buildApiUrl('/users/auth/google'));
  };

  return (
    <button
      type="button"
      disabled={disabled || isRedirecting}
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2C2C2C] dark:bg-[#111111] dark:text-white dark:hover:bg-[#171717]"
    >
      <GoogleIcon />
      <span>{isRedirecting ? 'Redirecting to Google...' : label}</span>
    </button>
  );
};

export default GoogleAuthButton;
