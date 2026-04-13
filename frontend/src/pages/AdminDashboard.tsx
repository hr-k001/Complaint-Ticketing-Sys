import React, { useState, useEffect } from 'react';
import { getAdminDashboard } from '../services/api';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

// Define the shape of the dashboard data
interface DashboardData {
    total_tickets: number;
    open_tickets?: number;
    in_progress_tickets?: number;
    resolved_tickets?: number;
    closed_tickets?: number;
    overdue_tickets?: number;
    total_users?: number;
    total_agents?: number;
    total_admins?: number;
}

const AdminDashboard: React.FC = () => {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await getAdminDashboard();
            setDashboard(response.data);
            setError(null);
        } catch (err) {
            console.error('Error loading admin data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography>Loading...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography color="error">{error}</Typography>
            </Container>
        );
    }

    if (!dashboard) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography>No data available</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Total Tickets</Typography>
                            <Typography variant="h4">{dashboard.total_tickets}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                {dashboard.open_tickets !== undefined && (
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Open Tickets</Typography>
                                <Typography variant="h4">{dashboard.open_tickets}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
                {dashboard.overdue_tickets !== undefined && (
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Overdue Tickets</Typography>
                                <Typography variant="h4" color="error">{dashboard.overdue_tickets}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Container>
    );
};

export default AdminDashboard;