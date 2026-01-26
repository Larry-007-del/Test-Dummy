import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, Box, Button } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;

function Sidebar() {
  const navigate = useNavigate();
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List aria-label="Sidebar navigation">
          <ListItem button onClick={() => navigate('/')} aria-label="Dashboard">
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
          <ListItem button onClick={() => navigate('/calendar')} aria-label="Calendar">
            <ListItemIcon><CalendarTodayIcon /></ListItemIcon>
            <ListItemText primary="Calendar" />
          </ListItem>
          <ListItem button onClick={() => navigate('/users')} aria-label="Users">
            <ListItemIcon><PeopleIcon /></ListItemIcon>
            <ListItemText primary="Users" />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
}

function TopBar({ onLogout }) {
  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Attendance Dashboard
        </Typography>
        {onLogout && (
          <Button color="inherit" onClick={onLogout}>
            Log out
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

export { Sidebar, TopBar };
