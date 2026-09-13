import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, XCircle, BookOpen, Clock, ShieldCheck, Video } from 'lucide-react';
import { api } from '../../services/api';
import './LessonList.css';

const AdminLessonList = () => {
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(location.state?.courseId || 'C001');
  const [currentCourse, setCurrentCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);

  // Load all platform courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.getCourses();
        const courseList = res.courses || [];
        setCourses(courseList);
        if (!location.state?.courseId && courseList.length > 0) {
          setActiveCourseId(courseList[0].id || courseList[0].course_id);
        }
      } catch (err) {
        console.warn("Error fetching courses for admin:", err);
      }
    };
    fetchCourses();
  }, [location.state]);

  // Load lessons for chosen course
  useEffect(() => {
    if (!activeCourseId) return;
    const fetchLessons = async () => {
      try {
        setLoading(true);
        const res = await api.getCourseLessons(activeCourseId);
        if (res && res.lessons) {
          setLessons(res.lessons);
          setCurrentCourse(res.course || null);
        }
      } catch (err) {
        console.warn("Error fetching course curriculum:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [activeCourseId]);

  const handleWatchVideo = (lesson) => {
    if (lesson.videoUrl && lesson.videoUrl !== '#') {
      setActiveVideo(lesson.videoUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveVideo("https://www.youtube.com/embed/WDX1gLtCIlc");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="lesson-list-container">
      {/* Header */}
      <div className="ll-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>Platform Lesson Curriculum Monitor</h2>
          <p>Inspect curriculum structure, verify lecture content quality, and monitor learning modules.</p>
        </div>

        {/* Course Selector Dropdown */}
        {courses.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>Select Course:</span>
            <select
              value={activeCourseId}
              onChange={(e) => {
                setActiveCourseId(e.target.value);
                setActiveVideo(null);
              }}
              style={{
                background: '#131b2e',
                color: '#e2e8f0',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {courses.map(c => (
                <option key={c.id || c.course_id} value={c.id || c.course_id}>
                  {c.title || c.course_title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Course Stats Card */}
      {currentCourse && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.9) 0%, rgba(30, 41, 67, 0.7) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>{currentCourse.title}</h3>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
              Instructor: <strong style={{ color: '#c084fc' }}>{currentCourse.instructorName || 'Platform Instructor'}</strong> • Level: <strong style={{ color: '#38bdf8' }}>{currentCourse.level || 'Intermediate'}</strong> • Price: <strong style={{ color: '#f59e0b' }}>{currentCourse.price || 500} credits</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Modules</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>
                {lessons.length} Verified Lessons
              </div>
            </div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '2px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <ShieldCheck size={22} />
            </div>
          </div>
        </div>
      )}

      {/* THE VIDEO PLAYER */}
      {activeVideo && (
        <div style={{
          background: '#090e1a',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          marginBottom: '35px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          position: 'relative'
        }}>
          <button
            onClick={() => setActiveVideo(null)}
            style={{
              position: 'absolute', top: '15px', right: '15px',
              background: 'transparent', border: 'none',
              color: '#ef4444', cursor: 'pointer', zIndex: 10
            }}
          >
            <XCircle size={28} />
          </button>

          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '8px', overflow: 'hidden' }}>
            <iframe
              src={`${activeVideo}?autoplay=1`}
              title="Course Video Player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            ></iframe>
          </div>
        </div>
      )}

      {/* List of Lessons */}
      <div className="ll-list-wrapper">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading course curriculum...</div>
        ) : lessons.length > 0 ? (
          lessons.map((lesson, index) => {
            const visualNumber = String(index + 1).padStart(2, '0');

            return (
              <div className="ll-lesson-card" key={lesson.id}>
                <div className="ll-lesson-info">
                  <div className="ll-number-badge">
                    {visualNumber}
                  </div>
                  <div>
                    <h3 className="ll-lesson-title">{lesson.title}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.8rem', color: '#94a3b8' }}>
                      <Clock size={13} /> {lesson.duration || '45 mins'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="ll-actions-wrapper">
                  <button
                    className="ll-watch-btn"
                    onClick={() => handleWatchVideo(lesson)}
                  >
                    Watch Preview <ArrowRight size={18} className="ll-btn-icon" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '20px 0' }}>
            No lessons available yet for this course.
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminLessonList;