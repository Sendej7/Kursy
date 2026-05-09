import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'kursy-cookie-consent-v1';

/**
 * Minimalny baner cookies — Kursy.pl używa tylko niezbędnych ciasteczek (sesja, JWT w localStorage).
 * Bez analityki ani trackingu, więc nie ma „odrzuć" — tylko potwierdzenie informacyjne.
 */
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white shadow-lg print:hidden">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-start gap-3 text-sm">
        <p className="flex-1">
          Używamy tylko niezbędnych ciasteczek do utrzymania sesji logowania. Brak analityki i
          trackerów reklamowych.{' '}
          <Link to="/privacy" className="underline">
            Polityka prywatności
          </Link>
          .
        </p>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, new Date().toISOString());
            setShow(false);
          }}
          className="px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium shrink-0"
        >
          OK, rozumiem
        </button>
      </div>
    </div>
  );
}
