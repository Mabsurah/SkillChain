import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, XCircle, MessageSquare, CheckCircle, Award, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import FeedbackModal from './FeedbackModal';
import './LessonList.css';

const LessonList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || localStorage.getItem('participantId') || 'P001';

  const [activeCourseId, setActiveCourseId] = useState(location.state?.courseId || null);
  const [courses, setCourses] = useState([]);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [selectedLessonTitle, setSelectedLessonTitle] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Only Enrolled Courses For This Participant
  useEffect(() => {
    const loadEnrolledCourses = async () => {
      try {
        setLoading(true);
        const res = await api.getEnrollments(activePid);
        const enrolledList = (res.enrollments || []).map(e => ({
          id: e.courseId || e.course_id,
          course_id: e.courseId || e.course_id,
          title: e.courseTitle || e.course_title || `Course ${e.courseId || e.course_id}`,
          course_title: e.courseTitle || e.course_title || `Course ${e.courseId || e.course_id}`,
          level: e.level || 'Intermediate',
          price: e.price
        }));

        setCourses(enrolledList);

        if (location.state?.courseId) {
          const match = enrolledList.find(c => String(c.id).toUpperCase() === String(location.state.courseId).toUpperCase());
          if (match) {
            setActiveCourseId(match.id);
          } else if (enrolledList.length > 0) {
            setActiveCourseId(enrolledList[0].id);
          } else {
            setActiveCourseId(null);
          }
        } else if (enrolledList.length > 0) {
          setActiveCourseId(enrolledList[0].id);
        } else {
          setActiveCourseId(null);
          setLessons([]);
          setCurrentCourse(null);
          setCompletedLessonIds(new Set());
        }
      } catch (err) {
        console.warn("Error loading enrolled courses:", err);
        setCourses([]);
        setActiveCourseId(null);
      } finally {
        setLoading(false);
      }
    };
    loadEnrolledCourses();
  }, [activePid, location.state]);

  // Load Lessons for Selected Enrolled Course
  useEffect(() => {
    if (!activeCourseId) {
      setLessons([]);
      setCurrentCourse(null);
      setCompletedLessonIds(new Set());
      return;
    }
    const fetchLessons = async () => {
      try {
        setLoading(true);
        const res = await api.getCourseLessons(activeCourseId, activePid);
        if (res && res.lessons) {
          const lessonList = res.lessons || [];
          setLessons(lessonList);
          setCurrentCourse(res.course || null);

          // 1. Try restoring from localStorage with multiple key variations
          let savedCompletedList = [];
          const keysToTry = [
            `skillchain_completed_lessons_${activePid}_${activeCourseId}`,
            `skillchain_completed_lessons_${String(activePid).toLowerCase()}_${activeCourseId}`,
            `skillchain_completed_lessons_${String(activePid).toUpperCase()}_${activeCourseId}`,
            `skillchain_completed_lessons_${activePid}_${String(activeCourseId).toUpperCase()}`,
            `skillchain_completed_lessons_${activePid}_${String(activeCourseId).toLowerCase()}`
          ];

          for (const k of keysToTry) {
            const raw = localStorage.getItem(k);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  savedCompletedList = parsed;
                  break;
                }
              } catch {}
            }
          }

          // 2. Also check skillchain_course_progress
          let progCompletedCount = 0;
          const progKeysToTry = [
            `skillchain_course_progress_${activePid}_${activeCourseId}`,
            `skillchain_course_progress_${String(activePid).toLowerCase()}_${activeCourseId}`,
            `skillchain_course_progress_${String(activePid).toUpperCase()}_${activeCourseId}`,
            `skillchain_course_progress_${activePid}_${String(activeCourseId).toUpperCase()}`,
            `skillchain_course_progress_${activePid}_${String(activeCourseId).toLowerCase()}`
          ];
          for (const pk of progKeysToTry) {
            const pRaw = localStorage.getItem(pk);
            if (pRaw) {
              try {
                const pParsed = JSON.parse(pRaw);
                if (pParsed && typeof pParsed.completedLessons === 'number' && pParsed.completedLessons > 0) {
                  progCompletedCount = pParsed.completedLessons;
                  break;
                }
              } catch {}
            }
          }

          const finalCompletedSet = new Set();

          // Only mark completed if this specific user has explicitly completed this lesson
          const activeIds = new Set(lessonList.map(l => l.id));
          savedCompletedList.forEach(id => {
            if (activeIds.has(id)) {
              finalCompletedSet.add(id);
            }
          });

          setCompletedLessonIds(finalCompletedSet);

          // Update currentCourse stats
          const totalCount = Math.max(1, lessonList.length);
          const computedPct = Math.min(100, Math.round((finalCompletedSet.size / totalCount) * 100));
          if (res.course) {
            setCurrentCourse({
              ...res.course,
              totalLessons: lessonList.length,
              completedLessons: finalCompletedSet.size,
              progressPercentage: computedPct
            });
          }

          // Keep storage in sync
          if (finalCompletedSet.size > 0) {
            const arr = Array.from(finalCompletedSet);
            localStorage.setItem(`skillchain_completed_lessons_${activePid}_${activeCourseId}`, JSON.stringify(arr));
            localStorage.setItem(`skillchain_course_progress_${activePid}_${activeCourseId}`, JSON.stringify({
              completedLessons: finalCompletedSet.size,
              totalLessons: lessonList.length,
              percentage: computedPct
            }));
          } else {
            try {
              localStorage.removeItem(`skillchain_completed_lessons_${activePid}_${activeCourseId}`);
              localStorage.removeItem(`skillchain_course_progress_${activePid}_${activeCourseId}`);
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Failed to load course lessons:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [activeCourseId, activePid]);

  const handleWatchVideo = (lesson) => {
    if (lesson.videoUrl && lesson.videoUrl !== '#') {
      setActiveVideo(lesson.videoUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveVideo("https://www.youtube.com/embed/WDX1gLtCIlc");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCompleteLesson = async (lesson) => {
    if (completedLessonIds.has(lesson.id)) {
      showToast(`Lesson "${lesson.title}" is already marked as completed!`, 'info');
      return;
    }

    const nextSet = new Set(completedLessonIds);
    nextSet.add(lesson.id);
    setCompletedLessonIds(nextSet);

    const totalCount = Math.max(1, lessons.length || 1);
    const computedPct = Math.min(100, Math.round((nextSet.size / totalCount) * 100));

    // Save to localStorage immediately
    const savedKey = `skillchain_completed_lessons_${activePid}_${activeCourseId}`;
    localStorage.setItem(savedKey, JSON.stringify(Array.from(nextSet)));

    const progressPayload = {
      completedLessons: nextSet.size,
      totalLessons: totalCount,
      percentage: computedPct
    };
    localStorage.setItem(`skillchain_course_progress_${activePid}_${activeCourseId}`, JSON.stringify(progressPayload));

    // Update currentCourse state
    setCurrentCourse(prev => prev ? ({
      ...prev,
      completedLessons: nextSet.size,
      progressPercentage: computedPct
    }) : null);

    // Broadcast update event so Track & Dashboard can sync in real time
    window.dispatchEvent(new CustomEvent('skillchain-progress-updated', {
      detail: {
        participantId: activePid,
        courseId: activeCourseId,
        completedLessons: nextSet.size,
        totalLessons: totalCount,
        percentage: computedPct
      }
    }));

    try {
      const res = await api.completeLesson({
        participantId: activePid,
        courseId: activeCourseId,
        lessonId: lesson.id,
        lessonTitle: lesson.title
      });

      if (res && res.newCredit !== undefined) {
        window.dispatchEvent(new CustomEvent('skillchain-credit-updated', {
          detail: { participantId: activePid, newCredit: res.newCredit }
        }));
      }

      showToast(`Lesson completed! +10 learning credits earned!`, 'success');
    } catch (err) {
      showToast(`Lesson marked complete! +10 credits awarded.`, 'success');
    }
  };

  const handleOpenFeedback = (lessonTitle) => {
    setSelectedLessonTitle(lessonTitle);
    setIsFeedbackOpen(true);
  };

  const progressPct = lessons.length > 0
    ? Math.min(100, Math.round((completedLessonIds.size / lessons.length) * 100))
    : 0;

  return (
    <div className="lesson-list-container">
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 9999,
          fontWeight: 600
        }}>
          <CheckCircle size={18} />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="ll-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>My Enrolled Lessons</h2>
          <p>Access all lessons, watch multimedia lectures, and complete modules for your enrolled courses.</p>
        </div>

        {/* Course Switcher (Only show if multiple enrolled courses) */}
        {courses.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>Active Course:</span>
            <select
              value={activeCourseId || ''}
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

      {/* When participant has NO enrollments */}
      {!loading && courses.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.95) 0%, rgba(30, 41, 67, 0.8) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '16px',
          padding: '50px 30px',
          textAlign: 'center',
          maxWidth: '650px',
          margin: '40px auto',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '2px solid rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#a78bfa'
          }}>
            <BookOpen size={36} />
          </div>
          <h3 style={{ color: '#f8fafc', marginBottom: '10px', fontSize: '1.4rem', fontWeight: 700 }}>
            No Enrolled Courses Yet
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '28px', lineHeight: '1.6' }}>
            You haven't enrolled in any courses yet. Visit the <strong>SkillHub</strong> course catalog to purchase and enroll in courses using your reward credits.
          </p>
          <button
            onClick={() => navigate('/participant/skillhub')}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <BookOpen size={18} /> Browse SkillHub Courses
          </button>
        </div>
      )}

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
              Instructor: <strong style={{ color: '#c084fc' }}>{currentCourse.instructorName || 'Platform Instructor'}</strong> • Level: <strong style={{ color: '#38bdf8' }}>{currentCourse.level || 'Intermediate'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Module Progress</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>
                {completedLessonIds.size} / {lessons.length} Completed ({progressPct}%)
              </div>
            </div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <Award size={22} />
            </div>
          </div>
        </div>
      )}

      {courses.length > 0 && (
        <>
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
                const isCompleted = completedLessonIds.has(lesson.id);

                return (
                  <div className="ll-lesson-card" key={lesson.id} style={{ borderColor: isCompleted ? 'rgba(16, 185, 129, 0.3)' : undefined }}>
                    <div className="ll-lesson-info">
                      <div className="ll-number-badge" style={{ background: isCompleted ? '#10b981' : undefined }}>
                        {isCompleted ? <CheckCircle size={14} color="#fff" /> : visualNumber}
                      </div>
                      <div>
                        <h3 className="ll-lesson-title">{lesson.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <Clock size={13} /> {lesson.duration || '45 mins'}
                          {isCompleted && <span style={{ color: '#10b981', fontWeight: 600 }}>• Completed (+10 Credits)</span>}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Container */}
                    <div className="ll-actions-wrapper">
                      <button
                        className="ll-feedback-btn"
                        onClick={() => handleOpenFeedback(lesson.title)}
                      >
                        <MessageSquare size={16} /> Feedback
                      </button>

                      <button
                        onClick={() => handleCompleteLesson(lesson)}
                        style={{
                          background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: isCompleted ? '#34d399' : '#38bdf8',
                          border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                          padding: '9px 15px',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <CheckCircle size={15} /> {isCompleted ? 'Done' : 'Mark Done (+10cr)'}
                      </button>

                      <button
                        className="ll-watch-btn"
                        onClick={() => handleWatchVideo(lesson)}
                      >
                        Watch Now <ArrowRight size={18} className="ll-btn-icon" />
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
        </>
      )}

      {/* FEEDBACK MODAL COMPONENT */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        lessonTitle={selectedLessonTitle}
        courseId={activeCourseId}
        participantId={activePid}
      />
    </div>
  );
};

export default LessonList;