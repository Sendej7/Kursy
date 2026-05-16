import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  GraduationCap,
  Trophy,
  Tag,
  BookOpen,
  Award,
  LayoutDashboard,
  Shield,
  LogOut,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import SearchBar from './SearchBar';
import StreakPill from './StreakPill';
import DailyGoalBadge from './DailyGoalBadge';
import NotificationsBell from './NotificationsBell';
import ThemeToggle from './ThemeToggle';

function NavItem({ to, label, icon: Icon, onClick }: { to: string; label: string; icon?: typeof Menu; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
         ${isActive
           ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
           : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800'
         }`
      }
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </NavLink>
  );
}

export function Header() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function logout() {
    try {
      await api.logout();
    } catch { /* ignore */ }
    auth.clear();
    setOpen(false);
    navigate('/');
  }

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-zinc-200/70 dark:bg-zinc-950/80 dark:border-zinc-800/70">
      <div className="container-page">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <GraduationCap className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Kursy<span className="text-brand-600">.pl</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            <NavItem to="/courses" label="Katalog" icon={BookOpen} />
            <NavItem to="/leaderboard" label="Ranking" icon={Trophy} />
            <NavItem to="/pricing" label="Cennik" icon={Tag} />
            {auth.isAuthenticated() && (
              <>
                <NavItem to="/my-courses" label="Moje kursy" icon={GraduationCap} />
                <NavItem to="/my-certificates" label="Certyfikaty" icon={Award} />
              </>
            )}
            {(auth.user?.role === 'Author' || auth.user?.role === 'Admin') && (
              <NavItem to="/author" label="Autor" icon={LayoutDashboard} />
            )}
            {auth.user?.role === 'Admin' && (
              <NavItem to="/admin" label="Admin" icon={Shield} />
            )}
          </nav>

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-2 ml-auto">
            <div className="w-56"><SearchBar /></div>
            <ThemeToggle />
            {auth.isAuthenticated() ? (
              <>
                <DailyGoalBadge />
                <StreakPill />
                <NotificationsBell />
                <Link
                  to="/account"
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-semibold flex items-center justify-center">
                    {(auth.user?.displayName ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium hidden xl:inline">{auth.user?.displayName}</span>
                </Link>
                <button onClick={logout} className="btn-ghost !p-2" title="Wyloguj">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Zaloguj</Link>
                <Link to="/register" className="btn-brand">Załóż konto</Link>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden btn-ghost !p-2"
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 py-3 space-y-1 animate-fade-in">
            <div className="px-1 pb-2"><SearchBar /></div>
            <NavItem to="/courses" label="Katalog" icon={BookOpen} onClick={close} />
            <NavItem to="/leaderboard" label="Ranking" icon={Trophy} onClick={close} />
            <NavItem to="/pricing" label="Cennik" icon={Tag} onClick={close} />
            {auth.isAuthenticated() && (
              <>
                <NavItem to="/my-courses" label="Moje kursy" icon={GraduationCap} onClick={close} />
                <NavItem to="/my-certificates" label="Certyfikaty" icon={Award} onClick={close} />
                <NavItem to="/account" label={auth.user?.displayName ?? 'Konto'} onClick={close} />
              </>
            )}
            {(auth.user?.role === 'Author' || auth.user?.role === 'Admin') && (
              <NavItem to="/author" label="Panel autora" icon={LayoutDashboard} onClick={close} />
            )}
            {auth.user?.role === 'Admin' && (
              <NavItem to="/admin" label="Admin" icon={Shield} onClick={close} />
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 mt-2">
              <ThemeToggle />
              {auth.isAuthenticated() ? (
                <button onClick={logout} className="btn-secondary flex-1">
                  <LogOut className="w-4 h-4" /> Wyloguj
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary flex-1" onClick={close}>Zaloguj</Link>
                  <Link to="/register" className="btn-brand flex-1" onClick={close}>Załóż konto</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white/50 dark:bg-zinc-950 dark:border-zinc-800">
      <div className="container-page py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
        <div>
          <Link to="/" className="flex items-center gap-2 font-bold text-base">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <GraduationCap className="w-4 h-4" />
            </span>
            Kursy<span className="text-brand-600">.pl</span>
          </Link>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">
            Polska platforma do interaktywnej nauki kodowania — z AI mentorem po polsku.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Platforma</h4>
          <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
            <li><Link to="/courses" className="hover:text-brand-600">Katalog kursów</Link></li>
            <li><Link to="/pricing" className="hover:text-brand-600">Cennik</Link></li>
            <li><Link to="/leaderboard" className="hover:text-brand-600">Ranking</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Dla autorów</h4>
          <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
            <li><Link to="/register" className="hover:text-brand-600">Załóż konto autora</Link></li>
            <li><Link to="/author" className="hover:text-brand-600">Panel autora</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Prawne</h4>
          <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
            <li><Link to="/terms" className="hover:text-brand-600">Regulamin</Link></li>
            <li><Link to="/privacy" className="hover:text-brand-600">Prywatność</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-200 dark:border-zinc-800 py-4">
        <p className="container-page text-xs text-zinc-500 dark:text-zinc-500">
          © {new Date().getFullYear()} Kursy.pl — wszystkie prawa zastrzeżone.
        </p>
      </div>
    </footer>
  );
}
