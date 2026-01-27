import { useNavigate } from 'react-router-dom'
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material'

export default function SidebarMenuItem({ icon, text, to, selected, dark }) {
  const navigate = useNavigate()
  return (
    <ListItemButton
      selected={selected}
      onClick={() => navigate(to)}
      role="link"
      aria-label={`Navigate to ${text}`}
      aria-current={selected ? 'page' : undefined}
      sx={{
        borderRadius: 1.5,
        my: 0.5,
        mx: 1,
        color: dark ? '#e2e8f0' : 'inherit',
        '& .MuiListItemIcon-root': { color: 'inherit' },
        '&.Mui-selected': {
          backgroundColor: dark ? 'rgba(59,130,246,0.18)' : 'rgba(25,118,210,0.12)',
          color: dark ? '#fff' : 'inherit',
        },
        '&:hover': {
          backgroundColor: dark ? 'rgba(59,130,246,0.12)' : 'rgba(25,118,210,0.08)',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }} aria-hidden="true">{icon}</ListItemIcon>
      <ListItemText primary={text} />
    </ListItemButton>
  )
}
