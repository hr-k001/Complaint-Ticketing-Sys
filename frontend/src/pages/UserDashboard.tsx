import React, { useState, useEffect } from 'react';
import { 
    getUserTickets, 
    createTicket, 
    getTicketComments, 
    addComment,
    getCurrentUser
} from '../services/api';
import type { Ticket, Comment } from '../services/api';  // Type-only import
import { AxiosError } from 'axios';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    Box,
    Alert,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    IconButton,
    Tabs,
    Tab,
    Card,
    CardContent,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar
} from '@mui/material';
import {
    Add as AddIcon,
    Comment as CommentIcon,
    Refresh as RefreshIcon,
    CheckCircle as ResolvedIcon,
    Schedule as PendingIcon,
    Cancel as ClosedIcon,
    Warning as EscalatedIcon
} from '@mui/icons-material';

// Use Box with flexbox instead of Grid for stats
interface User {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

const UserDashboard: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState<string>('');
    const [commentsDialogOpen, setCommentsDialogOpen] = useState<boolean>(false);
    const [loadingComments, setLoadingComments] = useState<boolean>(false);
    const [tabValue, setTabValue] = useState<number>(0);
    const [user, setUser] = useState<User | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        escalated: 0
    });

    const [newTicket, setNewTicket] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        category: 'General'
    });

    useEffect(() => {
        loadUser();
        loadTickets();
    }, []);

    const loadUser = async () => {
        try {
            const response = await getCurrentUser();
            setUser(response.data);
        } catch (err) {
            console.error('Error loading user:', err);
        }
    };

    const loadTickets = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await getUserTickets();
            const ticketsData = response.data || [];
            setTickets(ticketsData);
            
            // Calculate stats
            setStats({
                total: ticketsData.length,
                open: ticketsData.filter((t: Ticket) => t.status === 'Open').length,
                inProgress: ticketsData.filter((t: Ticket) => t.status === 'In Progress').length,
                resolved: ticketsData.filter((t: Ticket) => t.status === 'Resolved').length,
                escalated: ticketsData.filter((t: Ticket) => t.is_escalated).length
            });
            
        } catch (err: unknown) {
            console.error('Error loading tickets:', err);
            if (err instanceof AxiosError) {
                setError(err.response?.data?.detail || err.message);
            } else {
                setError('Failed to load tickets');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async (ticketId: string) => {
        try {
            setLoadingComments(true);
            const response = await getTicketComments(ticketId);
            setComments(response.data || []);
        } catch (err) {
            console.error('Error loading comments:', err);
            setError('Failed to load comments');
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

    const handleViewComments = async (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setCommentsDialogOpen(true);
        await loadComments(ticket.id);
    };

    const handleCreateTicket = async (): Promise<void> => {
        if (!newTicket.title.trim() || !newTicket.description.trim()) {
            setError('Title and description are required');
            return;
        }

        try {
            setSubmitting(true);
            await createTicket(newTicket);
            setCreateDialogOpen(false);
            setNewTicket({
                title: '',
                description: '',
                priority: 'Medium',
                category: 'General'
            });
            await loadTickets();
        } catch (err: unknown) {
            console.error('Error creating ticket:', err);
            if (err instanceof AxiosError) {
                setError(err.response?.data?.detail || err.message);
            } else {
                setError('Failed to create ticket');
            }
        } finally {
            setSubmitting(false);
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

    const getPriorityColor = (priority?: string): string => {
        const colors: Record<string, string> = {
            'Low': '#4caf50',
            'Medium': '#ff9800',
            'High': '#f44336',
            'Critical': '#9c27b0'
        };
        return colors[priority || 'Low'] || '#9e9e9e';
    };

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'Resolved': return <ResolvedIcon sx={{ color: '#4caf50' }} />;
            case 'Closed': return <ClosedIcon sx={{ color: '#9e9e9e' }} />;
            case 'Escalated': return <EscalatedIcon sx={{ color: '#f44336' }} />;
            default: return <PendingIcon sx={{ color: '#ff9800' }} />;
        }
    };

    const filteredTickets = () => {
        if (tabValue === 0) return tickets;
        if (tabValue === 1) return tickets.filter(t => t.status === 'Open');
        if (tabValue === 2) return tickets.filter(t => t.status === 'In Progress');
        if (tabValue === 3) return tickets.filter(t => t.status === 'Resolved');
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

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Welcome Section */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#1976d2', color: 'white' }}>
                <Typography variant="h5" gutterBottom>
                    Welcome back, {user?.full_name || 'User'}!
                </Typography>
                <Typography variant="body2">
                    Manage your support tickets, track their status, and communicate with support agents.
                </Typography>
            </Paper>

            {/* Stats Cards - Using flexbox instead of Grid */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Card sx={{ flex: '1 1 180px', minWidth: '150px' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">{stats.total}</Typography>
                        <Typography variant="body2" color="textSecondary">Total Tickets</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 180px', minWidth: '150px' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ color: '#ff9800' }}>{stats.open}</Typography>
                        <Typography variant="body2" color="textSecondary">Open</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 180px', minWidth: '150px' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ color: '#2196f3' }}>{stats.inProgress}</Typography>
                        <Typography variant="body2" color="textSecondary">In Progress</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 180px', minWidth: '150px' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ color: '#4caf50' }}>{stats.resolved}</Typography>
                        <Typography variant="body2" color="textSecondary">Resolved</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 180px', minWidth: '150px' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ color: '#f44336' }}>{stats.escalated}</Typography>
                        <Typography variant="body2" color="textSecondary">Escalated</Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Tickets Section */}
            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h5">
                        My Tickets
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            variant="outlined" 
                            startIcon={<RefreshIcon />}
                            onClick={loadTickets}
                        >
                            Refresh
                        </Button>
                        <Button 
                            variant="contained" 
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            New Ticket
                        </Button>
                    </Box>
                </Box>

                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                    <Tab label="All Tickets" />
                    <Tab label="Open" />
                    <Tab label="In Progress" />
                    <Tab label="Resolved" />
                </Tabs>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

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
                                <TableCell><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTickets().length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Typography sx={{ py: 4 }} color="textSecondary">
                                            No tickets found. Create your first ticket!
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets().map((ticket) => (
                                    <TableRow 
                                        key={ticket.id}
                                        sx={{ '&:hover': { backgroundColor: '#fafafa' } }}
                                    >
                                        <TableCell>
                                            <strong>{ticket.ticket_number}</strong>
                                        </TableCell>
                                        <TableCell>{ticket.title}</TableCell>
                                        <TableCell>
                                            <Chip label={ticket.category || 'General'} size="small" variant="outlined" />
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
                                            {ticket.priority && (
                                                <Chip 
                                                    label={ticket.priority} 
                                                    size="small"
                                                    sx={{ 
                                                        backgroundColor: getPriorityColor(ticket.priority), 
                                                        color: 'white',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            )}
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
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleViewComments(ticket)}
                                                title="View Comments"
                                            >
                                                <CommentIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Create Ticket Dialog */}
            <Dialog 
                open={createDialogOpen} 
                onClose={() => !submitting && setCreateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Create New Support Ticket</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Title"
                            fullWidth
                            required
                            value={newTicket.title}
                            onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                            placeholder="Brief summary of your issue"
                        />
                        <TextField
                            label="Description"
                            fullWidth
                            required
                            multiline
                            rows={4}
                            value={newTicket.description}
                            onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                            placeholder="Please provide detailed information about your issue"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={newTicket.priority}
                                label="Priority"
                                onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                            >
                                <MenuItem value="Low">Low - General inquiry</MenuItem>
                                <MenuItem value="Medium">Medium - Minor issue</MenuItem>
                                <MenuItem value="High">High - Major issue</MenuItem>
                                <MenuItem value="Critical">Critical - System down</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={newTicket.category}
                                label="Category"
                                onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                            >
                                <MenuItem value="General">General Inquiry</MenuItem>
                                <MenuItem value="Technical">Technical Issue</MenuItem>
                                <MenuItem value="Billing">Billing Question</MenuItem>
                                <MenuItem value="Account">Account Problem</MenuItem>
                                <MenuItem value="Feature Request">Feature Request</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleCreateTicket} 
                        variant="contained" 
                        disabled={submitting}
                    >
                        {submitting ? <CircularProgress size={24} /> : 'Create Ticket'}
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
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Status: <Chip 
                                label={selectedTicket?.status} 
                                size="small"
                                sx={{ 
                                    backgroundColor: getStatusColor(selectedTicket?.status || ''), 
                                    color: 'white'
                                }}
                            />
                            {' '}Priority: <Chip 
                                label={selectedTicket?.priority} 
                                size="small"
                                sx={{ 
                                    backgroundColor: getPriorityColor(selectedTicket?.priority), 
                                    color: 'white'
                                }}
                            />
                        </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                        Conversation History
                    </Typography>
                    
                    {loadingComments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <List>
                            {comments.length === 0 ? (
                                <Typography color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                                    No comments yet. Be the first to add a comment!
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

export default UserDashboard;