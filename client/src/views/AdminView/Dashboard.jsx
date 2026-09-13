import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, CheckCircle, ShieldCheck, UserPlus,
  Award, BookOpen, FileText, TrendingUp, Zap
} from 'lucide-react';
import { api } from '../../services/api';
import './Dashboard.css';

const statCards = (stats) => [
  { label: 'Total Participants', value: stats.totalParticipants, icon: Users, color: 'blue', desc: 'Registered learners' },
  { label: 'Active Instructors', value: stats.activeInstructors, icon: UserCheck, color: 'cyan', desc: 'Content creators' },
  { label: 'Active Courses', value: stats.activeCourses, icon: BookOpen, color: 'green', desc: 'Published courses' },
  { label: 'Verified Certs', value: stats.verifiedCerts, icon: ShieldCheck, color: 'purple', desc: 'Approved records' },
  { label: 'Pending Users', value: stats.pendingUsers, icon: UserPlus, color: 'orange', desc: 'Awaiting approval' },
  { label: 'Total Skills', value: stats.totalSkills, icon: Zap, color: 'teal', desc: 'Skill categories' },
  { label: 'Pending Courses', value: stats.pendingCourses, icon: TrendingUp, color: 'yellow', desc: 'Needs review' },
  { label: 'Pending Certs', value: stats.pendingCerts, icon: FileText, color: 'pink', desc: 'Verification queue' },
];

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalParticipants: 0,
    activeInstructors: 0,
    activeCourses: 0,
    verifiedCerts: 0,
    pendingUsers: 0,
    totalSkills: 0,
    pendingCourses: 0,
    pendingCerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [participantsRes, coursesRes, pendingCoursesRes, certsRes, skillsRes] = await Promise.all([
          api.getParticipants(),
          api.getCourses(),
          api.getCourses({ status: 'Pending' }),
          api.getCertificates(),
          api.getSkills(),
        ]);

        const participants = participantsRes.participants || [];
        const courses = coursesRes.courses || [];
        const pendingCoursesList = pendingCoursesRes.courses || [];
        const certs = certsRes.certificates || [];
        const skills = skillsRes.skills || [];

        setStats({
          totalParticipants: participants.length,
          activeInstructors: participants.filter(p => ['accepted', 'active', 'approved', 'expert'].includes((p.status || p.STATUS || '').toLowerCase())).length,
          activeCourses: courses.length,
          verifiedCerts: certs.filter(c => (c.status || c.STATUS) === 'Accepted').length,
          pendingUsers: participants.filter(p => (p.status || p.STATUS || '').toLowerCase() === 'pending').length,
          totalSkills: skills.length,
          pendingCourses: pendingCoursesList.length,
          pendingCerts: certs.filter(c => (c.status || c.STATUS) === 'Pending').length,
        });
      } catch (err) {
        setStats({
          totalParticipants: 5,
          activeInstructors: 3,
          activeCourses: 5,
          verifiedCerts: 3,
          pendingUsers: 1,
          totalSkills: 5,
          pendingCourses: 0,
          pendingCerts: 1,
        });
      } finally {
        setLoading(false);
      }
    };
    loadStats();

    window.addEventListener('skillchain-catalog-updated', loadStats);
    window.addEventListener('skillchain-course-approved', loadStats);

    return () => {
      window.removeEventListener('skillchain-catalog-updated', loadStats);
      window.removeEventListener('skillchain-course-approved', loadStats);
    };
  }, []);

  const cards = statCards(stats);

  return (
    <div className="page-container admin-dash-page">
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p>Platform overview — users, courses, certifications and activity</p>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          <div className="admin-stats-grid">
            {cards.map((card) => (
              <div className="admin-stat-card" key={card.label}>
                <div className={`stat-icon-wrap icon-${card.color}`}>
                  <card.icon size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">{card.label}</span>
                  <span className="stat-value">{card.value}</span>
                  <span className="stat-desc">{card.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-bottom-grid">
            <div className="card admin-chart-card">
              <h3 className="card-title">Course Level Distribution</h3>
              <div className="donut-wrapper">
                <div className="donut-chart">
                  <div className="donut-inner">
                    <span className="donut-value">100%</span>
                    <span className="donut-label">Levels</span>
                  </div>
                </div>
                <div className="donut-legend">
                  <div className="legend-row">
                    <span className="legend-dot" style={{ background: '#10b981' }}></span>
                    <span>Beginner</span>
                    <span className="legend-pct" style={{ color: '#10b981' }}>50%</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
                    <span>Intermediate</span>
                    <span className="legend-pct" style={{ color: '#3b82f6' }}>30%</span>
                  </div>
                  <div className="legend-row">
                    <span className="legend-dot" style={{ background: '#8b5cf6' }}></span>
                    <span>Advanced</span>
                    <span className="legend-pct" style={{ color: '#8b5cf6' }}>20%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card admin-info-card">
              <h3 className="card-title">Quick Stats</h3>
              <div className="quick-stats-list">
                <div className="quick-stat-row">
                  <span>Approval Rate</span>
                  <div className="quick-stat-right">
                    <div className="progress-bar-wrap" style={{ width: 120 }}>
                      <div className="progress-bar-fill" style={{ width: '80%', background: 'linear-gradient(90deg,#10b981,#34d399)' }}></div>
                    </div>
                    <span style={{ color: 'var(--green)' }}>80%</span>
                  </div>
                </div>
                <div className="quick-stat-row">
                  <span>Certificate Verify Rate</span>
                  <div className="quick-stat-right">
                    <div className="progress-bar-wrap" style={{ width: 120 }}>
                      <div className="progress-bar-fill" style={{ width: '60%', background: 'linear-gradient(90deg,var(--accent),var(--accent-light))' }}></div>
                    </div>
                    <span style={{ color: 'var(--accent-light)' }}>60%</span>
                  </div>
                </div>
                <div className="quick-stat-row">
                  <span>Active User Rate</span>
                  <div className="quick-stat-right">
                    <div className="progress-bar-wrap" style={{ width: 120 }}>
                      <div className="progress-bar-fill" style={{ width: '70%', background: 'linear-gradient(90deg,var(--cyan),#38bdf8)' }}></div>
                    </div>
                    <span style={{ color: 'var(--cyan)' }}>70%</span>
                  </div>
                </div>
              </div>

              <div className="admin-motto-box">
                <Award size={20} color="var(--orange)" />
                <div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>Platform Motto</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>"Learn by Contributing, Teach by Sharing."</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;