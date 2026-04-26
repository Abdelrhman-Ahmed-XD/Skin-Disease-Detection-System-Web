import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, LogOut, Menu, X, Scan, History, BarChart2, User } from 'lucide-react';
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

            {/* ===================== LOGO — ONLY THIS SECTION CHANGED ===================== */}
            <Link to="/" className="flex items-center gap-3 group">
              {/* Circular container matching the screenshot: light-blue bg + teal border */}
              <div
                className="relative flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#cce9f3',
                  border: '2.5px solid #4ec9d8',
                  overflow: 'hidden',
                }}
              >
                <img
                  src="/sign.png"
                  alt="Skinsight Logo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    /* Keep the image as-is in both modes — no invert */
                  }}
                />
              </div>

              {/* Text block */}
              <div className="flex flex-col leading-tight">
                <span
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: '1.45rem',
                    letterSpacing: '0.06em',
                    color: theme === 'dark' ? '#ffffff' : '#1a1a2e',
                    lineHeight: 1.1,
                  }}
                >
                  <span style={{ color: '#3ab4cc', fontWeight: 700 }}>S</span>kinsight
                </span>
                <span
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: '0.68rem',
                    fontStyle: 'italic',
                    letterSpacing: '0.04em',
                    color: theme === 'dark' ? '#9ab' : '#555',
                    lineHeight: 1.2,
                  }}
                >
                  Snap.Detect.Protect
                </span>
              </div>
            </Link>
            {/* ===================== END LOGO ===================== */}

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
                        <User size={14} />Profile
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