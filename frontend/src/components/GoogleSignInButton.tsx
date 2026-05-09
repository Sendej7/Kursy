import { useEffect, useRef } from 'react';
import { loadGoogleIdentity, googleClientId } from '@/lib/google';

interface Props {
  onCredential: (idToken: string) => void;
}

export default function GoogleSignInButton({ onCredential }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    loadGoogleIdentity().then(() => {
      if (cancelled || !ref.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp) => onCredential(resp.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        locale: 'pl',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  if (!googleClientId) {
    return (
      <p className="text-xs text-gray-400">
        (Logowanie Google nieskonfigurowane — ustaw <code>VITE_GOOGLE_CLIENT_ID</code>)
      </p>
    );
  }
  return <div ref={ref} />;
}
