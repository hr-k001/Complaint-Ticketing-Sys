import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth'; // Change this line - import from hooks, not contexts
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
    if (!roles.includes(user.role)) return <Navigate to="/dashboard" />;
    return <>{children}</>;
}

// Root redirect component - fixed version
function RootRedirect() {
    const { user, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    
    if (!user) return <Navigate to="/login" />;
    
    // Redirect based on role
    switch(user.role) {
        case 'admin':
            return <Navigate to="/admin" />;
        case 'agent':
            return <Navigate to="/agent" />;
        case 'user':
            return <Navigate to="/dashboard" />;
        default:
            return <Navigate to="/login" />;
    }
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
                    <Route path="/" element={<RootRedirect />} />
                    {/* Catch all unmatched routes - redirect to home */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;