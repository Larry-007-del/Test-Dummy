import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import App from './App';

function Root() {
  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
}

export default Root;
