import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Zap, BookMarked,
  BarChart2, ClipboardCheck, Users2, Bell,
  User, Upload, LogOut, ChevronLeft, ChevronRight,
  Star, Database
} from 'lucide-react';
import './ParticipantNav.css';

const navItems = [
  { to: '/participant/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/participant/skillhub', icon: Zap, label: 'Skill Hub' },
  { to: '/participant/my-courses', icon: BookMarked, label: 'My Courses' },
  { to: '/participant/track', icon: BarChart2, label: 'Track Progress' },
  { to: '/participant/exam', icon: ClipboardCheck, label: 'Exams' },
  { to: '/participant/peer-review', icon: Star, label: 'Peer Review' },
  { to: '/participant/contribution', icon: Upload, label: 'Contribution' },
  { to: '/participant/notifications', icon: Bell, label: 'Notifications' },
  { to: '/participant/profile', icon: User, label: 'Profile' },
];

const ParticipantNav = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('participantId');
    navigate('/login');
  };

  return (
    <aside className={`participant-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Zap size={18} />
        </div>
        {!collapsed && <span className="logo-text">SkillChain</span>}
      </div>

      {!collapsed && (
        <div className="sidebar-role-badge participant-badge">
          <span>Participant Portal</span>
        </div>
      )}

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? label : ''}
          >
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};

export default ParticipantNav;