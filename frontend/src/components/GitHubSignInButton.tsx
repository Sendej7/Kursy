/**
 * Przycisk logowania GitHub. Konfiguracja przez VITE_GITHUB_CLIENT_ID.
 * OAuth flow: redirect → GitHub authorize → /auth/github/callback (frontend) → POST do backendu z code.
 */

const githubClientId = (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined) ?? '';

interface Props {
  intent?: 'login' | 'register';
}

export default function GitHubSignInButton({ intent = 'login' }: Props) {
  if (!githubClientId) {
    return (
      <p className="text-xs text-gray-400">
        (Logowanie GitHub nieskonfigurowane — ustaw <code>VITE_GITHUB_CLIENT_ID</code>)
      </p>
    );
  }

  function start() {
    const redirectUri = window.location.origin + '/auth/github/callback';
    const state = crypto.randomUUID();
    sessionStorage.setItem('github_oauth_state', state);
    sessionStorage.setItem('github_oauth_intent', intent);
    const params = new URLSearchParams({
      client_id: githubClientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  }

  return (
    <button
      onClick={start}
      type="button"
      className="w-full inline-flex items-center justify-center gap-2 border rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-50"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.72.08-.72 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.1-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.83.58A12 12 0 0 0 12 .3" />
      </svg>
      Kontynuuj z GitHub
    </button>
  );
}
