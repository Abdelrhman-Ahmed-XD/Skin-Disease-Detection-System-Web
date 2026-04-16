import React, {Suspense, lazy} from 'react';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import {ThemeProvider} from './context/ThemeContext';
import {AuthProvider} from './context/AuthContext';
import {Layout} from './components/Layout';
import {ProtectedRoute} from './components/ProtectedRoute';

// ── Lazy Load Pages for Code Splitting ──
const Landing = lazy(() => import('./pages/Landing').then(module => ({default: module.Landing})));
const Login = lazy(() => import('./pages/Login').then(module => ({default: module.Login})));
const Signup = lazy(() => import('./pages/Signup').then(module => ({default: module.Signup})));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(module => ({ default: module.ResetPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({default: module.Dashboard})));
const History = lazy(() => import('./pages/History').then(module => ({default: module.History})));
const Reports = lazy(() => import('./pages/Reports').then(module => ({default: module.Reports})));
const Profile = lazy(() => import('./pages/Profile').then(module => ({default: module.Profile})));

// ── Loading Fallback Component ──
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"/>
    </div>
);

const App: React.FC = () => (
    <ThemeProvider>
        <AuthProvider>
            <BrowserRouter>
                {/* Wrap Routes in Suspense to handle lazy loading states */}
                <Suspense fallback={<PageLoader/>}>
                    <Routes>
                        <Route path="/" element={<Layout/>}>
                            <Route index element={<Landing/>}/>
                            <Route path="login" element={<Login/>}/>
                            <Route path="signup" element={<Signup/>}/>
                            <Route path="forgot-password" element={<ForgotPassword/>}/>
                            <Route path="reset-password" element={<ResetPassword/>}/>

                            <Route path="dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
                            <Route path="history" element={<ProtectedRoute><History/></ProtectedRoute>}/>
                            <Route path="reports" element={<ProtectedRoute><Reports/></ProtectedRoute>}/>
                            <Route path="profile" element={<ProtectedRoute><Profile/></ProtectedRoute>}/>

                            <Route path="*" element={<Navigate to="/" replace/>}/>
                        </Route>
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    </ThemeProvider>
);

export default App;