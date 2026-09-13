import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Award, Sparkles, CheckCircle, Clock, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './PeerReview.css';

const PeerReview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || 'P001';

  const [reviewTasks, setReviewTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const res = await api.getPeerReviewQueue(activePid);
        const queueList = res?.queue || [];

        setReviewTasks(queueList.map((q, idx) => ({
          id: q.id || q.courseId || `PRC_${idx + 1}`,
          courseId: q.courseId || q.id,
          title: q.title || q.course_title,
          level: q.level || q.course_level || 'Intermediate',
          instructor: q.instructor || q.instructorName || 'Peer Author',
          skillName: q.skillName || 'General',
          completed: q.completedReviews !== undefined ? q.completedReviews : (q.reviewedCount || 0),
          total: q.totalLessons || (q.lessons ? q.lessons.length : 3),
          approvalPct: q.currentApprovalPct || q.approvalPercentage || 0
        })));
      } catch (err) {
        console.warn("Peer review load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [activePid]);

  return (
    <div className="peer-review-container">
      {/* Header */}
      <div className="pr-header-section">
        <div className="pr-header-left">
          <h2>Peer Review System</h2>
          <p>Review community-contributed learning materials in your certified skills, ensure academic quality, and earn +20 reward credits per review.</p>
        </div>

        <div style={{
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#c084fc',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          <Sparkles size={16} color="#f59e0b" />
          <span>Reward: +20 Credits / Review</span>
        </div>
      </div>

      {/* Grid of Courses */}
      <div className="pr-grid">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', gridColumn: '1 / -1' }}>Loading review tasks...</div>
        ) : reviewTasks.length > 0 ? (
          reviewTasks.map((task) => {
            const progressPercentage = Math.round((task.completed / Math.max(1, task.total)) * 100);

            return (
              <div className="pr-card" key={task.id}>
                <h3 className="pr-course-title">{task.title}</h3>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>
                  Instructor: <strong style={{ color: '#c084fc' }}>{task.instructor || 'Peer Author'}</strong>
                </div>

                <div className="pr-progress-info">
                  <span className="pr-progress-label">Community Review status</span>
                  <span className="pr-progress-ratio">
                    {task.completed} / {task.total} Reviews
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="pr-progress-track">
                  <div
                    className="pr-progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>

                <button
                  className="review-now-btn"
                  onClick={() => navigate('/participant/review-content', { state: { courseId: task.courseId, courseTitle: task.title, skillName: task.skillName } })}
                >
                  Review Content (+20 cr)
                </button>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px dashed rgba(139, 92, 246, 0.3)', gridColumn: '1 / -1' }}>
            <Award size={36} color="#c084fc" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>No Certified Review Tasks Available</h3>
            <p style={{ color: '#94a3b8', maxWidth: '520px', margin: '0 auto 16px auto', fontSize: '0.9rem' }}>
              You can only review community course submissions in skill areas where you have completed courses or earned verified credentials on SkillChain.
            </p>
            <button
              onClick={() => navigate('/participant/skillhub')}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Browse SkillHub Courses to Learn
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PeerReview;