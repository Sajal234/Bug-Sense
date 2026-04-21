import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import useAuth from '../hooks/useAuth';
import { api, setApiAccessToken } from '../api/axios';

const OAUTH_ERROR_MESSAGES = {
  invalid_state: 'Google sign-in could not be verified. Please try again.',
  unverified_email: 'Your Google account email is not verified yet.',
  email_exists: 'An account with this email already exists. Sign in with password first.',
  oauth_failed: 'Google sign-in could not be completed. Please try again.'
};

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthReady, loginContext } = useAuth();
  const [phase, setPhase] = useState('loading');
  const [message, setMessage] = useState('Finishing your Google sign-in...');
  const handledRef = useRef(false);

  useEffect(() => {
    if (!isAuthReady || handledRef.current) {
      return;
    }

    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const errorCode = searchParams.get('error');

    if (provider && provider !== 'google') {
      handledRef.current = true;
      setPhase('error');
      setMessage('Unsupported sign-in provider.');
      return;
    }

    if (status !== 'success') {
      handledRef.current = true;
      setPhase('error');
      setMessage(
        OAUTH_ERROR_MESSAGES[errorCode] ||
          'Google sign-in could not be completed. Please try again.'
      );
      return;
    }

    handledRef.current = true;
    let ignore = false;

    const completeGoogleSignIn = async () => {
      try {
        const refreshResponse = await api.post('/users/refresh-token');
        const nextAccessToken = refreshResponse?.data?.data?.accessToken;

        if (!nextAccessToken) {
          throw new Error('Unable to create a session after Google sign-in.');
        }

        setApiAccessToken(nextAccessToken);

        const currentUserResponse = await api.get('/users/me', {
          headers: {
            Authorization: `Bearer ${nextAccessToken}`
          }
        });

        const currentUser = currentUserResponse?.data?.data;

        if (!currentUser) {
          throw new Error('Unable to load your account after Google sign-in.');
        }

        if (ignore) {
          return;
        }

        loginContext(currentUser, nextAccessToken);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        if (ignore) {
          return;
        }

        setPhase('error');
        setMessage(
          error?.message ||
            'Google sign-in worked, but your session could not be completed.'
        );
      }
    };

    completeGoogleSignIn();

    return () => {
      ignore = true;
    };
  }, [isAuthReady, loginContext, navigate, searchParams]);

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#2C2C2C] dark:bg-[#111111]">
        <div className="mb-6 text-center">
          <BrandMark className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {phase === 'loading' ? 'Signing you in' : 'Google sign-in'}
          </h1>
        </div>

        {phase === 'loading' ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 dark:border-[#2C2C2C] dark:border-t-white" />
            <p className="text-sm text-gray-600 dark:text-[#A1A1AA]">{message}</p>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
              {message}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="flex-1 rounded-md bg-gray-900 px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-[#111111] dark:hover:bg-gray-100"
              >
                Back to login
              </Link>
              <Link
                to="/register"
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-[14px] font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-[#2C2C2C] dark:bg-[#111111] dark:text-white dark:hover:bg-[#171717]"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
