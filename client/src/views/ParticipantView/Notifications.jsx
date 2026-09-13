import React, { useState, useEffect } from 'react';
import { PartyPopper, Bell, Info, CheckCircle2, Award, BookOpen, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Notifications.css';

const Notifications = () => {
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || localStorage.getItem('participantId') || 'P001';

  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications(activePid);
      if (res && res.notifications) {
        setNotificationsList(res.notifications);
      }
    } catch (err) {
      console.warn("Error loading notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activePid]);

  const handleMarkAllRead = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, isUnread: false })));
  };

  const getIcon = (type, tag = '') => {
    const t = (tag || '').toLowerCase();
    if (t.includes('cert')) return Award;
    if (t.includes('enroll')) return BookOpen;
    switch (type) {
      case 'success': return PartyPopper;
      case 'warning': return Bell;
      case 'info': return Info;
      default: return CheckCircle2;
    }
  };

  const filteredList = notificationsList.filter(n => {
    if (activeFilter === 'ALL') return true;
    const tag = (n.tag || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    if (activeFilter === 'ENROLL') return tag.includes('enroll') || msg.includes('enroll');
    if (activeFilter === 'CERT') return tag.includes('cert') || msg.includes('cert');
    if (activeFilter === 'EXAM') return tag.includes('exam') || msg.includes('exam');
    if (activeFilter === 'PROGRESS') return tag.includes('progress') || msg.includes('progress');
    return true;
  });

  const unreadCount = notificationsList.filter(n => n.isUnread).length;

  return (
    <div className="notifications-container">
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="notifications-title" style={{ margin: 0 }}>System Notifications</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '6px' }}>
            Live platform updates from Oracle Database ({notificationsList.length} total, {unreadCount} unread)
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: '#c4b5fd',
              fontSize: '0.88rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <Check size={16} /> Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: 'All Updates' },
          { id: 'ENROLL', label: 'Course Enrollments' },
          { id: 'CERT', label: 'Certificates' },
          { id: 'EXAM', label: 'Exams' },
          { id: 'PROGRESS', label: 'Progress' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              border: activeFilter === tab.id ? '1px solid #8b5cf6' : '1px solid #334155',
              background: activeFilter === tab.id ? 'rgba(139, 92, 246, 0.2)' : '#1e293b',
              color: activeFilter === tab.id ? '#f1f5f9' : '#94a3b8',
              fontSize: '0.88rem',
              cursor: 'pointer',
              fontWeight: activeFilter === tab.id ? 600 : 400,
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Container */}
      <div className="notifications-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : (
          filteredList.map((notif) => {
            const IconComponent = notif.icon || getIcon(notif.type, notif.tag);

            return (
              <div key={notif.id} className={`notification-card ${notif.type}`}>
                
                {/* Left Side: Icon */}
                <div className={`icon-wrapper ${notif.type}`}>
                  <IconComponent size={24} strokeWidth={1.5} />
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
          })
        )}

        {filteredList.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', background: '#0f172a', borderRadius: '12px', border: '1px dashed #334155' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>No notifications found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;