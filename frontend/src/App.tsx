import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TicketDetails from './pages/TicketDetails';
import Navbar from './components/Navbar';

// Simple wrapper component
function PrivateRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
    const { user, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    if (!roles.includes(user.role)) return <Navigate to="/" />;
    return <>{children}</>;
}

function AppRoutes() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'agent') return <Navigate to="/agent" />;
    return <Navigate to="/dashboard" />;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Navbar />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={
                        <PrivateRoute roles={['user']}>
                            <UserDashboard />
                        </PrivateRoute>
                    } />
                    <Route path="/agent" element={
                        <PrivateRoute roles={['agent', 'admin']}>
                            <AgentDashboard />
                        </PrivateRoute>
                    } />
                    <Route path="/admin" element={
                        <PrivateRoute roles={['admin']}>
                            <AdminDashboard />
                        </PrivateRoute>
                    } />
                    <Route path="/tickets/:ticketNumber" element={
                        <PrivateRoute roles={['user', 'agent', 'admin']}>
                            <TicketDetails />
                        </PrivateRoute>
                    } />
                    <Route path="/" element={<AppRoutes />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;