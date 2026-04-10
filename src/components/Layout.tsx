import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

export const Layout: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(201,138,74,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(18,94,99,0.10),_transparent_30%),linear-gradient(180deg,_#fbf8f3_0%,_#f2efe8_52%,_#edf2f0_100%)] text-gray-900 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top_left,_rgba(201,138,74,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(18,94,99,0.10),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] dark:text-gray-100">
      <Navbar />
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: theme === 'dark' ? '#f3f4f6' : '#111827',
          },
        }}
      />
    </div>
  );
};
