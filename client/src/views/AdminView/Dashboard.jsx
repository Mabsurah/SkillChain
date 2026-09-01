import React, { useState, useEffect } from 'react';
import { Users, UserCheck, CheckCircle, ShieldCheck, UserPlus, Award, BookOpen, FileText } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  // State for storing database stats
  const [stats, setStats] = useState({
    totalUsers: 0, totalInstructors: 0, activeCourses: 0, verifiedCerts: 0,
    pendingUsers: 0, totalSkills: 0, pendingCourses: 0, pendingCerts: 0,
    beginnerCourses: 0, intermediateCourses: 0, expertCourses: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real data from Oracle Database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/dashboard-stats');
        const data = await response.json();
        
        setStats({
          totalUsers: data.TOTAL_USERS || 0,
          totalInstructors: data.TOTAL_INSTRUCTORS || 0,
          activeCourses: data.ACTIVE_COURSES || 0,
          verifiedCerts: data.VERIFIED_CERTS || 0,
          pendingUsers: data.PENDING_USERS || 0,
          totalSkills: data.TOTAL_SKILLS || 0,
          pendingCourses: data.PENDING_COURSES || 0,
          pendingCerts: data.PENDING_CERTS || 0,
          beginnerCourses: data.BEGINNER_COURSES || 0,
          intermediateCourses: data.INTERMEDIATE_COURSES || 0,
          expertCourses: data.EXPERT_COURSES || 0
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Calculate percentages for the circular chart dynamically
  const totalLevelCourses = stats.beginnerCourses + stats.intermediateCourses + stats.expertCourses;
  const begPct = totalLevelCourses ? Math.round((stats.beginnerCourses / totalLevelCourses) * 100) : 0;
  const intPct = totalLevelCourses ? Math.round((stats.intermediateCourses / totalLevelCourses) * 100) : 0;
  const expPct = totalLevelCourses ? Math.round((stats.expertCourses / totalLevelCourses) * 100) : 0;

  // Generate dynamic pie chart background
  const chartStyle = {
    background: `conic-gradient(
      #10b981 0% ${begPct}%, 
      #3b82f6 ${begPct}% ${begPct + intPct}%, 
      #8b5cf6 ${begPct + intPct}% 100%
    )`
  };

  if (isLoading) {
    return (
      <div className="admin-dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#fff', fontSize: '1.2rem' }}>Loading real-time stats from Oracle DB...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      
      {/* Header */}
      <div className="admin-dash-header">
        <h2>Admin Dashboard</h2>
        <p>Welcome back! Here is a complete platform overview and course analytics.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="admin-dash-grid">
        
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box blue"><Users size={20} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Total Users</span>
            <h3 className="admin-stat-value">{stats.totalUsers}</h3>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box cyan"><UserCheck size={20} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Total Instructors</span>
            <h3 className="admin-stat-value">{stats.totalInstructors}</h3>
            <span className="admin-stat-desc text-cyan">Active creators</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box green"><CheckCircle size={20} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Active Courses</span>
            <h3 className="admin-stat-value">{stats.activeCourses}</h3>
            <span className="admin-stat-desc text-green">Published</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box purple"><ShieldCheck size={20} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Verified Certs</span>
            <h3 className="admin-stat-value">{stats.verifiedCerts}</h3>
            <span className="admin-stat-desc text-purple">Secure records</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box orange"><UserPlus size={20} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Pending Users</span>
            <h3 className="admin-stat-value">{stats.pendingUsers}</h3>
            <span className="admin-stat-desc text-orange">Awaiting approval</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box teal"><Award size={20} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Total Skills</span>
            <h3 className="admin-stat-value">{stats.totalSkills}</h3>
            <span className="admin-stat-desc text-teal">Catalog categories</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box yellow"><BookOpen size={20} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Pending Courses</span>
            <h3 className="admin-stat-value">{stats.pendingCourses}</h3>
            <span className="admin-stat-desc text-yellow">Requires review</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box pink"><FileText size={20} /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-title">Pending Certs</span>
            <h3 className="admin-stat-value">{stats.pendingCerts}</h3>
            <span className="admin-stat-desc text-pink">Verification queue</span>
          </div>
        </div>

      </div>

      {/* Circular Chart Section */}
      <div className="admin-chart-section-card">
        <h3 className="admin-chart-section-title">Course Difficulty Distribution</h3>
        
        <div className="admin-chart-content-wrapper">
          
          <div className="admin-circular-chart" style={chartStyle}>
            <div className="admin-chart-inner-circle">
              <span className="admin-chart-center-val">{totalLevelCourses}</span>
              <span className="admin-chart-center-label">Total Courses</span>
            </div>
          </div>

          <div className="admin-chart-legend">
            <div className="admin-legend-item">
              <span className="admin-legend-dot beginner"></span>
              <span className="admin-legend-text">Beginner Level</span>
              <span className="admin-legend-percentage">{begPct}%</span>
            </div>

            <div className="admin-legend-item">
              <span className="admin-legend-dot intermediate"></span>
              <span className="admin-legend-text">Intermediate Level</span>
              <span className="admin-legend-percentage">{intPct}%</span>
            </div>

            <div className="admin-legend-item">
              <span className="admin-legend-dot expert"></span>
              <span className="admin-legend-text">Advanced Level</span>
              <span className="admin-legend-percentage">{expPct}%</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Dashboard;