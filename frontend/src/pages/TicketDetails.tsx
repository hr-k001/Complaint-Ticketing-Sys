import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getTicketByNumber, getTicketComments, addComment } from '../services/api';
import { AxiosError } from 'axios';
import {
    Container,
    Typography,
    Paper,
    Box,
    Chip,
    CircularProgress,
    Alert,
    Button,
    TextField,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Card,
    CardContent,
} from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';

interface Ticket {
    id: string;
    ticket_number: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    created_at: string;
    due_date: string;
    is_escalated: boolean;
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

const TicketDetails: React.FC = () => {
    const { ticketNumber } = useParams<{ ticketNumber: string }>();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingComments, setLoadingComments] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [newComment, setNewComment] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    const loadTicketDetails = useCallback(async () => {
        if (!ticketNumber) return;
        
        try {
            setLoading(true);
            const response = await getTicketByNumber(ticketNumber);
            setTicket(response.data);
            setError(null);
        } catch (err) {
            console.error('Error loading ticket:', err);
            if (err instanceof AxiosError) {
                setError(err.response?.data?.detail || err.message);
            } else {
                setError('Failed to load ticket details');
            }
        } finally {
            setLoading(false);
        }
    }, [ticketNumber]);

    const loadComments = useCallback(async () => {
        if (!ticket?.id) return;
        
        try {
            setLoadingComments(true);
            const response = await getTicketComments(ticket.id);
            setComments(response.data || []);
        } catch (err) {
            console.error('Error loading comments:', err);
        } finally {
            setLoadingComments(false);
        }
    }, [ticket?.id]);

    useEffect(() => {
        loadTicketDetails();
    }, [loadTicketDetails]);

    useEffect(() => {
        if (ticket) {
            loadComments();
        }
    }, [ticket, loadComments]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !ticket) return;
        
        try {
            setSubmitting(true);
            await addComment(ticket.id, newComment);
            setNewComment('');
            await loadComments();
        } catch (err) {
            console.error('Error adding comment:', err);
            setError('Failed to add comment');
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
                <Button variant="contained" onClick={loadTicketDetails}>
                    Retry
                </Button>
            </Container>
        );
    }

    if (!ticket) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="info">Ticket not found</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Ticket #{ticket.ticket_number}
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        {ticket.title}
                    </Typography>
                </Box>
                <Box>
                    <Chip 
                        label={ticket.status} 
                        sx={{ 
                            backgroundColor: getStatusColor(ticket.status), 
                            color: 'white',
                            fontWeight: 'bold',
                            mr: 1
                        }}
                    />
                    <Chip 
                        label={ticket.priority} 
                        sx={{ 
                            backgroundColor: getPriorityColor(ticket.priority), 
                            color: 'white',
                            fontWeight: 'bold'
                        }}
                    />
                </Box>
            </Box>

            {/* Ticket Details Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CategoryIcon sx={{ mr: 1, color: '#1976d2' }} />
                            <Typography variant="subtitle2" color="textSecondary">Category</Typography>
                        </Box>
                        <Typography variant="body1">{ticket.category}</Typography>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <PersonIcon sx={{ mr: 1, color: '#1976d2' }} />
                            <Typography variant="subtitle2" color="textSecondary">Created By</Typography>
                        </Box>
                        <Typography variant="body1">{ticket.user?.full_name || 'Unknown'}</Typography>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ScheduleIcon sx={{ mr: 1, color: '#1976d2' }} />
                            <Typography variant="subtitle2" color="textSecondary">Created Date</Typography>
                        </Box>
                        <Typography variant="body1">
                            {new Date(ticket.created_at).toLocaleString()}
                        </Typography>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ScheduleIcon sx={{ mr: 1, color: '#f44336' }} />
                            <Typography variant="subtitle2" color="textSecondary">Due Date</Typography>
                        </Box>
                        <Typography variant="body1" sx={{ 
                            color: new Date(ticket.due_date) < new Date() && ticket.status !== 'Resolved' ? '#f44336' : 'inherit'
                        }}>
                            {new Date(ticket.due_date).toLocaleDateString()}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Description */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Description
                </Typography>
                <Typography variant="body1">
                    {ticket.description}
                </Typography>
            </Paper>

            {/* Comments Section */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
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
                                No comments yet. Be the first to add a comment!
                            </Typography>
                        ) : (
                            comments.map((comment) => (
                                <React.Fragment key={comment.id}>
                                    <ListItem alignItems="flex-start">
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
                                    <Divider variant="inset" component="li" />
                                </React.Fragment>
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
                        disabled={!newComment.trim() || submitting}
                    >
                        {submitting ? <CircularProgress size={24} /> : 'Post Comment'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default TicketDetails;