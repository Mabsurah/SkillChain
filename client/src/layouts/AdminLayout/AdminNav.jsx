import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, ShieldCheck, Users,
  Star, LogOut, ChevronLeft, ChevronRight,
  Zap, Database
} from 'lucide-react';
import './AdminNav.css';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/approve-course', icon: BookOpen, label: 'Approve Course' },
  { to: '/admin/verify-cert', icon: ShieldCheck, label: 'Verify Certificate' },
  { to: '/admin/feedback', icon: Star, label: 'Course Reports' },
  { to: '/admin/monitor', icon: Users, label: 'Monitor Users' },
  { to: '/admin/skillhub', icon: Zap, label: 'Skill Hub' },
];

const AdminNav = () => {
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
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Zap size={18} />
        </div>
        {!collapsed && <span className="logo-text">SkillChain</span>}
      </div>

      {!collapsed && (
        <div className="sidebar-role-badge">
          <span>Administrator Panel</span>
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

export default AdminNav;