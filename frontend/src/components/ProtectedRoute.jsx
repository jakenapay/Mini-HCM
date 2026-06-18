import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Redirects to /login if the user is not authenticated.
// If adminOnly is true, also redirects non-admins to /dashboard.
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
}
