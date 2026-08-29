import React from 'react';
import { PartyPopper, Bell } from 'lucide-react';
import './Notifications.css'; // Connects our new CSS

const Notifications = () => {
  // Mock Database Array - You will map over your real backend data here!
  const notificationsList = [
    {
      id: 1,
      type: 'success', // Triggers the green styling
      icon: PartyPopper,
      tag: 'Congratulations!',
      message: 'Your contents are approved as a course in this platform. Keep contributing, Champ!',
      time: 'Just now',
      isUnread: true,
    },
    {
      id: 2,
      type: 'warning', // Triggers the orange styling
      icon: Bell,
      tag: 'Attention!',
      message: 'You have achieved 70% marks in the C programming course by Hasan Mahmud. Keep improving!',
      time: '10 minutes ago',
      isUnread: true,
    }
  ];

  return (
    <div className="notifications-container">
      
      {/* Title */}
      <h2 className="notifications-title">Notifications</h2>

      {/* List Container */}
      <div className="notifications-list">
        
        {notificationsList.map((notif) => {
          const IconComponent = notif.icon; // Renders the correct Lucide icon dynamically

          return (
            <div key={notif.id} className={`notification-card ${notif.type}`}>
              
              {/* Left Side: Icon */}
              <div className={`icon-wrapper ${notif.type}`}>
                <IconComponent size={28} strokeWidth={1.5} />
              </div>

              {/* Middle: Content */}
              <div className="notification-content">
                <span className={`tag-badge ${notif.type}`}>
                  {notif.tag}
                </span>
                <p className="notification-message">
                  {notif.message}
                </p>
                <p className="notification-time">
                  {notif.time}
                </p>
              </div>

              {/* Right Side: Glowing Unread Dot */}
              {notif.isUnread && (
                <div className="unread-dot-wrapper">
                  <div className={`unread-dot ${notif.type}`}></div>
                </div>
              )}

            </div>
          );
        })}

      </div>
    </div>
  );
};

export default Notifications;