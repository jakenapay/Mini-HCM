import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { profile, logout } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <nav className="navbar">
      <div className="navbar-brand">Mini HCM</div>
      <div className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>
        <NavLink to="/time-tracking" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Time Tracking
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Admin
          </NavLink>
        )}
      </div>
      <div className="navbar-user">
        <span className="user-name">{profile?.name}</span>
        {isAdmin && <span className="badge-admin">Admin</span>}
        <button className="btn-logout" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
