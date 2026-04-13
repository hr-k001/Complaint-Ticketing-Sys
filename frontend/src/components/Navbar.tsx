import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const getDashboardLink = () => {
        if (user?.role === 'admin') return '/admin';
        if (user?.role === 'agent') return '/agent';
        return '/dashboard';
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
                    Ticket System
                </Typography>
                {user ? (
                    <Box>
                        <Button color="inherit" onClick={() => navigate(getDashboardLink())}>
                            Dashboard
                        </Button>
                        <Button color="inherit" onClick={logout}>
                            Logout ({user.email})
                        </Button>
                    </Box>
                ) : (
                    <Box>
                        <Button color="inherit" onClick={() => navigate('/login')}>
                            Login
                        </Button>
                        <Button color="inherit" onClick={() => navigate('/register')}>
                            Register
                        </Button>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;