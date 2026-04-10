import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Activity, User, LogOut, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isGuest, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'History', path: '/history' },
    { name: 'Reports', path: '/reports' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-[rgba(251,248,243,0.78)] backdrop-blur-xl transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/78">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-[74px] items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-cyan-700 text-white shadow-[0_14px_30px_rgba(17,94,89,0.26)]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-bold tracking-tight text-gray-900 dark:text-white">DermoScan</span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500 dark:text-gray-400">
                Professional Edition
              </span>
            </div>
          </Link>

          <div className="hidden items-center space-x-8 md:flex">
            <a href="/#workflow" className="text-sm font-medium text-gray-700 transition-colors hover:text-teal-700 dark:text-gray-300 dark:hover:text-teal-400">
              Workflow
            </a>
            {(user || isGuest) && navLinks.map((link) => (
              <Link key={link.name} to={link.path} className="text-sm font-medium text-gray-700 transition-colors hover:text-teal-700 dark:text-gray-300 dark:hover:text-teal-400">
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden items-center space-x-4 md:flex">
            <button onClick={toggleTheme} className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user || isGuest ? (
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <User className="h-4 w-4" />
                  <span>{user?.displayName || (isGuest ? 'Guest' : 'User')}</span>
                </span>
                <button onClick={handleLogout} className="flex items-center space-x-1 text-sm font-medium text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:border-teal-200 hover:text-teal-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-teal-700 dark:hover:text-teal-400">
                  Sign in
                </Link>
                <Link to="/signup" className="rounded-full bg-teal-800 px-5 py-2.5 text-sm font-medium text-white shadow-[0_16px_32px_rgba(17,94,89,0.2)] transition-colors hover:bg-teal-700">
                  Sign up
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button onClick={toggleTheme} className="mr-2 rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 transition-colors hover:text-teal-700 dark:text-gray-300 dark:hover:text-teal-400">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            <a href="/#workflow" onClick={() => setIsOpen(false)} className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
              Workflow
            </a>
            {(user || isGuest) && navLinks.map((link) => (
              <Link key={link.name} to={link.path} onClick={() => setIsOpen(false)} className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800">
                {link.name}
              </Link>
            ))}
            {!user && !isGuest ? (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)} className="block rounded-full border border-slate-200 px-3 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  Sign in
                </Link>
                <Link to="/signup" onClick={() => setIsOpen(false)} className="block rounded-full bg-teal-800 px-3 py-2 text-base font-medium text-white transition-colors hover:bg-teal-700 dark:text-white">
                  Sign up
                </Link>
              </>
            ) : (
              <button onClick={() => { handleLogout(); setIsOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-red-600 transition-colors hover:bg-gray-50 dark:text-red-400 dark:hover:bg-gray-800">
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
