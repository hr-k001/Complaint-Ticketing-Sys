import React, { useState, useEffect } from 'react';
import { 
    getAdminDashboard, 
    getAgentsList, 
    getTicketComments,
    addComment,
    updateTicketStatus,
    getUserTickets,
    assignTicket,
    getTicketAgingDetails
} from '../services/api';
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
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import LinearProgress from '@mui/material/LinearProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CommentIcon from '@mui/icons-material/Comment';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import QueryStatsIcon from '@mui/icons-material/QueryStats';

interface DashboardData {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    escalated_tickets: number;
    high_priority_tickets?: number;
    medium_priority_tickets?: number;
    low_priority_tickets?: number;
}

interface Agent {
    id: string;
    full_name: string;
    email: string;
    agent_number?: string;
    assigned_tickets_count?: number;
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
    assigned_to?: string;
    user?: {
        full_name: string;
        email: string;
    };
}

interface Comment {
    id: string;
    author_id: string;
    message: string;
    created_at: string;
    author_name?: string;
}

interface AgingDetails {
    ticket_id: string;
    ticket_number: string;
    created_at: string;
    current_time: string;
    age_days: number;
    age_hours: number;
    age_minutes: number;
    status: string;
    priority: string;
    due_date: string | null;
    is_escalated: boolean;
    sla_remaining_hours: number | null;
    sla_status?: string;
}

const AdminDashboard: React.FC = () => {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingAgents, setLoadingAgents] = useState<boolean>(false);
    const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState<number>(0);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success'
    });

    // Status dialog
    const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [newStatus, setNewStatus] = useState<string>('');
    const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

    // Comments dialog
    const [commentsDialogOpen, setCommentsDialogOpen] = useState<boolean>(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState<string>('');
    const [loadingComments, setLoadingComments] = useState<boolean>(false);

    // Assign Agent dialog
    const [assignDialogOpen, setAssignDialogOpen] = useState<boolean>(false);
    const [selectedAgentNumber, setSelectedAgentNumber] = useState<string>('');
    const [assigning, setAssigning] = useState<boolean>(false);

    // Aging Report dialog
    const [agingDialogOpen, setAgingDialogOpen] = useState<boolean>(false);
    const [agingDetails, setAgingDetails] = useState<AgingDetails | null>(null);
    const [loadingAging, setLoadingAging] = useState<boolean>(false);

    useEffect(() => {
        loadDashboardData();
        loadAgentsList();
        loadAllTickets();
    }, []);

    const loadDashboardData = async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await getAdminDashboard();
            setDashboard(response.data);
            setError(null);
        } catch (err) {
            console.error('Error loading admin dashboard:', err);
            if (err instanceof AxiosError) {
                setError(err.response?.data?.detail || err.message);
            } else {
                setError('Failed to load dashboard data');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadAgentsList = async (): Promise<void> => {
        try {
            setLoadingAgents(true);
            const response = await getAgentsList();
            setAgents(response.data || []);
        } catch (err) {
            console.error('Error loading agents list:', err);
        } finally {
            setLoadingAgents(false);
        }
    };

    const loadAllTickets = async (): Promise<void> => {
        try {
            setLoadingTickets(true);
            const response = await getUserTickets();
            setTickets(response.data || []);
        } catch (err) {
            console.error('Error loading tickets:', err);
        } finally {
            setLoadingTickets(false);
        }
    };

    const loadComments = async (ticketId: string) => {
        try {
            setLoadingComments(true);
            const response = await getTicketComments(ticketId);
            setComments(response.data || []);
        } catch (err) {
            console.error('Error loading comments:', err);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleOpenAgingReport = async (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setAgingDetails(null);
        setAgingDialogOpen(true);
        try {
            setLoadingAging(true);
            const response = await getTicketAgingDetails(ticket.id);
            setAgingDetails(response.data);
        } catch (err) {
            console.error('Error loading aging details:', err);
            setSnackbar({ open: true, message: 'Failed to load aging report', severity: 'error' });
        } finally {
            setLoadingAging(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedTicket) return;
        try {
            await addComment(selectedTicket.id, newComment);
            setNewComment('');
            await loadComments(selectedTicket.id);
        } catch (err) {
            console.error('Error adding comment:', err);
            setError('Failed to add comment');
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedTicket || !newStatus) return;
        try {
            setUpdatingStatus(true);
            await updateTicketStatus(selectedTicket.id, newStatus);
            await loadAllTickets();
            await loadDashboardData();
            setStatusDialogOpen(false);
            setSelectedTicket(null);
            setNewStatus('');
            setSnackbar({ open: true, message: 'Ticket status updated successfully', severity: 'success' });
        } catch (err) {
            console.error('Error updating status:', err);
            setError('Failed to update ticket status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleAssignAgent = async () => {
        if (!selectedTicket || !selectedAgentNumber) return;
        try {
            setAssigning(true);
            await assignTicket(selectedTicket.ticket_number, selectedAgentNumber);
            await loadAllTickets();
            await loadDashboardData();
            setAssignDialogOpen(false);
            setSelectedAgentNumber('');
            setSnackbar({ open: true, message: 'Ticket assigned successfully', severity: 'success' });
        } catch (err) {
            const axiosErr = err as AxiosError<{ detail: string }>;
            setSnackbar({
                open: true,
                message: axiosErr.response?.data?.detail || 'Failed to assign agent',
                severity: 'error',
            });
        } finally {
            setAssigning(false);
        }
    };

    const handleOpenStatusDialog = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setNewStatus(ticket.status);
        setStatusDialogOpen(true);
    };

    const handleOpenCommentsDialog = async (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setCommentsDialogOpen(true);
        await loadComments(ticket.id);
    };

    const handleOpenAssignDialog = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        const currentAgent = agents.find(a => a.id === ticket.assigned_to);
        setSelectedAgentNumber(currentAgent?.agent_number || '');
        setAssignDialogOpen(true);
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
            'low': '#4caf50',
            'medium': '#ff9800',
            'high': '#f44336',
            'critical': '#9c27b0'
        };
        return colors[priority?.toLowerCase()] || '#9e9e9e';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Resolved': return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
            case 'Closed': return <CloseIcon sx={{ color: '#9e9e9e' }} />;
            case 'Escalated': return <WarningIcon sx={{ color: '#f44336' }} />;
            default: return <PendingIcon sx={{ color: '#ff9800' }} />;
        }
    };

    const getSlaColor = (slaStatus?: string, remainingHours?: number | null): string => {
        if (slaStatus === 'Breached') return '#f44336';
        if (remainingHours !== null && remainingHours !== undefined && remainingHours < 4) return '#ff9800';
        return '#4caf50';
    };

    const getSlaProgress = (aging: AgingDetails): number => {
        if (!aging.due_date) return 0;
        const total = new Date(aging.due_date).getTime() - new Date(aging.created_at).getTime();
        const elapsed = new Date(aging.current_time).getTime() - new Date(aging.created_at).getTime();
        return Math.min(100, Math.round((elapsed / total) * 100));
    };

    const filteredTickets = () => {
        if (tabValue === 0) return tickets;
        if (tabValue === 1) return tickets.filter(t => t.status === 'Open');
        if (tabValue === 2) return tickets.filter(t => t.status === 'In Progress');
        if (tabValue === 3) return tickets.filter(t => t.status === 'Resolved');
        if (tabValue === 4) return tickets.filter(t => t.status === 'Closed');
        if (tabValue === 5) return tickets.filter(t => t.is_escalated);
        return tickets;
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
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button variant="contained" onClick={loadDashboardData}>Retry</Button>
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
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
                <Button variant="outlined" startIcon={<RefreshIcon />}
                    onClick={() => { loadDashboardData(); loadAgentsList(); loadAllTickets(); }}>
                    Refresh All
                </Button>
            </Box>

            {/* Stats Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                {[
                    { label: 'Total Tickets', value: dashboard.total_tickets, color: '#1976d2', icon: <AssignmentIcon sx={{ color: '#1976d2', mr: 1 }} /> },
                    { label: 'Open Tickets', value: dashboard.open_tickets, color: '#ff9800', icon: <PendingIcon sx={{ color: '#ff9800', mr: 1 }} /> },
                    { label: 'Resolved', value: dashboard.resolved_tickets, color: '#4caf50', icon: <CheckCircleIcon sx={{ color: '#4caf50', mr: 1 }} /> },
                    { label: 'Escalated', value: dashboard.escalated_tickets, color: '#f44336', icon: <WarningIcon sx={{ color: '#f44336', mr: 1 }} /> },
                    { label: 'In Progress', value: dashboard.in_progress_tickets, color: '#2196f3', icon: null },
                    { label: 'Closed', value: dashboard.closed_tickets, color: '#9e9e9e', icon: null },
                ].map(({ label, value, color, icon }) => (
                    <Box key={label} sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                        <Card>
                            <CardContent>
                                {icon && <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>{icon}<Typography color="textSecondary">{label}</Typography></Box>}
                                {!icon && <Typography color="textSecondary">{label}</Typography>}
                                <Typography variant="h3" sx={{ color }}>{value}</Typography>
                            </CardContent>
                        </Card>
                    </Box>
                ))}
            </Box>

            {/* Tickets Management */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Ticket Management</Typography>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                    <Tab label="All Tickets" />
                    <Tab label="Open" />
                    <Tab label="In Progress" />
                    <Tab label="Resolved" />
                    <Tab label="Closed" />
                    <Tab label="Escalated" />
                </Tabs>

                {loadingTickets ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell><strong>Ticket #</strong></TableCell>
                                    <TableCell><strong>Title</strong></TableCell>
                                    <TableCell><strong>User</strong></TableCell>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Priority</strong></TableCell>
                                    <TableCell><strong>Created</strong></TableCell>
                                    <TableCell><strong>Due Date</strong></TableCell>
                                    <TableCell><strong>Assigned Agent</strong></TableCell>
                                    <TableCell><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTickets().length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center">
                                            <Typography sx={{ py: 3 }} color="textSecondary">No tickets found</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickets().map((ticket) => {
                                        const assignedAgent = agents.find(a => a.id === ticket.assigned_to);
                                        return (
                                            <TableRow key={ticket.id} hover>
                                                <TableCell><strong>{ticket.ticket_number}</strong></TableCell>
                                                <TableCell>{ticket.title}</TableCell>
                                                <TableCell>
                                                    <Chip label={ticket.user?.full_name || 'Unknown'} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={ticket.category} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip icon={getStatusIcon(ticket.status)} label={ticket.status} size="small"
                                                        sx={{ backgroundColor: getStatusColor(ticket.status), color: 'white', fontWeight: 'bold' }} />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={ticket.priority} size="small"
                                                        sx={{ backgroundColor: getPriorityColor(ticket.priority), color: 'white', fontWeight: 'bold' }} />
                                                </TableCell>
                                                <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    {ticket.due_date ? (
                                                        <span style={{ color: new Date(ticket.due_date) < new Date() && ticket.status !== 'Resolved' ? '#f44336' : 'inherit' }}>
                                                            {new Date(ticket.due_date).toLocaleDateString()}
                                                        </span>
                                                    ) : 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {assignedAgent ? (
                                                        <Chip label={assignedAgent.full_name} size="small" sx={{ backgroundColor: '#e3f2fd', color: '#1565c0' }} />
                                                    ) : (
                                                        <Chip label="Unassigned" size="small" variant="outlined" sx={{ color: '#9e9e9e' }} />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Tooltip title="Update Status">
                                                            <IconButton size="small" onClick={() => handleOpenStatusDialog(ticket)} sx={{ color: '#2196f3' }}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="View Comments">
                                                            <IconButton size="small" onClick={() => handleOpenCommentsDialog(ticket)} sx={{ color: '#4caf50' }}>
                                                                <CommentIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Assign Agent">
                                                            <IconButton size="small" onClick={() => handleOpenAssignDialog(ticket)} sx={{ color: '#9c27b0' }}>
                                                                <PersonAddIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Aging Report">
                                                            <IconButton size="small" onClick={() => handleOpenAgingReport(ticket)} sx={{ color: '#e65100' }}>
                                                                <QueryStatsIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Agents Section */}
            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PeopleIcon sx={{ mr: 1, color: '#1976d2' }} />
                    <Typography variant="h5">Support Agents</Typography>
                </Box>
                {loadingAgents ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell><strong>Agent Name</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Agent Number</strong></TableCell>
                                    <TableCell><strong>Assigned Tickets</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {agents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            <Typography sx={{ py: 3 }} color="textSecondary">No agents found</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    agents.map((agent) => (
                                        <TableRow key={agent.id} hover>
                                            <TableCell><strong>{agent.full_name}</strong></TableCell>
                                            <TableCell>{agent.email}</TableCell>
                                            <TableCell>
                                                <Chip label={agent.agent_number || 'N/A'} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={agent.assigned_tickets_count || 0} size="small"
                                                    sx={{
                                                        backgroundColor: (agent.assigned_tickets_count || 0) > 10 ? '#f44336' :
                                                            (agent.assigned_tickets_count || 0) > 5 ? '#ff9800' : '#4caf50',
                                                        color: 'white'
                                                    }} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* ── Update Status Dialog ── */}
            <Dialog open={statusDialogOpen} onClose={() => !updatingStatus && setStatusDialogOpen(false)}>
                <DialogTitle>Update Ticket Status</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                            Ticket: <strong>{selectedTicket?.ticket_number}</strong> — {selectedTicket?.title}
                        </Typography>
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Status</InputLabel>
                            <Select value={newStatus} label="Status" onChange={(e) => setNewStatus(e.target.value)}>
                                <MenuItem value="Open">Open</MenuItem>
                                <MenuItem value="In Progress">In Progress</MenuItem>
                                <MenuItem value="Resolved">Resolved</MenuItem>
                                <MenuItem value="Closed">Closed</MenuItem>
                                <MenuItem value="Escalated">Escalated</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStatusDialogOpen(false)} disabled={updatingStatus}>Cancel</Button>
                    <Button onClick={handleUpdateStatus} variant="contained" disabled={updatingStatus || newStatus === selectedTicket?.status}>
                        {updatingStatus ? <CircularProgress size={24} /> : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Assign Agent Dialog ── */}
            <Dialog open={assignDialogOpen} onClose={() => !assigning && setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Assign Agent</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
                            Ticket: <strong>{selectedTicket?.ticket_number}</strong> — {selectedTicket?.title}
                        </Typography>
                        <FormControl fullWidth>
                            <InputLabel>Select Agent</InputLabel>
                            <Select value={selectedAgentNumber} label="Select Agent" onChange={(e) => setSelectedAgentNumber(e.target.value)}>
                                {agents.map((agent) => (
                                    <MenuItem key={agent.id} value={agent.agent_number || ''}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                            <span>{agent.full_name}</span>
                                            <Chip label={`${agent.assigned_tickets_count ?? 0} tickets`} size="small"
                                                sx={{
                                                    ml: 1,
                                                    backgroundColor: (agent.assigned_tickets_count || 0) > 10 ? '#f44336' :
                                                        (agent.assigned_tickets_count || 0) > 5 ? '#ff9800' : '#4caf50',
                                                    color: 'white', fontSize: '11px'
                                                }} />
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignDialogOpen(false)} disabled={assigning}>Cancel</Button>
                    <Button onClick={handleAssignAgent} variant="contained" disabled={assigning || !selectedAgentNumber}>
                        {assigning ? <CircularProgress size={24} /> : 'Assign'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Comments Dialog ── */}
            <Dialog open={commentsDialogOpen} onClose={() => setCommentsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box>
                        <Typography variant="h6">Ticket #{selectedTicket?.ticket_number}</Typography>
                        <Typography variant="body2" color="textSecondary">{selectedTicket?.title}</Typography>
                        <Box sx={{ mt: 1 }}>
                            <Chip label={selectedTicket?.status} size="small" sx={{ backgroundColor: getStatusColor(selectedTicket?.status || ''), color: 'white' }} />
                            <Chip label={selectedTicket?.priority} size="small" sx={{ ml: 1, backgroundColor: getPriorityColor(selectedTicket?.priority || ''), color: 'white' }} />
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>Comments</Typography>
                    {loadingComments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
                    ) : (
                        <List>
                            {comments.length === 0 ? (
                                <Typography color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>No comments yet</Typography>
                            ) : (
                                comments.map((comment) => (
                                    <ListItem key={comment.id} alignItems="flex-start">
                                        <ListItemAvatar><Avatar><CommentIcon /></Avatar></ListItemAvatar>
                                        <ListItemText
                                            primary={<Typography variant="body2" color="textSecondary">{new Date(comment.created_at).toLocaleString()}</Typography>}
                                            secondary={comment.message}
                                        />
                                    </ListItem>
                                ))
                            )}
                        </List>
                    )}
                    <Box sx={{ mt: 2 }}>
                        <TextField label="Add a comment" fullWidth multiline rows={3}
                            value={newComment} onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type your message here..." />
                        <Button variant="contained" onClick={handleAddComment} sx={{ mt: 1 }} disabled={!newComment.trim()}>
                            Post Comment
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCommentsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* ── Aging Report Dialog ── */}
            <Dialog open={agingDialogOpen} onClose={() => setAgingDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <QueryStatsIcon sx={{ color: '#e65100' }} />
                        <Box>
                            <Typography variant="h6">Aging Report</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Ticket #{selectedTicket?.ticket_number} — {selectedTicket?.title}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {loadingAging ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                    ) : agingDetails ? (
                        <Box sx={{ mt: 1 }}>
                            {/* Age summary cards */}
                            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                                <Card sx={{ flex: '1 1 100px', backgroundColor: '#fff3e0' }}>
                                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Typography variant="h4" sx={{ color: '#e65100', fontWeight: 'bold' }}>
                                            {agingDetails.age_days}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">Days Old</Typography>
                                    </CardContent>
                                </Card>
                                <Card sx={{ flex: '1 1 100px', backgroundColor: '#fce4ec' }}>
                                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Typography variant="h4" sx={{ color: '#c62828', fontWeight: 'bold' }}>
                                            {agingDetails.age_hours}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">Total Hours</Typography>
                                    </CardContent>
                                </Card>
                                <Card sx={{ flex: '1 1 100px', backgroundColor: '#e8f5e9' }}>
                                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                            {agingDetails.sla_remaining_hours ?? '—'}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">SLA Hours Left</Typography>
                                    </CardContent>
                                </Card>
                            </Box>

                            {/* SLA progress bar */}
                            {agingDetails.due_date && (
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" color="textSecondary">SLA Usage</Typography>
                                        <Typography variant="body2" fontWeight={500}
                                            sx={{ color: getSlaColor(agingDetails.sla_status, agingDetails.sla_remaining_hours) }}>
                                            {getSlaProgress(agingDetails)}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={getSlaProgress(agingDetails)}
                                        sx={{
                                            height: 10, borderRadius: 5, backgroundColor: '#e0e0e0',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: getSlaColor(agingDetails.sla_status, agingDetails.sla_remaining_hours),
                                                borderRadius: 5,
                                            }
                                        }} />
                                </Box>
                            )}

                            <Divider sx={{ mb: 2 }} />

                            {/* Details grid */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                {[
                                    {
                                        label: 'Status',
                                        value: <Chip label={agingDetails.status} size="small"
                                            sx={{ backgroundColor: getStatusColor(agingDetails.status), color: 'white' }} />
                                    },
                                    {
                                        label: 'Priority',
                                        value: <Chip label={agingDetails.priority} size="small"
                                            sx={{ backgroundColor: getPriorityColor(agingDetails.priority), color: 'white' }} />
                                    },
                                    {
                                        label: 'SLA Status',
                                        value: <Chip label={agingDetails.sla_status || 'No SLA'} size="small"
                                            sx={{ backgroundColor: getSlaColor(agingDetails.sla_status, agingDetails.sla_remaining_hours), color: 'white' }} />
                                    },
                                    {
                                        label: 'Escalated',
                                        value: <Chip label={agingDetails.is_escalated ? 'Yes' : 'No'} size="small"
                                            sx={{ backgroundColor: agingDetails.is_escalated ? '#f44336' : '#4caf50', color: 'white' }} />
                                    },
                                    { label: 'Created', value: new Date(agingDetails.created_at).toLocaleString() },
                                    { label: 'Due Date', value: agingDetails.due_date ? new Date(agingDetails.due_date).toLocaleString() : 'N/A' },
                                ].map(({ label, value }) => (
                                    <Box key={label} sx={{ backgroundColor: '#f9f9f9', borderRadius: 1, p: 1.5 }}>
                                        <Typography variant="caption" color="textSecondary" display="block">{label}</Typography>
                                        {typeof value === 'string'
                                            ? <Typography variant="body2" fontWeight={500}>{value}</Typography>
                                            : value}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    ) : (
                        <Typography color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                            No aging data available
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAgingDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Container>
    );
};

export default AdminDashboard;