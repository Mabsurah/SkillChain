import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Link2, LayoutDashboard, MessageSquareText, 
  Monitor, ShieldCheck, Share2, ChevronRight, LogOut, 
  CheckSquare 
} from 'lucide-react'; 
import './AdminNav.css'; 

const AdminNav = () => {
  const location = useLocation(); 
  const navigate = useNavigate(); 

  const handleLogout = () => {
    localStorage.removeItem('userRole'); 
    navigate('/login'); 
  };

  const menuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Approve Course', path: '/admin/approve-course', icon: CheckSquare }, 
    { name: 'Report Check', path: '/admin/feedback', icon: MessageSquareText },
    { name: 'Monitor', path: '/admin/monitor', icon: Monitor },
    { name: 'Verify Certificate', path: '/admin/verify-cert', icon: ShieldCheck },
    
    // NEW: Added matchPaths to tell the sidebar to highlight SkillHub for both of these URLs
    { 
      name: 'SkillHub', 
      path: '/admin/skillhub', 
      icon: Share2, 
      matchPaths: ['/admin/skillhub', '/admin/lesson-list'] 
    },
  ];

  return (
    <div className="admin-sidebar-wrapper">
      
      <div className="admin-sidebar-logo">
        <Link2 size={36} className="admin-logo-icon" strokeWidth={2.5} />
        <h2>SkillChain</h2>
      </div>

      <div className="admin-nav-menu">
        {menuItems.map((item, index) => {
          
          // UPDATED: Check if matchPaths exists. If it does, check all paths in the array.
          // Otherwise, just do the standard check for item.path.
          const isActive = item.matchPaths 
            ? item.matchPaths.some(p => location.pathname.includes(p))
            : location.pathname.includes(item.path);

          return (
            <Link 
              key={index} 
              to={item.path} 
              className={`admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="admin-nav-item-left">
                <item.icon size={22} className="admin-nav-icon" />
                <span>{item.name}</span>
              </div>
              <ChevronRight size={18} className="admin-nav-chevron" />
            </Link>
          );
        })}
      </div>

      <div className="admin-sidebar-footer">
        <button className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={22} />
          <span>Log Out</span>
        </button>
      </div>

    </div>
  );
};

export default AdminNav;