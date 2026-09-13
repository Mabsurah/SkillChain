import React, { useState, useEffect } from 'react';
import { BookOpen, ClipboardCheck, ClipboardList, Star, TrendingUp, Award, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || localStorage.getItem('participantId') || 'P001';

  const [userData, setUserData] = useState({
    userName: user?.name ? user.name.split(' ')[0] : "Learner",
    userCredit: user?.credit || 500,
    enrolledCoursesCount: 0,
    completedCoursesCount: 0,
    completedLessonsCount: 0,
    overallProgress: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const [profRes, enrollRes, progRes] = await Promise.all([
          api.getParticipantProfile(activePid),
          api.getEnrollments(activePid),
          api.getProgress(activePid)
        ]);

        const p = profRes?.participant || {};
        const enrollments = enrollRes?.enrollments || [];
        const progressList = progRes?.progress || [];

        let totalCompletedLessons = 0;
        let totalCompletedCourses = 0;
        let totalProgressSum = 0;

        enrollments.forEach((enrollment) => {
          const courseId = enrollment.courseId || enrollment.course_id;
          const progItem = progressList.find(pr => String(pr.courseId || pr.course_id).toUpperCase() === String(courseId).toUpperCase());

          // Check participant's real completed lessons list
          const savedKey = `skillchain_completed_lessons_${activePid}_${courseId}`;
          const savedRaw = localStorage.getItem(savedKey);
          let doneLessons = 0;
          let totalLessons = Number(progItem?.totalLessons || progItem?.total_lesson || enrollment.totalClasses || 3);
          let coursePct = 0;

          if (savedRaw) {
            try {
              const arr = JSON.parse(savedRaw);
              if (Array.isArray(arr)) {
                doneLessons = arr.length;
                coursePct = totalLessons > 0 ? Math.min(100, Math.round((doneLessons / totalLessons) * 100)) : 0;
              }
            } catch {}
          }

          if (doneLessons === 0) {
            try {
              localStorage.removeItem(`skillchain_course_progress_${activePid}_${courseId}`);
            } catch {}
          }

          totalCompletedLessons += doneLessons;
          if (coursePct >= 100 || (totalLessons > 0 && doneLessons >= totalLessons)) {
            totalCompletedCourses += 1;
          }
          totalProgressSum += coursePct;
        });

        const overallPct = enrollments.length > 0
          ? Math.min(100, Math.round(totalProgressSum / enrollments.length))
          : 0;

        setUserData({
          userName: p.first_name || p.firstName || (user?.name ? user.name.split(' ')[0] : "Learner"),
          userCredit: p.credit !== undefined ? Number(p.credit) : (user?.credit || 500),
          enrolledCoursesCount: enrollments.length,
          completedCoursesCount: totalCompletedCourses,
          completedLessonsCount: totalCompletedLessons,
          overallProgress: overallPct
        });
      } catch (err) {
        console.warn('Dashboard error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    const handleCreditUpdate = (e) => {
      if (e.detail && e.detail.newCredit !== undefined) {
        setUserData(prev => ({ ...prev, userCredit: Number(e.detail.newCredit) }));
      }
    };
    window.addEventListener('skillchain-credit-updated', handleCreditUpdate);
    return () => window.removeEventListener('skillchain-credit-updated', handleCreditUpdate);
  }, [activePid]);

  const stats = [
    { label: 'Enrolled Courses', value: userData.enrolledCoursesCount, icon: BookOpen, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { label: 'Completed Courses', value: userData.completedCoursesCount, icon: ClipboardCheck, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { label: 'Lessons Done', value: userData.completedLessonsCount, icon: ClipboardList, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    { label: 'Available Credits', value: `${userData.userCredit} Credits`, icon: Star, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  ];

  return (
    <div className="page-container participant-dash">
      <div className="page-header">
        <h2>Welcome back, {userData.userName}! 👋</h2>
        <p>Continue your learning journey and grow your skills</p>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          <div className="pd-stats-grid">
            {stats.map((stat) => (
              <div className="pd-stat-card" key={stat.label}>
                <div className="pd-stat-icon" style={{ background: stat.bg, borderColor: stat.color + '40' }}>
                  <stat.icon size={22} color={stat.color} />
                </div>
                <div className="pd-stat-info">
                  <span className="pd-stat-value">{stat.value}</span>
                  <span className="pd-stat-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pd-bottom-grid">
            <div className="card pd-progress-card">
              <div className="card-header-flex">
                <h3 className="card-title">Overall Progress</h3>
                <TrendingUp size={18} color="var(--accent-light)" />
              </div>
              <div className="pd-progress-content">
                <div className="pd-donut">
                  <svg viewBox="0 0 100 100" className="pd-donut-svg">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-input)" strokeWidth="10" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#gradient)" strokeWidth="10"
                      strokeDasharray={`${userData.overallProgress * 2.64} ${100 * 2.64}`} strokeLinecap="round"
                      transform="rotate(-90 50 50)" />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="pd-donut-center">
                    <span className="pd-donut-value">{userData.overallProgress}%</span>
                    <span className="pd-donut-label">Complete</span>
                  </div>
                </div>
                <div className="pd-legend">
                  <div className="pd-legend-item">
                    <span className="pd-dot" style={{ background: '#10b981' }}></span>
                    <span>Completed</span>
                    <span className="pd-legend-val" style={{ color: '#10b981' }}>{userData.overallProgress}%</span>
                  </div>
                  <div className="pd-legend-item">
                    <span className="pd-dot" style={{ background: '#64748b' }}></span>
                    <span>Not Completed</span>
                    <span className="pd-legend-val" style={{ color: '#94a3b8' }}>{100 - userData.overallProgress}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card pd-motto-card">
              <div className="pd-motto-icon">
                <Award size={24} color="var(--orange)" />
              </div>
              <h3 className="card-title">Platform Motto</h3>
              <p className="pd-motto-text">"Learn by Contributing, Teach by Sharing."</p>
              <div className="pd-motto-divider"></div>
              <div className="pd-quick-tips">
                <div className="pd-tip">
                  <Zap size={14} color="var(--orange)" />
                  <span>Complete courses to earn credits</span>
                </div>
                <div className="pd-tip">
                  <Star size={14} color="var(--accent-light)" />
                  <span>Upload content to help others learn</span>
                </div>
                <div className="pd-tip">
                  <TrendingUp size={14} color="var(--green)" />
                  <span>Track your progress in real-time</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
