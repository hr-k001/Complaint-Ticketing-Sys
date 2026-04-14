import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ========== TYPES ==========
export interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
    agent_number?: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export interface Ticket {
    id: string;
    ticket_number: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    status: string;
    created_at: string;
    due_date: string;
    is_escalated: boolean;
}

export interface Comment {
    id: string;
    author_id: string;
    message: string;
    created_at: string;
}

export interface DashboardStats {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    escalated_tickets: number;
}

// ========== AUTH ENDPOINTS ==========
export const getCurrentUser = () => api.get<User>('/auth/me');
export const login = async (credentials: { username: string; password: string }) => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    return api.post<LoginResponse>('/auth/token', formData.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    });
};
export const register = (userData: { full_name: string; email: string; password: string; role: string }) => 
    api.post('/auth/register', userData);

// ========== TICKET ENDPOINTS ==========
export const getUserTickets = () => api.get<Ticket[]>('/tickets/');

// CREATE TICKET - Added this function
export const createTicket = (ticketData: { 
    title: string; 
    description: string; 
    priority: string; 
    category: string;
}) => api.post<Ticket>('/tickets/', ticketData);

export const getTicketByNumber = (ticketNumber: string) => 
    api.get<Ticket>(`/tickets/number/${ticketNumber}`);

export const updateTicketStatus = (ticketId: string, status: string) => 
    api.patch(`/tickets/${ticketId}/status`, { status });

// Agent endpoints
export const getAgentTickets = () => api.get<Ticket[]>('/agent/tickets');
export const getAgentDashboard = () => api.get<DashboardStats>('/agent/dashboard');

// Admin endpoints
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getAgentsList = () => api.get('/admin/agents');
export const assignTicket = (ticketNumber: string, agentNumber: string) =>
    api.post('/admin/assign-ticket', { ticket_number: ticketNumber, agent_number: agentNumber });
export const getTicketAgingDetails = (ticketId: string) =>
    api.get(`/analytics/tickets/${ticketId}/aging-details`);

// ========== COMMENT ENDPOINTS ==========
export const getTicketComments = (ticketId: string) => 
    api.get<Comment[]>(`/comments/tickets/${ticketId}/comments`);

export const addComment = (ticketId: string, message: string) => 
    api.post<Comment>(`/comments/tickets/${ticketId}/comments`, { message });

export default api;