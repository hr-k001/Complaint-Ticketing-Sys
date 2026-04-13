import React, { useState, useEffect } from 'react';
import { getAgentDashboard, getAgentTickets } from '../services/api';
import { AxiosError } from 'axios';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';

// Define the shape of the dashboard data based on your API
interface DashboardStats {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    escalated_tickets: number;
}

interface Ticket {
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
    user_id?: string;
    assigned_agent_id?: string;
}

const AgentDashboard: React.FC = () => {
    const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDashboardData();
        loadTickets();
    }, []);

    const loadDashboardData = async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await getAgentDashboard();
            setDashboard(response.data);
            setError(null);
        } catch (err) {
            console.error('Error loading agent dashboard:', err);
            if (err instanceof AxiosError) {
                setError(err.response?.data?.detail || err.message);
            } else {
                setError('Failed to load dashboard data');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadTickets = async (): Promise<void> => {
        try {
            setLoadingTickets(true);
            const response = await getAgentTickets();
            setTickets(response.data || []);
        } catch (err) {
            console.error('Error loading assigned tickets:', err);
        } finally {
            setLoadingTickets(false);
        }
    };

    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            'Open': '#ff9800',
            'In Progress': '#2196f3',
            'Resolved': '#4caf50',
            'Closed': '#9e9e9e',
            'Escalated': '#f44336'
        };
        return colors[status] || '#9e9e9e';
    };

    const getPriorityColor = (priority: string): string => {
        const colors: Record<string, string> = {
            'Low': '#4caf50',
            'Medium': '#ff9800',
            'High': '#f44336',
            'Critical': '#9c27b0'
        };
        return colors[priority] || '#9e9e9e';
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button variant="contained" onClick={loadDashboardData}>
                    Retry
                </Button>
            </Container>
        );
    }

    if (!dashboard) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="info">No dashboard data available</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Agent Dashboard
                </Typography>
                <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                        loadDashboardData();
                        loadTickets();
                    }}
                >
                    Refresh
                </Button>
            </Box>

            {/* Stats Cards - Using flexbox */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Box sx={{ flex: '1 1 200px', minWidth: '180px' }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AssignmentIcon sx={{ color: '#1976d2', mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    Total Assigned
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="div">
                                {dashboard.total_tickets}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 200px', minWidth: '180px' }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <PendingIcon sx={{ color: '#ff9800', mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    Open Tickets
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="div" sx={{ color: '#ff9800' }}>
                                {dashboard.open_tickets}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 200px', minWidth: '180px' }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CheckCircleIcon sx={{ color: '#4caf50', mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    Resolved Tickets
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="div" sx={{ color: '#4caf50' }}>
                                {dashboard.resolved_tickets}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 200px', minWidth: '180px' }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <WarningIcon sx={{ color: '#f44336', mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    Escalated Tickets
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="div" sx={{ color: '#f44336' }}>
                                {dashboard.escalated_tickets}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Second Row of Stats */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Box sx={{ flex: '1 1 200px', minWidth: '180px' }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                In Progress
                            </Typography>
                            <Typography variant="h4" sx={{ color: '#2196f3' }}>
                                {dashboard.in_progress_tickets}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 200px', minWidth: '180px' }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Closed Tickets
                            </Typography>
                            <Typography variant="h4" sx={{ color: '#9e9e9e' }}>
                                {dashboard.closed_tickets}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Assigned Tickets Section */}
            <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                    My Assigned Tickets
                </Typography>
                
                {loadingTickets ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell><strong>Ticket #</strong></TableCell>
                                    <TableCell><strong>Title</strong></TableCell>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Priority</strong></TableCell>
                                    <TableCell><strong>Created</strong></TableCell>
                                    <TableCell><strong>Due Date</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Typography sx={{ py: 3 }} color="textSecondary">
                                                No tickets assigned to you
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tickets.map((ticket) => (
                                        <TableRow key={ticket.id} hover>
                                            <TableCell>
                                                <strong>{ticket.ticket_number}</strong>
                                            </TableCell>
                                            <TableCell>{ticket.title}</TableCell>
                                            <TableCell>
                                                <Chip label={ticket.category} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={ticket.status} 
                                                    size="small"
                                                    sx={{ 
                                                        backgroundColor: getStatusColor(ticket.status), 
                                                        color: 'white',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={ticket.priority} 
                                                    size="small"
                                                    sx={{ 
                                                        backgroundColor: getPriorityColor(ticket.priority), 
                                                        color: 'white',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                {ticket.due_date ? (
                                                    <span style={{ 
                                                        color: new Date(ticket.due_date) < new Date() && ticket.status !== 'Resolved' ? '#f44336' : 'inherit'
                                                    }}>
                                                        {new Date(ticket.due_date).toLocaleDateString()}
                                                    </span>
                                                ) : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Container>
    );
};

export default AgentDashboard;