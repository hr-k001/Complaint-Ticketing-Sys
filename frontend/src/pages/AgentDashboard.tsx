import React, { useState, useEffect } from 'react';
import { getAgentDashboard } from '../services/api';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

const AgentDashboard: React.FC = () => {
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const response = await getAgentDashboard();
            setSummary(response.data);
        } catch (error) {
            console.error('Error loading agent data:', error);
        }
    };

    if (!summary) return <Typography>Loading...</Typography>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>Agent Dashboard</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Total Assigned</Typography>
                            <Typography variant="h4">{summary.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Open Tickets</Typography>
                            <Typography variant="h4" color="warning.main">{summary.open}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default AgentDashboard;