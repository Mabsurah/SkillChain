import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, ArrowRight, CloudUpload, Plus, X, CheckCircle, AlertCircle, Clock, BookOpen, ExternalLink, Sparkles, Layers, RotateCw } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './ContentList.css';

const ContentList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || localStorage.getItem('participantId') || 'P001';

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(location.state?.courseId || null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // "Add Content / Lesson" Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetCourseId, setTargetCourseId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonUrl, setLessonUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState('45');

  // "Upload / Update Test" Modal States
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testCourseId, setTestCourseId] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [testDuration, setTestDuration] = useState('30');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchContent = useCallback(async (preferredCourseId = null, isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setIsRefreshing(true);
      const res = await api.getMyContent(activePid);
      if (res && res.courses) {
        const normalizedCourses = (res.courses || []).map(c => {
          const cid = c.id || c.ID || c.course_id || c.COURSE_ID;
          const courseTitle = (c.title || c.TITLE || c.course_title || c.COURSE_TITLE || 'Course').trim();
          const rawLessons = c.lessons || c.LESSONS || [];

          const normalizedLessons = rawLessons.map((l, idx) => {
            let rawTitle = (l.title || l.TITLE || l.asset_title || l.ASSET_TITLE || l.content_title || '').trim();
            if (rawTitle.endsWith(':')) {
              rawTitle = rawTitle.replace(/:+$/, '').trim();
            }
            const fallbackTitle = `${courseTitle} Lesson ${idx + 1}`;
            const cleanTitle = rawTitle || fallbackTitle;
            const assetId = l.asset_id || l.ASSET_ID || l.id || l.ID || `AS_${cid}_${idx + 1}`;
            const contentId = l.content_id || l.CONTENT_ID;
            const url = l.url || l.URL || l.asset_url || l.ASSET_URL || l.content_url || "https://skillchain.com/lessons";
            const duration = Number(l.duration || l.DURATION || l.asset_duration || l.ASSET_DURATION) || 45;

            return {
              id: assetId,
              asset_id: assetId,
              content_id: contentId,
              course_id: cid,
              title: cleanTitle,
              asset_title: cleanTitle,
              url,
              duration
            };
          });

          return {
            ...c,
            id: cid,
            course_id: cid,
            title: courseTitle,
            course_title: courseTitle,
            totalLessons: normalizedLessons.length,
            lessons: normalizedLessons
          };
        });

        setCourses(normalizedCourses);

        if (normalizedCourses.length > 0) {
          const targetPref = preferredCourseId || location.state?.courseId;
          const matched = targetPref 
            ? normalizedCourses.find(c => String(c.id || c.course_id).toUpperCase() === String(targetPref).toUpperCase())
            : null;
          
          if (matched) {
            setSelectedCourseId(matched.id || matched.course_id);
          } else {
            setSelectedCourseId(prev => {
              const stillExists = normalizedCourses.find(c => (c.id || c.course_id) === prev);
              return stillExists ? prev : (normalizedCourses[0].id || normalizedCourses[0].course_id);
            });
          }
        } else {
          setSelectedCourseId(null);
        }
      }
    } catch (err) {
      console.warn("Error loading user content:", err);
    } finally {
      if (!isSilent) setLoading(false);
      setIsRefreshing(false);
    }
  }, [activePid, location.state]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const selectedCourse = courses.find(c => (c.id || c.course_id) === selectedCourseId) || courses[0] || null;
  const lessons = selectedCourse?.lessons || [];

  const handleDelete = async (lesson, index) => {
    const activeCid = String(lesson.course_id || selectedCourseId || (selectedCourse?.id || selectedCourse?.course_id) || '').trim();
    const fallbackTitle = `${selectedCourse?.title || selectedCourse?.course_title || 'Course'} Lesson ${index + 1}`;
    const rawTitle = (lesson.title || lesson.asset_title || '').trim() || fallbackTitle;
    const targetAssetId = String(lesson.asset_id || lesson.id || '').trim().toUpperCase();
    const targetContentId = String(lesson.content_id || '').trim().toUpperCase();

    if (!window.confirm(`Are you sure you want to delete lesson "${rawTitle}"?`)) return;

    // 1. Immediately update UI state (instant optimistic update)
    setCourses(prevCourses => prevCourses.map(c => {
      const cId = String(c.id || c.course_id || '').trim().toUpperCase();
      const selId = String(selectedCourseId || activeCid || '').trim().toUpperCase();

      if (cId === selId || !selId) {
        const currentLessons = c.lessons || [];
        const filteredLessons = currentLessons.filter((l, i) => i !== index);

        return {
          ...c,
          totalLessons: filteredLessons.length,
          lessons: filteredLessons
        };
      }
      return c;
    }));

    // 2. Perform backend API delete
    try {
      const primaryDeleteId = lesson.asset_id || lesson.id || `idx_${index}`;
      const res = await api.deleteContent(primaryDeleteId, {
        courseId: activeCid,
        assetId: lesson.asset_id || primaryDeleteId,
        contentId: lesson.content_id,
        title: rawTitle,
        index: index
      });
      showToast(res?.message || `Lesson "${rawTitle}" removed successfully.`, 'success');
      await fetchContent(selectedCourseId, true);
    } catch (err) {
      showToast(`Notice: ${err.message || 'Lesson removed.'}`, 'info');
      await fetchContent(selectedCourseId, true);
    }
  };

  // -------------------------------------------------------------
  // ADD LESSON MODAL HANDLERS
  // -------------------------------------------------------------
  const handleOpenModal = (preselectedCid = null) => {
    const cid = preselectedCid || selectedCourseId || (courses[0]?.id || courses[0]?.course_id) || '';
    setTargetCourseId(cid);
    setLessonTitle('');
    setLessonUrl('');
    setLessonDuration('45');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setLessonTitle('');
    setLessonUrl('');
    setLessonDuration('45');
  };

  const handleSubmitContent = async () => {
    if (!lessonTitle.trim() || !lessonUrl.trim() || !lessonDuration) {
      alert("Please fill out all required fields.");
      return;
    }

    const cid = targetCourseId || selectedCourseId;
    if (!cid) {
      alert("Please select a contributed course first.");
      return;
    }

    try {
      const res = await api.uploadContent({
        participantId: activePid,
        courseId: cid,
        lessonTitle: lessonTitle.trim(),
        title: lessonTitle.trim(),
        lessonUrl: lessonUrl.trim(),
        url: lessonUrl.trim(),
        lessonDuration: parseInt(lessonDuration, 10) || 45,
        duration: parseInt(lessonDuration, 10) || 45
      });

      showToast(res?.message || `Lesson "${lessonTitle}" added to course curriculum!`, 'success');
      handleCloseModal();
      fetchContent(cid, true);
    } catch (err) {
      showToast(`Error: ${err.message || 'Failed to add lesson'}`, 'error');
      handleCloseModal();
    }
  };

  // -------------------------------------------------------------
  // UPLOAD / UPDATE TEST MODAL HANDLERS
  // -------------------------------------------------------------
  const handleOpenTestModal = (preselectedCid = null) => {
    const cid = preselectedCid || selectedCourseId || (courses[0]?.id || courses[0]?.course_id) || '';
    setTestCourseId(cid);
    
    const targetC = courses.find(c => (c.id || c.course_id) === cid);
    const existingExam = targetC?.exam;
    
    setTestUrl(existingExam?.exam_url || existingExam?.url || '');
    setTestDuration(String(existingExam?.exam_duration || existingExam?.duration || 30));
    setIsTestModalOpen(true);
  };

  const handleCloseTestModal = () => {
    setIsTestModalOpen(false);
    setTestUrl('');
    setTestDuration('30');
  };

  const handleSubmitTest = async () => {
    const cid = testCourseId || selectedCourseId;
    if (!cid) {
      alert("Please select a contributed course first.");
      return;
    }

    if (!testDuration || parseInt(testDuration, 10) <= 0) {
      alert("Please enter a valid test duration in minutes.");
      return;
    }

    try {
      const res = await api.uploadCourseTest({
        participantId: activePid,
        courseId: cid,
        testTitle: `${selectedCourse?.title || selectedCourse?.course_title || 'Course'} Assessment`,
        testUrl: testUrl.trim(),
        examUrl: testUrl.trim(),
        duration: parseInt(testDuration, 10) || 30,
        examDuration: parseInt(testDuration, 10) || 30
      });

      showToast(res?.message || `Course assessment updated successfully!`, 'success');
      handleCloseTestModal();
      fetchContent(cid, true);
    } catch (err) {
      showToast(`Assessment submitted: ${err.message}`, 'success');
      handleCloseTestModal();
      fetchContent(cid, true);
    }
  };

  const handleWatchVideo = (url, title) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open("https://www.youtube.com/watch?v=WDX1gLtCIlc", '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="content-list-container">
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
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* 1. ADD CONTENT / LESSON MODAL OVERLAY */}
      {isModalOpen && (
        <div className="cl-modal-overlay">
          <div className="cl-modal" style={{ maxWidth: '520px' }}>
            <button className="cl-modal-close" onClick={handleCloseModal}>
              <X size={24} />
            </button>

            <h2>Add Lesson to Course</h2>
            <p>Attach new video or reading module directly into your live course curriculum.</p>

            {/* Course Selector in Modal */}
            <div className="cl-form-group">
              <label>Target Contributed Course <span className="cl-required">*</span></label>
              <select
                className="cl-form-input"
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                style={{ background: '#0f172a', color: '#f8fafc' }}
              >
                {courses.map(c => (
                  <option key={c.id || c.course_id} value={c.id || c.course_id}>
                    {c.title || c.course_title} ({c.id || c.course_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="cl-form-group">
              <label>Lesson Title <span className="cl-required">*</span></label>
              <input
                type="text"
                className="cl-form-input"
                placeholder="e.g., Understanding Pointer Arithmetic & Memory in C"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </div>

            <div className="cl-form-group">
              <label>Lesson Video / Content URL <span className="cl-required">*</span></label>
              <input
                type="text"
                className="cl-form-input"
                placeholder="e.g., https://www.youtube.com/watch?v=... or https://skillchain.com/lessons/..."
                value={lessonUrl}
                onChange={(e) => setLessonUrl(e.target.value)}
              />
            </div>

            <div className="cl-form-group">
              <label>Duration (Minutes) <span className="cl-required">*</span></label>
              <input
                type="number"
                min="5"
                max="300"
                className="cl-form-input"
                placeholder="e.g., 45"
                value={lessonDuration}
                onChange={(e) => setLessonDuration(e.target.value)}
              />
            </div>

            <div className="cl-modal-footer">
              <button className="cl-btn-cancel" onClick={handleCloseModal}>Cancel</button>
              <button className="cl-btn-ok" onClick={handleSubmitContent}>Add Lesson to Course</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. UPLOAD / UPDATE TEST MODAL OVERLAY */}
      {isTestModalOpen && (
        <div className="cl-modal-overlay">
          <div className="cl-modal" style={{ maxWidth: '520px' }}>
            <button className="cl-modal-close" onClick={handleCloseTestModal}>
              <X size={24} />
            </button>

            <h2>Attach / Update Course Exam</h2>
            <p>Configure the certification exam link and duration for enrolled students.</p>

            <div className="cl-form-group">
              <label>Target Contributed Course <span className="cl-required">*</span></label>
              <select
                className="cl-form-input"
                value={testCourseId}
                onChange={(e) => {
                  setTestCourseId(e.target.value);
                  const targetC = courses.find(c => (c.id || c.course_id) === e.target.value);
                  setTestUrl(targetC?.exam?.exam_url || targetC?.exam?.url || '');
                  setTestDuration(String(targetC?.exam?.exam_duration || targetC?.exam?.duration || 30));
                }}
                style={{ background: '#0f172a', color: '#f8fafc' }}
              >
                {courses.map(c => (
                  <option key={c.id || c.course_id} value={c.id || c.course_id}>
                    {c.title || c.course_title} ({c.id || c.course_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="cl-form-group">
              <label>Exam / Assessment Link (URL)</label>
              <input
                type="text"
                className="cl-form-input"
                placeholder="Enter test URL (e.g. Google Form or external assessment link)"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
              />
            </div>

            <div className="cl-form-group">
              <label>Duration (Minutes) <span className="cl-required">*</span></label>
              <input
                type="number"
                min="5"
                max="240"
                className="cl-form-input"
                placeholder="e.g., 30, 45, 60"
                value={testDuration}
                onChange={(e) => setTestDuration(e.target.value)}
              />
            </div>

            <div className="cl-modal-footer">
              <button className="cl-btn-cancel" onClick={handleCloseTestModal}>Cancel</button>
              <button className="cl-btn-ok" onClick={handleSubmitTest}>Update Course Exam</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="cl-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2>Contributed Curriculum &amp; Content</h2>
          <p>Select your contributed course, add lessons directly to its curriculum, and manage attached certification exams.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => fetchContent(selectedCourseId, false)}
            title="Refresh Courses and Content"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(51, 65, 85, 0.8)',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <RotateCw size={15} className={isRefreshing ? 'animate-spin' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button
            onClick={() => navigate('/participant/contribution')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Create New Course
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* COURSE SELECTOR & ACTIVE COURSE OVERVIEW CARD */}
      {/* ------------------------------------------------------------- */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading contributed courses and curriculum...</div>
      ) : courses.length > 0 ? (
        <>
          <div style={{ marginBottom: '20px', background: '#0f172a', padding: '16px 20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} color="#8b5cf6" /> Select Contributed Course:
              </label>

              <select
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid #3b82f6',
                  color: '#f8fafc',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '260px'
                }}
              >
                {courses.map(c => (
                  <option key={c.id || c.course_id} value={c.id || c.course_id}>
                    {c.title || c.course_title} ({c.id || c.course_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Course Details Banner */}
            {selectedCourse && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '10px',
                padding: '16px 20px',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                        {selectedCourse.title || selectedCourse.course_title}
                      </span>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        Live on SkillHub
                      </span>
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60a5fa',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {selectedCourse.level || 'Intermediate'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#94a3b8', fontSize: '0.85rem' }}>
                      <span>Course ID: <strong>{selectedCourse.id || selectedCourse.course_id}</strong></span>
                      <span>•</span>
                      <span>Total Lessons: <strong>{lessons.length}</strong></span>
                      <span>•</span>
                      <span>Price: <strong>{selectedCourse.price || 500} Credits</strong></span>
                    </div>
                  </div>

                  {/* Attached Exam Card Indicator */}
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} /> Course Assessment
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>
                        Duration: <strong>{selectedCourse.exam?.exam_duration || selectedCourse.exam?.duration || 30} mins</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {selectedCourse.exam?.exam_url && selectedCourse.exam.exam_url.trim() !== '' && (
                        <button
                          type="button"
                          onClick={() => window.open(selectedCourse.exam.exam_url, '_blank', 'noopener,noreferrer')}
                          title="Open Assessment Link"
                          style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid #3b82f6',
                            color: '#93c5fd',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ExternalLink size={12} /> Link
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenTestModal(selectedCourse.id || selectedCourse.course_id)}
                        style={{
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid #f59e0b',
                          color: '#fcd34d',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Edit Exam
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List of Lessons For the Active Course */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 600 }}>
              Course Lessons ({lessons.length})
            </h3>
            <button
              onClick={() => handleOpenModal(selectedCourseId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid #8b5cf6',
                color: '#c4b5fd',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Add Lesson to This Course
            </button>
          </div>

          <div className="cl-list-wrapper">
            {lessons.length > 0 ? (
              lessons.map((lesson, index) => {
                const visualNumber = String(index + 1).padStart(2, '0');
                const duration = lesson.duration || lesson.asset_duration || 45;
                const displayTitle = (lesson.title || lesson.content_title || lesson.asset_title || '').trim() || `${selectedCourse?.title || selectedCourse?.course_title || 'Course'} Lesson ${index + 1}`;

                return (
                  <div className="cl-lesson-card" key={lesson.id || lesson.asset_id || index}>
                    <div className="cl-card-left">
                      <div className="cl-number-badge">{visualNumber}</div>
                      <div>
                        <h3 className="cl-lesson-title">{displayTitle}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} color="#94a3b8" /> {duration} mins
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="cl-card-actions">
                      <button
                        className="cl-delete-btn"
                        onClick={() => handleDelete(lesson, index)}
                      >
                        <Trash2 size={16} /> Delete
                      </button>

                      <button
                        className="cl-watch-btn"
                        onClick={() => handleWatchVideo(lesson.url || lesson.asset_url || lesson.content_url, displayTitle)}
                      >
                        Preview <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '30px 20px', textAlign: 'center' }}>
                <BookOpen size={32} color="#8b5cf6" style={{ marginBottom: '8px', opacity: 0.8 }} />
                <p style={{ color: '#cbd5e1', margin: '0 0 10px 0', fontSize: '0.95rem' }}>
                  No lessons found in this course yet.
                </p>
                <button
                  onClick={() => handleOpenModal(selectedCourseId)}
                  style={{
                    background: '#8b5cf6',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Add First Lesson
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', marginBottom: '30px' }}>
          <BookOpen size={40} color="#8b5cf6" style={{ marginBottom: '12px', opacity: 0.8 }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '8px', fontSize: '1.2rem' }}>No Contributed Courses Yet</h3>
          <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
            You haven't contributed any courses yet. Once you create a course and it gets approved by Admin, you can add further lessons and manage its certification exam right from here!
          </p>
          <button
            onClick={() => navigate('/participant/contribution')}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              border: 'none',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Go to Contributions Page <ArrowRight size={16} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '6px' }} />
          </button>
        </div>
      )}

      {/* Bottom Action Cards */}
      <div className="cl-bottom-actions">
        <div className="cl-action-card cl-card-blue" onClick={() => handleOpenTestModal(selectedCourseId)}>
          <div className="cl-action-left">
            <div className="cl-action-icon">
              <CloudUpload size={24} />
            </div>
            <div className="cl-action-text">
              <h4>Upload / Update Test</h4>
              <p>Upload or update certification test link &amp; duration for selected course</p>
            </div>
          </div>
          <ArrowRight size={24} className="cl-arrow" />
        </div>

        <div className="cl-action-card cl-card-purple" onClick={() => handleOpenModal(selectedCourseId)}>
          <div className="cl-action-left">
            <div className="cl-action-icon">
              <Plus size={24} />
            </div>
            <div className="cl-action-text">
              <h4>Add Content / Lesson</h4>
              <p>Add new teaching lessons directly to the selected course curriculum</p>
            </div>
          </div>
          <ArrowRight size={24} className="cl-arrow" />
        </div>
      </div>
    </div>
  );
};

export default ContentList;