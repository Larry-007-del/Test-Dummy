import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login form when not authenticated', () => {
  render(<App />);
  expect(screen.getByText(/login/i)).toBeInTheDocument();
});
