import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Dashboard from './pages/Dashboard';
import BotConfiguration from './pages/BotConfiguration';
import TradeHistory from './pages/TradeHistory';
import AccountSettings from './pages/AccountSettings';
import Documentation from './pages/Documentation';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  return session ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes with dashboard layout */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="bots" element={<BotConfiguration />} />
              <Route path="bots/new" element={<BotConfiguration isNew />} />
              <Route path="bots/:id" element={<BotConfiguration />} />
              <Route path="trades" element={<TradeHistory />} />
              <Route path="settings" element={<AccountSettings />} />
              <Route path="docs" element={<Documentation />} />
            </Route>
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </SupabaseProvider>
  );
}

export default App;