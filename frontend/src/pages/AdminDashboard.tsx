import React, { useState, useEffect } from 'react';
import { 
    getAdminDashboard, 
    getAgentsList, 
    getTicketComments,
    addComment,
    updateTicketStatus,
    getUserTickets  // To get all tickets
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
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CommentIcon from '@mui/icons-material/Comment';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CloseIcon from '@mui/icons-material/Close';

interface DashboardData {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    resolved_tickets: number;
    closed_tickets: number;
    escalated_tickets: number;
    overdue_tickets?: number;
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
    user_id?: string;
    assigned_agent_id?: string;
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

const AdminDashboard: React.FC = () => {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingAgents, setLoadingAgents] = useState<boolean>(false);
    const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState<number>(0);
    
    // Dialog states
    const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [newStatus, setNewStatus] = useState<string>('');
    const [commentsDialogOpen, setCommentsDialogOpen] = useState<boolean>(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState<string>('');
    const [loadingComments, setLoadingComments] = useState<boolean>(false);
    const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

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
            const response = await getUserTickets(); // This gets all tickets for admin
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
        } catch (err) {
            console.error('Error updating status:', err);
            setError('Failed to update ticket status');
        } finally {
            setUpdatingStatus(false);
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

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'Resolved': return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
            case 'Closed': return <CloseIcon sx={{ color: '#9e9e9e' }} />;
            case 'Escalated': return <WarningIcon sx={{ color: '#f44336' }} />;
            default: return <PendingIcon sx={{ color: '#ff9800' }} />;
        }
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
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Admin Dashboard
                </Typography>
                <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                        loadDashboardData();
                        loadAgentsList();
                        loadAllTickets();
                    }}
                >
                    Refresh All
                </Button>
            </Box>

            {/* Stats Cards */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Box sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <AssignmentIcon sx={{ color: '#1976d2', mr: 1 }} />
                                <Typography color="textSecondary">Total Tickets</Typography>
                            </Box>
                            <Typography variant="h3">{dashboard.total_tickets}</Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <PendingIcon sx={{ color: '#ff9800', mr: 1 }} />
                                <Typography color="textSecondary">Open Tickets</Typography>
                            </Box>
                            <Typography variant="h3" sx={{ color: '#ff9800' }}>{dashboard.open_tickets}</Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CheckCircleIcon sx={{ color: '#4caf50', mr: 1 }} />
                                <Typography color="textSecondary">Resolved</Typography>
                            </Box>
                            <Typography variant="h3" sx={{ color: '#4caf50' }}>{dashboard.resolved_tickets}</Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <WarningIcon sx={{ color: '#f44336', mr: 1 }} />
                                <Typography color="textSecondary">Escalated</Typography>
                            </Box>
                            <Typography variant="h3" sx={{ color: '#f44336' }}>{dashboard.escalated_tickets}</Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary">In Progress</Typography>
                            <Typography variant="h4" sx={{ color: '#2196f3' }}>{dashboard.in_progress_tickets}</Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box sx={{ flex: '1 1 180px', minWidth: '160px' }}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary">Closed</Typography>
                            <Typography variant="h4" sx={{ color: '#9e9e9e' }}>{dashboard.closed_tickets}</Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Tickets Management Section */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                    Ticket Management
                </Typography>
                
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                    <Tab label="All Tickets" />
                    <Tab label="Open" />
                    <Tab label="In Progress" />
                    <Tab label="Resolved" />
                    <Tab label="Closed" />
                    <Tab label="Escalated" />
                </Tabs>

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
                                    <TableCell><strong>User</strong></TableCell>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                    <TableCell><strong>Priority</strong></TableCell>
                                    <TableCell><strong>Created</strong></TableCell>
                                    <TableCell><strong>Due Date</strong></TableCell>
                                    <TableCell><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTickets().length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            <Typography sx={{ py: 3 }} color="textSecondary">
                                                No tickets found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickets().map((ticket) => (
                                        <TableRow key={ticket.id} hover>
                                            <TableCell>
                                                <strong>{ticket.ticket_number}</strong>
                                            </TableCell>
                                            <TableCell>{ticket.title}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={ticket.user?.full_name || 'Unknown'} 
                                                    size="small" 
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={ticket.category} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    icon={getStatusIcon(ticket.status)}
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
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Tooltip title="Update Status">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleOpenStatusDialog(ticket)}
                                                            sx={{ color: '#2196f3' }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="View Comments">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleOpenCommentsDialog(ticket)}
                                                            sx={{ color: '#4caf50' }}
                                                        >
                                                            <CommentIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
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
                    <Typography variant="h5">
                        Support Agents
                    </Typography>
                </Box>
                
                {loadingAgents ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell><strong>Agent Name</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>Agent Number</strong></TableCell>
                                    <TableCell><strong>Assigned Tickets</strong></TableCell>
                                    <TableCell><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {agents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Typography sx={{ py: 3 }} color="textSecondary">
                                                No agents found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    agents.map((agent) => (
                                        <TableRow key={agent.id} hover>
                                            <TableCell>
                                                <strong>{agent.full_name}</strong>
                                            </TableCell>
                                            <TableCell>{agent.email}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={agent.agent_number || 'N/A'} 
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={agent.assigned_tickets_count || 0} 
                                                    size="small"
                                                    sx={{ 
                                                        backgroundColor: (agent.assigned_tickets_count || 0) > 10 ? '#f44336' : 
                                                                       (agent.assigned_tickets_count || 0) > 5 ? '#ff9800' : '#4caf50',
                                                        color: 'white'
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="View Assigned Tickets">
                                                    <IconButton size="small" sx={{ color: '#1976d2' }}>
                                                        <AssignmentTurnedInIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Update Status Dialog */}
            <Dialog open={statusDialogOpen} onClose={() => !updatingStatus && setStatusDialogOpen(false)}>
                <DialogTitle>Update Ticket Status</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                            Ticket: <strong>{selectedTicket?.ticket_number}</strong> - {selectedTicket?.title}
                        </Typography>
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={newStatus}
                                label="Status"
                                onChange={(e) => setNewStatus(e.target.value)}
                            >
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
                    <Button onClick={() => setStatusDialogOpen(false)} disabled={updatingStatus}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleUpdateStatus} 
                        variant="contained" 
                        disabled={updatingStatus || newStatus === selectedTicket?.status}
                    >
                        {updatingStatus ? <CircularProgress size={24} /> : 'Update'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Comments Dialog */}
            <Dialog 
                open={commentsDialogOpen} 
                onClose={() => setCommentsDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box>
                        <Typography variant="h6">
                            Ticket #{selectedTicket?.ticket_number}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {selectedTicket?.title}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            <Chip 
                                label={selectedTicket?.status} 
                                size="small"
                                sx={{ backgroundColor: getStatusColor(selectedTicket?.status || ''), color: 'white' }}
                            />
                            <Chip 
                                label={selectedTicket?.priority} 
                                size="small"
                                sx={{ ml: 1, backgroundColor: getPriorityColor(selectedTicket?.priority || ''), color: 'white' }}
                            />
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                        Comments
                    </Typography>
                    
                    {loadingComments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <List>
                            {comments.length === 0 ? (
                                <Typography color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                                    No comments yet
                                </Typography>
                            ) : (
                                comments.map((comment) => (
                                    <ListItem key={comment.id} alignItems="flex-start">
                                        <ListItemAvatar>
                                            <Avatar>
                                                <CommentIcon />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" color="textSecondary">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </Typography>
                                            }
                                            secondary={comment.message}
                                        />
                                    </ListItem>
                                ))
                            )}
                        </List>
                    )}
                    
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            label="Add a comment"
                            fullWidth
                            multiline
                            rows={3}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type your message here..."
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleAddComment}
                            sx={{ mt: 1 }}
                            disabled={!newComment.trim()}
                        >
                            Post Comment
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCommentsDialogOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default AdminDashboard;