import React from 'react';
import { Users, UserCheck, CheckCircle, ShieldCheck, UserPlus, Award, BookOpen, FileText } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="admin-dashboard-container">
      
      {/* Header */}
      <div className="admin-dash-header">
        <h2>Admin Dashboard</h2>
        <p>Welcome back! Here is a complete platform overview and course analytics.</p>
      </div>

      {/* Stats Cards Grid in your requested sequence */}
      <div className="admin-dash-grid">
        
        {/* 1. Total Users */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box blue">
            <Users size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Total Users</span>
            <h3 className="admin-stat-value">1,245</h3>
          </div>
        </div>

        {/* 2. Total Instructors */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box cyan">
            <UserCheck size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Total Instructors</span>
            <h3 className="admin-stat-value">48</h3>
            <span className="admin-stat-desc text-cyan">Active creators</span>
          </div>
        </div>

        {/* 3. Active Courses */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box green">
            <CheckCircle size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Active Courses</span>
            <h3 className="admin-stat-value">28</h3>
            <span className="admin-stat-desc text-green">Published</span>
          </div>
        </div>

        {/* 4. Verified Certs */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box purple">
            <ShieldCheck size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Verified Certs</span>
            <h3 className="admin-stat-value">312</h3>
            <span className="admin-stat-desc text-purple">Secure records</span>
          </div>
        </div>

        {/* 5. Pending Users */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box orange">
            <UserPlus size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Pending Users</span>
            <h3 className="admin-stat-value">12</h3>
            <span className="admin-stat-desc text-orange">Awaiting approval</span>
          </div>
        </div>

        {/* 6. Total Skills */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box teal">
            <Award size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Total Skills</span>
            <h3 className="admin-stat-value">64</h3>
            <span className="admin-stat-desc text-teal">Catalog categories</span>
          </div>
        </div>

        {/* 7. Pending Courses */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box yellow">
            <BookOpen size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Pending Courses</span>
            <h3 className="admin-stat-value">4</h3>
            <span className="admin-stat-desc text-yellow">Requires review</span>
          </div>
        </div>

        {/* 8. Pending Certs */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box pink">
            <FileText size={20} />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Pending Certs</span>
            <h3 className="admin-stat-value">9</h3>
            <span className="admin-stat-desc text-pink">Verification queue</span>
          </div>
        </div>

      </div>

      {/* Circular Chart Section */}
      <div className="admin-chart-section-card">
        <h3 className="admin-chart-section-title">Course Difficulty Distribution</h3>
        
        <div className="admin-chart-content-wrapper">
          
          <div className="admin-circular-chart">
            <div className="admin-chart-inner-circle">
              <span className="admin-chart-center-val">100%</span>
              <span className="admin-chart-center-label">Levels</span>
            </div>
          </div>

          <div className="admin-chart-legend">
            <div className="admin-legend-item">
              <span className="admin-legend-dot beginner"></span>
              <span className="admin-legend-text">Beginner Level</span>
              <span className="admin-legend-percentage">50%</span>
            </div>

            <div className="admin-legend-item">
              <span className="admin-legend-dot intermediate"></span>
              <span className="admin-legend-text">Intermediate Level</span>
              <span className="admin-legend-percentage">30%</span>
            </div>

            <div className="admin-legend-item">
              <span className="admin-legend-dot expert"></span>
              <span className="admin-legend-text">Expert Level</span>
              <span className="admin-legend-percentage">20%</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Dashboard;