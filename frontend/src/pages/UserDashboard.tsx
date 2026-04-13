import React, { useState, useEffect, useRef } from 'react';
import { getUserTickets, Ticket } from '../services/api';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';

const UserDashboard: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const isMounted = useRef<boolean>(true);

    useEffect(() => {
        // Cleanup function to prevent state updates if component unmounts
        return () => {
            isMounted.current = false;
        };
    }, []);

    const loadTickets = async (): Promise<void> => {
        try {
            const response = await getUserTickets();
            // Only update state if component is still mounted
            if (isMounted.current) {
                setTickets(response.data);
                setLoading(false);
            }
        } catch (error) {
            if (isMounted.current) {
                console.error('Error loading tickets:', error);
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography>Loading tickets...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>My Tickets</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Ticket #</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Due Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                                <TableCell>{ticket.ticket_number}</TableCell>
                                <TableCell>{ticket.title}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={ticket.status} 
                                        size="small"
                                        sx={{ backgroundColor: getStatusColor(ticket.status), color: 'white' }}
                                    />
                                </TableCell>
                                <TableCell>{ticket.priority}</TableCell>
                                <TableCell>{new Date(ticket.due_date).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default UserDashboard;