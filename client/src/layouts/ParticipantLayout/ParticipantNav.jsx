import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Link2, Home, User, BookOpen, HandHeart, 
  Share2, MessageCircle, ClipboardList, TrendingUp, Bell, ChevronRight, LogOut 
} from 'lucide-react'; 
import './ParticipantNav.css'; // Connects the sidebar styling!

const ParticipantNav = () => {
  const location = useLocation(); 
  const navigate = useNavigate(); 

  // The Security Logic: Destroy the pass and leave
  const handleLogout = () => {
    localStorage.removeItem('userRole'); // Shreds the VIP pass
    navigate('/login'); // Kicks them back to the login screen
  };

  // ADDED 'relatedPaths' to keep the nav highlighted when inside sub-pages!
  const menuItems = [
    { name: 'Dashboard', path: '/participant/dashboard', icon: Home },
    { name: 'Profile', path: '/participant/profile', icon: User },
    { name: 'My Courses', path: '/participant/my-courses', icon: BookOpen, relatedPaths: ['/participant/lesson-list'] },
    { name: 'Contribution', path: '/participant/contribution', icon: HandHeart, relatedPaths: ['/participant/content-list'] },
    { name: 'SkillHub', path: '/participant/skillhub', icon: Share2 },
    { name: 'Peer Review', path: '/participant/peer-review', icon: MessageCircle, relatedPaths: ['/participant/review-content'] },
    { name: 'Exam', path: '/participant/exam', icon: ClipboardList },
    { name: 'Track Progress', path: '/participant/track', icon: TrendingUp },
    { name: 'Notifications', path: '/participant/notifications', icon: Bell, hasDot: true },
  ];

  return (
    <div className="sidebar-container">
      
      {/* Logo Section */}
      <div className="sidebar-logo">
        <Link2 size={36} className="logo-icon" strokeWidth={2.5} />
        <h2>SkillChain</h2>
      </div>

      {/* Navigation Links */}
      <div className="nav-menu">
        {menuItems.map((item, index) => {
          
          // NEW LOGIC: Checks if current URL is the exact path OR includes any related paths
          const isActive = location.pathname === item.path || 
                           (item.relatedPaths && item.relatedPaths.some(p => location.pathname.includes(p)));

          return (
            <Link 
              key={index} 
              to={item.path} 
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-item-left">
                <div className="notification-wrapper">
                  <item.icon size={22} className="nav-icon" />
                  {item.hasDot && <span className="red-dot"></span>}
                </div>
                <span>{item.name}</span>
              </div>
              <ChevronRight size={18} className="nav-chevron" />
            </Link>
          );
        })}
      </div>

      {/* Logout Footer Section */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={22} className="logout-icon" />
          <span>Log Out</span>
        </button>
      </div>

    </div>
  );
};

export default ParticipantNav;