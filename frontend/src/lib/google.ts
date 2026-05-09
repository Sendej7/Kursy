/**
 * Cienki wrapper na Google Identity Services. Klient inicjalizuje się z VITE_GOOGLE_CLIENT_ID.
 * Jeśli klucz nie jest ustawiony — przyciski Google są ukryte.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, config: { theme?: string; size?: string; locale?: string }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (window.google?.accounts?.id) return Promise.resolve();

  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Nie udało się załadować Google Identity Services'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';
