import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TimeTracking from './pages/TimeTracking';
import AdminPanel from './pages/AdminPanel';
import './styles/global.css';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/time-tracking" element={
            <ProtectedRoute>
              <Layout><TimeTracking /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Layout><AdminPanel /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
