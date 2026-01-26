# Attendance System Frontend

A React + Material-UI frontend for the Attendance System, providing an interactive dashboard for managing lectures, students, and attendance tracking.

## Features

- **Login Page**: Secure authentication with session-based login
- **Dashboard**: Overview of lecturers, students, courses, and attendance statistics
- **Sidebar Navigation**: Easy navigation between different sections
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Login Credentials

- **Username**: admin
- **Password**: 123

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/          # Page components (Login, Dashboard)
│   ├── services/       # API services and utilities
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # App entry point
│   └── index.css       # Global styles
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
└── package.json        # Project dependencies
```

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist` folder.

## API Integration

The frontend is configured to connect to the backend at:
```
https://test-dummy-3tx8.onrender.com
```

All API calls use session-based authentication (cookies).

## Deployment

The built frontend can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

For Render hosting alongside your Django backend, update the API base URL in `src/services/api.js`.
