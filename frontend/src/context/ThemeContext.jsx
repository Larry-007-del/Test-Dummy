import { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'

const ThemeContext = createContext()

export function useThemeMode() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('themeMode')
    return saved || 'light'
  })

  useEffect(() => {
    localStorage.setItem('themeMode', mode)
  }, [mode])

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary: { main: '#1976d2' },
                secondary: { main: '#dc004e' },
                background: { default: '#f5f5f5', paper: '#ffffff' },
              }
            : {
                primary: { main: '#90caf9' },
                secondary: { main: '#f48fb1' },
                background: { default: '#121212', paper: '#1e1e1e' },
              }),
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
      }),
    [mode]
  )

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  )
}
