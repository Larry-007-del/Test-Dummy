import { useEffect, useMemo, useState } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Event as EventIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  MenuBook as CoursesIcon,
  Assessment as ReportsIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material'
import { useLocation } from 'react-router-dom'
import SidebarMenuItem from './SidebarMenuItem'
import { useThemeMode } from '../context/ThemeContext'
import api from '../services/api'

const drawerWidth = 260

export default function DashboardLayout({ title, subtitle, children, userLabel = 'admin' }) {
  const theme = useTheme()
  const { mode, toggleTheme } = useThemeMode()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const location = useLocation()
  const [me, setMe] = useState(null)

  useEffect(() => {
    let mounted = true
    async function loadMe() {
      try {
        const res = await api.get('/api/me/')
        if (mounted) setMe(res.data)
      } catch {
        if (mounted) setMe(null)
      }
    }
    loadMe()
    return () => { mounted = false }
  }, [])

  const menuItems = useMemo(() => {
    const items = [
      { text: 'Dashboard', icon: <DashboardIcon />, to: '/dashboard' },
    ]
    
    if (me?.role === 'student') {
      items.unshift({ text: 'Student Portal', icon: <SchoolIcon />, to: '/student-dashboard' })
    }
    if (me?.role === 'lecturer') {
      items.unshift({ text: 'Lecturer Portal', icon: <PeopleIcon />, to: '/lecturer-dashboard' })
    }
    
    // Admin/Staff navigation items
    if (me?.role === 'admin' || me?.is_staff) {
      items.push(
        { text: 'Lecturers', icon: <PeopleIcon />, to: '/lecturers' },
        { text: 'Students', icon: <SchoolIcon />, to: '/students' },
        { text: 'Courses', icon: <CoursesIcon />, to: '/courses' },
        { text: 'Attendance', icon: <Event Icon />, to: '/attendance' },
        { text: 'Reports', icon: <ReportsIcon />, to: '/reports' },
        { text: 'Analytics', icon: <AnalyticsIcon />, to: '/admin/analytics' },
      )
    } else {
      // Regular users see basic pages
      items.push(
        { text: 'Lecturers', icon: <PeopleIcon />, to: '/lecturers' },
        { text: 'Students', icon: <SchoolIcon />, to: '/students' },
        { text: 'Attendance', icon: <EventIcon />, to: '/attendance' },
      )
    }
    
    return items
  }, [me])

  const handleLogout = async () => {
    try {
      await api.post('/api/api/logout/')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
  }

  const displayName = me?.username || userLabel
  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#0f172a', color: '#e2e8f0' }}>
      <Box sx={{ px: 2.5, py: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
          HRM Attend
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Attendance Dashboard
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(148,163,184,0.2)' }} />
      <List sx={{ px: 1, pt: 1 }} component="nav" aria-label="Main navigation">
        {menuItems.map((item) => (
          <SidebarMenuItem
            key={item.text}
            icon={item.icon}
            text={item.text}
            to={item.to}
            selected={location.pathname === item.to}
            dark
          />
        ))}
      </List>
      <Box sx={{ mt: 'auto', px: 2.5, py: 2 }}>
        <Divider sx={{ borderColor: 'rgba(148,163,184,0.2)', mb: 2 }} />
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Ministry of Health
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <AppBar
        position="fixed"
        elevation={0}
        role="banner"
        sx={{
          bgcolor: '#111827',
          zIndex: (appTheme) => appTheme.zIndex.drawer + 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton 
              color="inherit" 
              edge="start" 
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ flexGrow: 1, ml: isMobile ? 1 : 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton 
              onClick={toggleTheme} 
              color="inherit"
              aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
          <IconButton 
            onClick={(event) => setAnchorEl(event.currentTarget)}
            aria-label="User menu"
            aria-controls={open ? 'user-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <Avatar sx={{ bgcolor: '#3b82f6' }}>{displayName.charAt(0).toUpperCase()}</Avatar>
          </IconButton>
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            MenuListProps={{ 'aria-labelledby': 'user-menu-button' }}
          >
            <MenuItem disabled>Signed in as <b>{displayName}</b></MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }} role="menuitem">
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
