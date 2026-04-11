import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, LogOut, Menu, X, Scan, History, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar: React.FC = () => {
  const { user, userProfile, isGuest, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  const handleLogout = async () => { await logout(); navigate('/'); };
  const loggedIn = user || isGuest;
  const navLinks = [
    { name: 'Scan',    path: '/dashboard', icon: Scan },
    { name: 'History', path: '/history',   icon: History },
    { name: 'Reports', path: '/reports',   icon: BarChart2 },
  ];
  const isActive = (p: string) => location.pathname === p;
  const firstName = userProfile?.firstName || user?.displayName?.split(' ')[0] || (isGuest ? 'Guest' : '');

  const navBg = scrolled
      ? (theme === 'dark' ? 'rgba(7,13,26,0.92)' : 'rgba(246,248,252,0.92)')
      : 'transparent';

  return (
      <nav className="sticky top-0 z-50 w-full transition-all duration-300"
           style={{ background: navBg, backdropFilter: scrolled ? 'blur(20px)' : 'none',
             borderBottom: scrolled ? '1px solid var(--br)' : '1px solid transparent' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-[66px] items-center justify-between">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all group-hover:scale-105"
                   style={{ background: 'var(--accent)', boxShadow: '0 0 16px var(--accent-glow)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26C17.81 13.47 19 11.38 19 9c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.8" fill="none"/>
                  <circle cx="12" cy="9" r="2.5" fill="currentColor" opacity="0.8"/>
                </svg>
              </div>
              <div>
              <span className="block text-base font-bold tracking-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--tx)' }}>
                Skin<span style={{ color: 'var(--accent)' }}>Sight</span>
              </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.2em]"
                      style={{ color: 'var(--tx3)' }}>AI Detection</span>
              </div>
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-1 md:flex">
              <a href="/#how" className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                 style={{ color: 'var(--tx2)' }}
                 onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                 onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx2)')}>
                How it works
              </a>
              {loggedIn && navLinks.map(({ name, path, icon: Icon }) => (
                  <Link key={name} to={path}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          color: isActive(path) ? 'var(--accent)' : 'var(--tx2)',
                          background: isActive(path) ? 'var(--accent-dim)' : 'transparent',
                        }}>
                    <Icon size={13} />{name}
                  </Link>
              ))}
            </div>

            {/* Right */}
            <div className="hidden items-center gap-2.5 md:flex">
              <button onClick={toggleTheme}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--tx2)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {loggedIn ? (
                  <div className="flex items-center gap-2">
                    <Link to="/profile"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{ color: isActive('/profile') ? 'var(--accent)' : 'var(--tx2)',
                            background: isActive('/profile') ? 'var(--accent-dim)' : 'transparent' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                           style={{ background: 'var(--accent)', color: '#070d1a' }}>
                        {firstName.charAt(0).toUpperCase()}
                      </div>
                      <span>{firstName}</span>
                    </Link>
                    <button onClick={handleLogout}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                            style={{ color: '#ef4444' }}>
                      <LogOut size={13} />Sign out
                    </button>
                  </div>
              ) : (
                  <div className="flex items-center gap-2">
                    <Link to="/login" className="btn-ghost px-4 py-2 rounded-xl text-sm">Sign in</Link>
                    <Link to="/signup" className="btn-accent px-4 py-2 rounded-xl text-sm">Get Started</Link>
                  </div>
              )}
            </div>

            {/* Mobile */}
            <div className="flex items-center gap-1 md:hidden">
              <button onClick={toggleTheme} className="p-2 rounded-lg" style={{ color: 'var(--tx2)' }}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg" style={{ color: 'var(--tx)' }}>
                {isOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                          className="md:hidden overflow-hidden"
                          style={{ borderTop: '1px solid var(--br)',
                            background: theme === 'dark' ? 'rgba(7,13,26,0.97)' : 'rgba(246,248,252,0.97)',
                            backdropFilter: 'blur(20px)' }}>
                <div className="px-4 py-3 space-y-1">
                  <a href="/#how" className="block px-3 py-2.5 rounded-lg text-sm font-medium"
                     style={{ color: 'var(--tx2)' }}>How it works</a>
                  {loggedIn && navLinks.map(({ name, path, icon: Icon }) => (
                      <Link key={name} to={path}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                            style={{ color: isActive(path) ? 'var(--accent)' : 'var(--tx2)',
                              background: isActive(path) ? 'var(--accent-dim)' : 'transparent' }}>
                        <Icon size={14} />{name}
                      </Link>
                  ))}
                  {loggedIn && (
                      <Link to="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                            style={{ color: isActive('/profile') ? 'var(--accent)' : 'var(--tx2)',
                              background: isActive('/profile') ? 'var(--accent-dim)' : 'transparent' }}>
                        Profile
                      </Link>
                  )}
                  <div className="pt-2" style={{ borderTop: '1px solid var(--br)' }}>
                    {loggedIn ? (
                        <button onClick={handleLogout}
                                className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                                style={{ color: '#ef4444' }}>
                          <LogOut size={14} />Sign out
                        </button>
                    ) : (
                        <div className="flex flex-col gap-2">
                          <Link to="/login" className="btn-ghost px-4 py-2.5 rounded-xl text-sm text-center">Sign in</Link>
                          <Link to="/signup" className="btn-accent px-4 py-2.5 rounded-xl text-sm text-center">Get Started</Link>
                        </div>
                    )}
                  </div>
                </div>
              </motion.div>
          )}
        </AnimatePresence>
      </nav>
  );
};