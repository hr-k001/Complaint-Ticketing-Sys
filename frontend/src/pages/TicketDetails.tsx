import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTicketByNumber, getTicketComments, addComment, updateTicketStatus } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
// Remove Alert import since it's not used
// import Alert from '@mui/material/Alert';

// Define types
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
}

interface Comment {
    id: string;
    author_id: string;
    message: string;
    created_at: string;
}

const TicketDetails: React.FC = () => {
    const { ticketNumber } = useParams<{ ticketNumber: string }>();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (ticketNumber) {
            loadTicketDetails();
        }
    }, [ticketNumber]);

    const loadTicketDetails = async (): Promise<void> => {
        try {
            const [ticketRes, commentsRes] = await Promise.all([
                getTicketByNumber(ticketNumber!),
                getTicketComments(ticketNumber!)
            ]);
            setTicket(ticketRes.data);
            setComments(commentsRes.data);
        } catch (error) {
            console.error('Error loading ticket:', error);
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async (): Promise<void> => {
        if (!newComment.trim() || !ticket) return;
        try {
            await addComment(ticket.id, newComment);
            setNewComment('');
            loadTicketDetails();
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const handleStatusUpdate = async (newStatus: string): Promise<void> => {
        if (!ticket) return;
        try {
            await updateTicketStatus(ticket.id, newStatus);
            loadTicketDetails();
        } catch (error) {
            console.error('Error updating status:', error);
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

    if (loading) return <Typography>Loading...</Typography>;
    if (!ticket) return <Typography>Ticket not found</Typography>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                        <Typography variant="h5">{ticket.title}</Typography>
                        <Typography color="textSecondary" gutterBottom>
                            Ticket #{ticket.ticket_number}
                        </Typography>
                    </Box>
                    <Chip 
                        label={ticket.status} 
                        sx={{ backgroundColor: getStatusColor(ticket.status), color: 'white', fontSize: '1rem', p: 2 }}
                    />
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mb={2}>
                    <Typography><strong>Priority:</strong> {ticket.priority}</Typography>
                    <Typography><strong>Category:</strong> {ticket.category}</Typography>
                    <Typography><strong>Created:</strong> {new Date(ticket.created_at).toLocaleString()}</Typography>
                    <Typography><strong>Due Date:</strong> {new Date(ticket.due_date).toLocaleString()}</Typography>
                    <Typography><strong>Escalated:</strong> {ticket.is_escalated ? 'Yes' : 'No'}</Typography>
                </Box>
                
                <Typography variant="h6" gutterBottom>Description</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography>{ticket.description}</Typography>
                </Paper>
                
                {(user?.role === 'agent' || user?.role === 'admin') && (
                    <Box mt={2}>
                        <Typography variant="h6" gutterBottom>Update Status</Typography>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={ticket.status}
                                label="Status"
                                onChange={(e) => handleStatusUpdate(e.target.value)}
                            >
                                <MenuItem value="Open">Open</MenuItem>
                                <MenuItem value="In Progress">In Progress</MenuItem>
                                <MenuItem value="Resolved">Resolved</MenuItem>
                                <MenuItem value="Closed">Closed</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                )}
            </Paper>
            
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Comments</Typography>
                
                <Box display="flex" gap={1} mb={3}>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleAddComment} sx={{ height: 56 }}>
                        Post
                    </Button>
                </Box>
                
                {comments.length === 0 ? (
                    <Typography color="textSecondary">No comments yet.</Typography>
                ) : (
                    comments.map((comment) => (
                        <Paper key={comment.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" color="primary">
                                User {comment.author_id}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {new Date(comment.created_at).toLocaleString()}
                            </Typography>
                            <Typography sx={{ mt: 1 }}>{comment.message}</Typography>
                        </Paper>
                    ))
                )}
            </Paper>
        </Container>
    );
};

export default TicketDetails;