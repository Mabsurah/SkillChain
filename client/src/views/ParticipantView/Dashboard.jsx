import React from 'react';
import { BookOpen, ClipboardCheck, ClipboardList, Star } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  // Mock User Data
  const userName = "Taukir";
  const userCredit = 150;

  return (
    <div className="dashboard-container">
      
      {/* HEADER SECTION */}
      <div className="db-header">
        <div className="db-greeting">
          <h2>Welcome back, {userName}! 👋</h2>
          <p>Continue your learning journey and grow your skills.</p>
        </div>
        
        <div className="db-credit-box">
          <Star size={32} color="#fbbf24" fill="#fbbf24" />
          <div>
            <h3>{userCredit}</h3>
            <p>Credit</p>
          </div>
        </div>
      </div>

      {/* 3-COLUMN STATS GRID */}
      <div className="db-stats-grid">
        
        {/* Card 1: Enrolled Courses */}
        <div className="db-stat-card">
          <div className="db-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <BookOpen size={26} color="#8b5cf6" />
          </div>
          <div className="db-stat-info">
            <h4>Enrolled Courses</h4>
            <div className="db-number">6</div>
            <p className="db-status" style={{ color: '#3b82f6' }}>Keep going!</p>
          </div>
        </div>

        {/* Card 2: Completed Courses */}
        <div className="db-stat-card">
          <div className="db-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <ClipboardCheck size={26} color="#4ade80" />
          </div>
          <div className="db-stat-info">
            <h4>Completed Courses</h4>
            <div className="db-number">3</div>
            <p className="db-status" style={{ color: '#4ade80' }}>Great job!</p>
          </div>
        </div>

        {/* Card 3: Completed Lessons */}
        <div className="db-stat-card">
          <div className="db-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <ClipboardList size={26} color="#c084fc" />
          </div>
          <div className="db-stat-info">
            <h4>Completed Lessons</h4>
            <div className="db-number">28</div>
            <p className="db-status" style={{ color: '#94a3b8' }}>Total lessons</p>
          </div>
        </div>

      </div>

      {/* BOTTOM OVERVIEW CHART SECTION */}
      <div className="db-overview-card">
        <h3>Overall Progress Overview</h3>
        
        <div className="db-overview-content">
          
          {/* Pure CSS Donut Chart */}
          <div className="db-donut-chart">
            <div className="db-donut-inner">
              <h2>65%</h2>
              <p>Overall Progress</p>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="db-legend-section">
            
            <div className="db-legend-item">
              <div className="db-legend-left">
                <div className="db-dot" style={{ backgroundColor: '#4ade80' }}></div>
                <span>Completed</span>
              </div>
              <span className="db-legend-percent" style={{ color: '#4ade80' }}>39%</span>
            </div>

            <div className="db-legend-item">
              <div className="db-legend-left">
                <div className="db-dot" style={{ backgroundColor: '#3b82f6' }}></div>
                <span>In Progress</span>
              </div>
              <span className="db-legend-percent" style={{ color: '#3b82f6' }}>26%</span>
            </div>

            <div className="db-legend-item">
              <div className="db-legend-left">
                <div className="db-dot" style={{ backgroundColor: '#a855f7' }}></div>
                <span>Not Started</span>
              </div>
              <span className="db-legend-percent" style={{ color: '#a855f7' }}>35%</span>
            </div>

            {/* Consistency Badge */}
            <div className="db-consistency-box">
              <div className="db-consistency-icon">
                <Star size={20} fill="currentColor" />
              </div>
              <div className="db-consistency-text">
                <p style={{ color: '#e2e8f0', marginBottom: '4px' }}>Consistency is the key to success.</p>
                <p style={{ color: '#94a3b8' }}>Keep learning, keep growing!</p>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;