import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

export const Layout: React.FC = () => {
    const { theme } = useTheme();
    return (
        <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg)', color: 'var(--tx)' }}>
            <Navbar />
            <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <Outlet />
            </main>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: theme === 'dark' ? '#141f33' : '#ffffff',
                        color: theme === 'dark' ? '#f0f6ff' : '#0f172a',
                        border: theme === 'dark' ? '1px solid rgba(0,229,255,0.15)' : '1px solid rgba(15,23,42,0.1)',
                        borderRadius: '12px',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '14px',
                        padding: '12px 16px',
                        boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(8,145,178,0.10)',
                    },
                    success: { iconTheme: { primary: '#00e5ff', secondary: '#070d1a' } },
                    error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />
        </div>
    );
};