import React, { useState, useEffect } from 'react';
import { LineChart } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Track.css';

const CircularProgress = ({ percentage }) => {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="progress-circle-container">
      <svg width="115" height="115" viewBox="0 0 115 115">
        <defs>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        <circle cx="57.5" cy="57.5" r={radius} className="circle-bg" />

        <circle
          cx="57.5"
          cy="57.5"
          r={radius}
          className="circle-progress"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset
          }}
        />
      </svg>

      <div className="progress-text">
        <span className="percent-val">{percentage}%</span>
        <span className="percent-label">Progress</span>
      </div>
    </div>
  );
};

const Track = () => {
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || localStorage.getItem('participantId') || 'P001';

  const [coursesProgress, setCoursesProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        const res = await api.getProgress(activePid);
        if (res && res.progress && res.progress.length > 0) {
          const progress = res.progress.map((p, idx) => {
            const courseId = p.courseId || p.course_id || idx + 1;
            const courseTitle = p.courseTitle || p.course_title || p.title || p.COURSE_TITLE || `Course ${idx + 1}`;

            // Check participant's real completed lessons list
            const savedKey = `skillchain_completed_lessons_${activePid}_${courseId}`;
            const savedRaw = localStorage.getItem(savedKey);
            let localCompleted = 0;
            if (savedRaw) {
              try {
                const arr = JSON.parse(savedRaw);
                if (Array.isArray(arr)) localCompleted = arr.length;
              } catch {}
            }

            if (localCompleted === 0) {
              try {
                localStorage.removeItem(`skillchain_course_progress_${activePid}_${courseId}`);
              } catch {}
            }

            const total = Math.max(1, Number(p.totalLessons || p.total_lesson || p.TOTAL_LESSON || 3));
            const completed = localCompleted;
            const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

            return {
              id: courseId,
              title: courseTitle,
              completedLessons: completed,
              totalLessons: total,
              percentage: pct
            };
          });
          setCoursesProgress(progress);
        } else {
          setCoursesProgress([]);
        }
      } catch (err) {
        console.warn("Error fetching participant progress:", err);
        setCoursesProgress([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();

    const handleProgressUpdate = () => {
      fetchProgress();
    };
    window.addEventListener('skillchain-progress-updated', handleProgressUpdate);
    return () => {
      window.removeEventListener('skillchain-progress-updated', handleProgressUpdate);
    };
  }, [activePid]);

  return (
    <div className="track-page-container">

      <div className="track-header-section">
        <div className="track-header-left">
          <h2>Learning Progress</h2>
          <p>Track your course progress and keep learning consistently.</p>
        </div>
        <div className="track-header-icon">
          <LineChart size={24} />
        </div>
      </div>

      <div className="course-progress-list">
        {loading ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Loading your progress...</p>
        ) : coursesProgress.length > 0 ? (
          coursesProgress.map((course) => (
            <div className="progress-card" key={course.id}>

              <div className="course-info">
                <h3>{course.title}</h3>
                <p>{course.completedLessons} out of {course.totalLessons} lessons completed</p>
              </div>

              <CircularProgress percentage={course.percentage} />

            </div>
          ))
        ) : (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No progress data available yet. Enroll in courses and complete lessons to track your progress!</p>
        )}
      </div>

    </div>
  );
};

export default Track;
