import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, X, CheckCircle, Layers, Clock, AlertCircle, Trash2, 
  RotateCw, ExternalLink, Sparkles, BookOpen, ArrowRight, Play, Edit3, Send, FileCheck
} from 'lucide-react'; 
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Contribution.css';

const Contribution = () => {
  const navigate = useNavigate(); 
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || localStorage.getItem('participantId') || '';

  // --- Live Data States ---
  const [draftCourses, setDraftCourses] = useState([]);
  const [approvedCourses, setApprovedCourses] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Add Course Modal States ---
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('');
  const [lessons, setLessons] = useState([
    { title: 'Introduction to Architecture & Setup', url: '', duration: 45 }
  ]);

  // Exam / Assessment state in Add Course Modal
  const [hasExam, setHasExam] = useState(true);
  const [examUrl, setExamUrl] = useState('');
  const [examDuration, setExamDuration] = useState('30');

  // --- "View Content" Modal / Drawer States ---
  const [isViewContentModalOpen, setIsViewContentModalOpen] = useState(false);
  const [activeViewingCourse, setActiveViewingCourse] = useState(null);
  const [viewingLessons, setViewingLessons] = useState([]);
  const [viewingExam, setViewingExam] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // --- "Add Lesson Directly to Course" State in Content Viewer ---
  const [isAddingLessonInline, setIsAddingLessonInline] = useState(false);
  const [addLessonTitle, setAddLessonTitle] = useState('');
  const [addLessonUrl, setAddLessonUrl] = useState('');
  const [addLessonDuration, setAddLessonDuration] = useState('45');

  // --- "Edit Exam Modal" State ---
  const [isEditExamModalOpen, setIsEditExamModalOpen] = useState(false);
  const [editExamUrl, setEditExamUrl] = useState('');
  const [editExamDuration, setEditExamDuration] = useState('30');
  const [examQuestions, setExamQuestions] = useState([
    { id: 1, question: '', options: ['', '', '', ''], correct: 0 }
  ]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [profileStatus, setProfileStatus] = useState('');

  useEffect(() => {
    if (activePid) {
      api.getParticipantProfile(activePid).then(res => {
        if (res && res.participant) {
          setProfileStatus(res.participant.status || '');
        }
      }).catch(() => {});
    }
  }, [activePid]);

  const isInstructorRestricted = (profileStatus || user?.status || '').toLowerCase().includes('restricted');
  const currentParticipantStatus = (profileStatus || user?.status || '').toLowerCase().trim();
  const isExpert = currentParticipantStatus === 'expert' || currentParticipantStatus === 'approved';
  const isNewbie = !isExpert;

  const loadContributions = useCallback(async (isSilent = false) => {
    if (!activePid) {
      setDraftCourses([]);
      setApprovedCourses([]);
      setPendingCourses([]);
      setLoading(false);
      return;
    }
    try {
      if (!isSilent) setLoading(true);
      setIsRefreshing(true);
      const res = await api.getParticipantContributions(activePid);
      if (res) {
        setDraftCourses(res.draftCourses || []);
        setApprovedCourses(res.approvedCourses || []);
        setPendingCourses(res.pendingCourses || []);
      }
    } catch (err) {
      console.warn("Could not load contributions:", err);
    } finally {
      if (!isSilent) setLoading(false);
      setIsRefreshing(false);
    }
  }, [activePid]);

  useEffect(() => {
    loadContributions();

    // Auto-refresh periodically
    const interval = setInterval(() => {
      loadContributions(true);
    }, 3000);

    const onFocus = () => loadContributions(true);
    const onCatalogUpdate = () => loadContributions(true);

    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);
    window.addEventListener('skillchain-catalog-updated', onCatalogUpdate);
    window.addEventListener('skillchain-course-rejected', onCatalogUpdate);
    window.addEventListener('skillchain-course-approved', onCatalogUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('skillchain-catalog-updated', onCatalogUpdate);
      window.removeEventListener('skillchain-course-rejected', onCatalogUpdate);
      window.removeEventListener('skillchain-course-approved', onCatalogUpdate);
    };
  }, [loadContributions]);

  // Check if active course is in Draft mode (Editable) or Submitted/Approved
  const isCurrentCourseDraft = Boolean(
    activeViewingCourse &&
    ((activeViewingCourse.status || '').toLowerCase() === 'draft' ||
     (activeViewingCourse.status || '').toLowerCase() === 'in progress' ||
     activeViewingCourse.isDraft ||
     draftCourses.some(d => (d.id || d.course_id) === (activeViewingCourse.id || activeViewingCourse.course_id)))
  );

  // ==========================================
  // FETCH CONTENT FOR SELECTED COURSE
  // ==========================================
  const loadCourseContentDetails = async (course) => {
    const courseId = course?.id || course?.course_id;
    if (!courseId) return;

    try {
      setIsLoadingContent(true);
      
      // 1. Direct check in course object
      if (course && Array.isArray(course.lessons) && course.lessons.length > 0) {
        setViewingLessons(course.lessons);
        setViewingExam(course.exam || null);
        return;
      }

      // 2. Check in loaded draft or pending state
      const matchedCourse = draftCourses.find(c => (c.id || c.course_id) === courseId) ||
                            pendingCourses.find(c => (c.id || c.course_id) === courseId) ||
                            approvedCourses.find(c => (c.id || c.course_id) === courseId);
      if (matchedCourse && Array.isArray(matchedCourse.lessons) && matchedCourse.lessons.length > 0) {
        setViewingLessons(matchedCourse.lessons);
        setViewingExam(matchedCourse.exam || course.exam || null);
        return;
      }

      // 3. Fetch from API
      const res = await api.getCourseLessons(courseId);
      if (res && Array.isArray(res.lessons) && res.lessons.length > 0) {
        setViewingLessons(res.lessons);
        setViewingExam(course.exam || null);
      } else {
        setViewingLessons(course.lessons || []);
        setViewingExam(course.exam || null);
      }
    } catch (err) {
      setViewingLessons(course.lessons || []);
      setViewingExam(course.exam || null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleOpenViewContent = async (course) => {
    setActiveViewingCourse(course);
    setIsViewContentModalOpen(true);
    setIsAddingLessonInline(false);
    await loadCourseContentDetails(course);
  };

  const handleCloseViewContent = () => {
    setIsViewContentModalOpen(false);
    setActiveViewingCourse(null);
    setViewingLessons([]);
    setViewingExam(null);
    setIsAddingLessonInline(false);
  };

  // ==========================================
  // INLINE ADD LESSON (DRAFT COURSES ONLY)
  // ==========================================
  const handleSubmitInlineLesson = async () => {
    if (!isCurrentCourseDraft) {
      showToast("Cannot modify a course that is already submitted or approved.", "error");
      return;
    }
    if (!addLessonTitle.trim()) {
      showToast("Please enter a lesson title.", "error");
      return;
    }
    const courseId = activeViewingCourse?.id || activeViewingCourse?.course_id;
    if (!courseId) return;

    try {
      const res = await api.addContentToCourse({
        courseId,
        participantId: activePid,
        title: addLessonTitle.trim(),
        url: addLessonUrl.trim() || `https://skillchain.com/lessons/${Date.now()}`,
        duration: Number(addLessonDuration) || 45
      });

      showToast(res?.message || "Lesson added to draft course curriculum!", "success");
      const newLessonObj = res.lesson || {
        id: `CT${Date.now().toString().slice(-4)}`,
        title: addLessonTitle.trim(),
        url: addLessonUrl.trim() || `https://skillchain.com/lessons/${Date.now()}`,
        duration: Number(addLessonDuration) || 45
      };

      setViewingLessons(prev => [...prev, newLessonObj]);
      if (activeViewingCourse) {
        activeViewingCourse.lessons = [...(activeViewingCourse.lessons || []), newLessonObj];
      }

      setAddLessonTitle('');
      setAddLessonUrl('');
      setAddLessonDuration('45');
      setIsAddingLessonInline(false);
      await loadContributions(true);
    } catch (err) {
      showToast(err.message || "Failed to add lesson.", "error");
    }
  };

  // ==========================================
  // DELETE LESSON (DRAFT COURSES ONLY)
  // ==========================================
  const handleDeleteLesson = async (lesson, idx) => {
    if (!isCurrentCourseDraft) {
      showToast("Cannot delete lessons from a submitted or approved course.", "error");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this lesson from the draft course?")) return;
    
    const courseId = activeViewingCourse?.id || activeViewingCourse?.course_id;
    const contentId = lesson.id || lesson.content_id || lesson.asset_id || idx;

    try {
      await api.deleteLesson(contentId, { courseId, index: idx });
      showToast("Lesson removed from draft.", "success");
      setViewingLessons(prev => prev.filter((_, i) => i !== idx));
      if (activeViewingCourse && Array.isArray(activeViewingCourse.lessons)) {
        activeViewingCourse.lessons = activeViewingCourse.lessons.filter((_, i) => i !== idx);
      }
      await loadContributions(true);
    } catch (err) {
      setViewingLessons(prev => prev.filter((_, i) => i !== idx));
      await loadContributions(true);
    }
  };

  // ==========================================
  // EDIT EXAM IN CONTENT VIEWER (DRAFT ONLY)
  // ==========================================
  const handleOpenEditExam = () => {
    if (!isCurrentCourseDraft) {
      showToast("Certification exam cannot be edited after submission.", "error");
      return;
    }
    const currentExam = viewingExam || activeViewingCourse?.exam;
    setEditExamUrl(currentExam?.exam_url || currentExam?.url || '');
    setEditExamDuration(String(currentExam?.exam_duration || currentExam?.duration || 30));
    const initialQs = (currentExam?.questions && Array.isArray(currentExam.questions) && currentExam.questions.length > 0)
      ? currentExam.questions
      : [
          {
            id: 1,
            question: `What is the core principle taught in ${activeViewingCourse?.title || activeViewingCourse?.course_title || 'this course'}?`,
            options: ['Modular Architecture & Design Patterns', 'Hardcoding all values', 'Ignoring runtime errors', 'Disabling tests'],
            correct: 0
          },
          {
            id: 2,
            question: `How should exceptional cases be resolved in ${activeViewingCourse?.title || activeViewingCourse?.course_title || 'this course'}?`,
            options: ['Structured error handling & fallback routines', 'Suppressing all errors silently', 'Deleting system logs', 'Restarting application constantly'],
            correct: 0
          }
        ];
    setExamQuestions(initialQs);
    setIsEditExamModalOpen(true);
  };

  const handleCloseEditExam = () => {
    setIsEditExamModalOpen(false);
    setEditExamUrl('');
    setEditExamDuration('30');
  };

  const handleAddQuestion = () => {
    setExamQuestions(prev => [
      ...prev,
      {
        id: prev.length + 1,
        question: '',
        options: ['', '', '', ''],
        correct: 0
      }
    ]);
  };

  const handleRemoveQuestion = (qIndex) => {
    if (examQuestions.length <= 1) {
      alert("An exam must have at least one question.");
      return;
    }
    setExamQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleQuestionTextChange = (qIndex, text) => {
    setExamQuestions(prev => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], question: text };
      return updated;
    });
  };

  const handleOptionChange = (qIndex, optIndex, text) => {
    setExamQuestions(prev => {
      const updated = [...prev];
      const newOpts = [...updated[qIndex].options];
      newOpts[optIndex] = text;
      updated[qIndex] = { ...updated[qIndex], options: newOpts };
      return updated;
    });
  };

  const handleCorrectOptionChange = (qIndex, correctOptIndex) => {
    setExamQuestions(prev => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], correct: Number(correctOptIndex) };
      return updated;
    });
  };

  const handleSubmitEditExam = async () => {
    if (!isCurrentCourseDraft) {
      showToast("Cannot edit exam of a submitted course.", "error");
      return;
    }
    const cid = activeViewingCourse?.id || activeViewingCourse?.course_id;
    if (!cid) return;

    const validQuestions = examQuestions.filter(q => q.question.trim());

    try {
      const res = await api.uploadCourseTest({
        participantId: activePid,
        courseId: cid,
        testTitle: `${activeViewingCourse?.title || activeViewingCourse?.course_title || 'Course'} Assessment`,
        testUrl: editExamUrl.trim(),
        examUrl: editExamUrl.trim(),
        duration: parseInt(editExamDuration, 10) || 30,
        examDuration: parseInt(editExamDuration, 10) || 30,
        questions: validQuestions.length > 0 ? validQuestions : undefined
      });

      showToast(res?.message || 'Course certification exam questions saved successfully!', 'success');
      setViewingExam({
        exam_url: editExamUrl.trim(),
        url: editExamUrl.trim(),
        exam_duration: parseInt(editExamDuration, 10) || 30,
        duration: parseInt(editExamDuration, 10) || 30,
        questions: validQuestions
      });
      handleCloseEditExam();
      loadContributions(true);
    } catch (err) {
      showToast(`Assessment updated: ${err.message}`, 'success');
      handleCloseEditExam();
      loadContributions(true);
    }
  };

  // ==========================================
  // SUBMIT COURSE FOR PEER REVIEW (FINAL ACTION)
  // ==========================================
  const handleSubmitCourseForReview = async (courseId) => {
    const targetId = courseId || activeViewingCourse?.id || activeViewingCourse?.course_id;
    if (!targetId) return;

    // Find course title and level
    const targetCourse = activeViewingCourse ||
      draftCourses.find(c => (c.id || c.course_id) === targetId) ||
      pendingCourses.find(c => (c.id || c.course_id) === targetId) ||
      approvedCourses.find(c => (c.id || c.course_id) === targetId);
    const courseTitle = targetCourse?.title || targetCourse?.course_title || '';
    const courseLevel = targetCourse?.level || targetCourse?.course_level || 'Intermediate';

    // Check if course has at least 1 lesson
    const draftItem = draftCourses.find(d => (d.id || d.course_id) === targetId);
    const lessonsList = (targetId === (activeViewingCourse?.id || activeViewingCourse?.course_id) && viewingLessons?.length > 0)
      ? viewingLessons
      : (targetCourse?.lessons?.length > 0 ? targetCourse.lessons : (draftItem?.lessons || []));

    if (!lessonsList || lessonsList.length === 0) {
      alert("A course must have at least 1 lesson before submitting for review.");
      showToast("Please add at least 1 lesson before submitting for review.", "error");
      return;
    }

    // Verify enrollment & learning credentials
    try {
      const skillCheck = await api.validateLearnedSkillForCourse(activePid, courseTitle, courseLevel);
      if (!skillCheck.isValid) {
        // Purge from draft state immediately
        setDraftCourses(prev => prev.filter(d => (d.id || d.course_id) !== targetId));

        alert(skillCheck.message);
        showToast(skillCheck.message, "error");
        if (isViewContentModalOpen) {
          handleCloseViewContent();
        }
        await loadContributions(true);
        return;
      }
    } catch (e) {}

    const confirmed = window.confirm(
      isExpert
        ? "Are you sure you want to submit this course for Admin Review?\n\nAs a certified Expert / Contributor, your course will be reviewed directly by the SkillChain Administrator."
        : "Are you sure you want to submit this course for Community Peer Review?\n\nAs a Newbie Learner, your course lessons will be reviewed by qualified instructors in this skill category (70% approval required to publish to SkillHub)."
    );
    if (!confirmed) return;

    const authorName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.email || 'Learner')));

    try {
      const res = await api.submitCourseForReview(targetId, {
        title: courseTitle,
        level: courseLevel,
        lessons: lessonsList,
        exam: viewingExam || targetCourse?.exam || draftItem?.exam || null,
        instructorName: authorName,
        instructorEmail: user?.email || '',
        participantId: activePid
      });
      showToast(res?.message || (isExpert ? "Course submitted for Admin review successfully!" : "Course submitted for Peer review successfully!"), "success");
      if (isViewContentModalOpen) {
        handleCloseViewContent();
      }
      await loadContributions();
    } catch (err) {
      showToast(err.message || "Failed to submit course for review.", "error");
    }
  };

  // ==========================================
  // DELETE DRAFT COURSE
  // ==========================================
  const handleDeleteDraft = async (courseId) => {
    const targetId = courseId || activeViewingCourse?.id || activeViewingCourse?.course_id;
    if (!targetId) return;

    const confirmed = window.confirm("Are you sure you want to delete this draft course? All draft lessons will be permanently removed.");
    if (!confirmed) return;

    try {
      await api.deleteDraftCourse(targetId);
      showToast("Draft course deleted successfully.", "success");
      if (isViewContentModalOpen && (activeViewingCourse?.id === targetId || activeViewingCourse?.course_id === targetId)) {
        handleCloseViewContent();
      }
      await loadContributions();
    } catch (err) {
      showToast(err.message || "Failed to delete draft.", "error");
    }
  };

  // ==========================================
  // ADD NEW COURSE LOGIC
  // ==========================================
  const handleOpenAddCourse = () => {
    if (isInstructorRestricted) {
      alert("Your instructor privileges have been suspended due to low ratings. You cannot create new courses.");
      return;
    }
    setIsAddCourseModalOpen(true);
    setHasExam(true);
    setExamUrl('');
    setExamDuration('30');
    setLessons([
      { title: 'Introduction to Architecture & Setup', url: 'https://skillchain.com/lessons/intro', duration: 45 }
    ]);
  };

  const handleCloseAddCourse = () => {
    setIsAddCourseModalOpen(false);
    setNewCourseTitle('');
    setNewCourseLevel('');
    setHasExam(true);
    setExamUrl('');
    setExamDuration('30');
    setLessons([{ title: '', url: '', duration: 45 }]);
  };

  const handleAddLessonField = () => {
    setLessons(prev => [
      ...prev,
      { title: '', url: '', duration: 45 }
    ]);
  };

  const handleRemoveLessonField = (index) => {
    if (lessons.length === 1) {
      alert("A course must have at least one lesson.");
      return;
    }
    setLessons(prev => prev.filter((_, i) => i !== index));
  };

  const handleLessonChange = (index, field, value) => {
    setLessons(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveCourse = async (isDirectSubmit = false) => {
    if (!newCourseTitle.trim() || !newCourseLevel) {
      alert("Please enter a course title and select a difficulty level.");
      return;
    }

    const invalidLesson = lessons.find(l => !l.title.trim());
    if (invalidLesson) {
      alert("Please make sure all added lessons have a title.");
      return;
    }

    // Newbie skill certification / learned courses verification check
    try {
      const skillCheck = await api.validateLearnedSkillForCourse(activePid, newCourseTitle.trim(), newCourseLevel);
      if (!skillCheck.isValid) {
        alert(skillCheck.message);
        showToast(skillCheck.message, "error");
        handleCloseAddCourse();
        return;
      }
    } catch (e) {}

    if (isDirectSubmit) {
      const confirmed = window.confirm(
        isExpert
          ? "Are you sure you want to submit this course for Admin Review?\n\nAs a certified Expert / Contributor, your course will be reviewed directly by the SkillChain Administrator."
          : "Are you sure you want to submit this course for Community Peer Review?\n\nAs a Newbie Learner, your course lessons will be reviewed by qualified instructors in this skill category (70% approval required)."
      );
      if (!confirmed) return;
    }

    const authorName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.email || 'Learner')));

    try {
      const res = await api.createCourse({
        title: newCourseTitle.trim(),
        level: newCourseLevel,
        participantId: activePid,
        instructorName: authorName,
        instructorEmail: user?.email || '',
        status: isDirectSubmit ? (isNewbie ? "Peer_Review" : "Pending") : "Draft",
        submitDirectly: isDirectSubmit,
        lessons: lessons,
        hasExam: hasExam,
        exam: hasExam ? { url: examUrl.trim(), exam_url: examUrl.trim(), duration: Number(examDuration) || 30, exam_duration: Number(examDuration) || 30 } : null,
        examUrl: examUrl.trim(),
        examDuration: Number(examDuration) || 30
      });

      if (!res.success || res.blocked) {
        alert(res.message || "Cannot create course without learning certification.");
        showToast(res.message || "Failed to create course.", "error");
        handleCloseAddCourse();
        return;
      }
      
      const msg = isDirectSubmit
        ? (res?.message || (isExpert ? `Course "${newCourseTitle}" submitted directly to Admin for approval!` : `Course "${newCourseTitle}" submitted for community peer review!`))
        : `Draft course "${newCourseTitle}" created! You can now add more lessons and build the exam over time.`;
      
      showToast(msg, 'success');
      handleCloseAddCourse();
      loadContributions();
    } catch (err) {
      alert(err.message || "Failed to create course.");
    }
  };

  return (
    <div className="contribution-container">
      
      {/* Toast Notification */}
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

      {/* ---------- 1. "VIEW CONTENT / CURRICULUM" MODAL ---------- */}
      {isViewContentModalOpen && activeViewingCourse && (
        <div className="cont-modal-overlay">
          <div className="cont-modal cont-viewer-modal">
            <button className="cont-modal-close" onClick={handleCloseViewContent}>
              <X size={22} />
            </button>
            
            {/* Header */}
            <div className="cont-viewer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#f8fafc' }}>
                  {activeViewingCourse.title || activeViewingCourse.course_title}
                </h2>
                <span className="cont-level-badge">{activeViewingCourse.level || activeViewingCourse.course_level || 'Intermediate'}</span>
                
                {isCurrentCourseDraft ? (
                  <span className="cont-status-badge" style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6', color: '#c4b5fd' }}>
                    Draft • In Preparation
                  </span>
                ) : (activeViewingCourse.status || '').toLowerCase() === 'pending' ? (
                  <span className="cont-status-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fbbf24' }}>
                    Awaiting Admin Approval
                  </span>
                ) : (
                  <span className="cont-status-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#4ade80' }}>
                    Live on SkillHub
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#94a3b8', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                <span>Course ID: <strong>{activeViewingCourse.id || activeViewingCourse.course_id}</strong></span>
                <span>•</span>
                <span>Total Lessons: <strong>{viewingLessons.length}</strong></span>
                <span>•</span>
                <span>Price: <strong>{activeViewingCourse.price || activeViewingCourse.charge || 500} Credits</strong></span>
              </div>
            </div>

            {/* Body */}
            <div className="cont-viewer-body">
              {/* Attached Exam Card */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={13} /> Attached Certification Exam
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>
                    {viewingExam?.questions?.length ? `${viewingExam.questions.length} Interactive Questions Included` : '30-Minute Final Assessment (70% Passing Threshold)'}
                  </div>
                </div>

                {isCurrentCourseDraft && (
                  <button
                    type="button"
                    onClick={handleOpenEditExam}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 14px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={13} /> Configure Exam &amp; Questions
                  </button>
                )}
              </div>

              {/* Lessons Header & Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} color="#8b5cf6" /> Lessons Curriculum ({viewingLessons.length})
                </h4>
                
                {isCurrentCourseDraft && (
                  <button
                    type="button"
                    onClick={() => setIsAddingLessonInline(prev => !prev)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      background: isAddingLessonInline ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                      border: isAddingLessonInline ? '1px solid #ef4444' : '1px solid #8b5cf6',
                      color: isAddingLessonInline ? '#fca5a5' : '#c4b5fd',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isAddingLessonInline ? <X size={14} /> : <Plus size={14} />}
                    {isAddingLessonInline ? 'Cancel' : 'Add Lesson'}
                  </button>
                )}
              </div>

              {/* Inline Add Lesson Form (DRAFT ONLY) */}
              {isCurrentCourseDraft && isAddingLessonInline && (
                <div style={{
                  background: '#0f172a',
                  border: '1px solid #8b5cf6',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '16px',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#c4b5fd', fontSize: '0.88rem' }}>Add New Lesson to Draft Course</h5>
                  
                  <div className="cont-form-group" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.78rem' }}>Lesson Title <span className="cont-required">*</span></label>
                    <input
                      type="text"
                      className="cont-form-input"
                      placeholder="e.g., Understanding Component Lifecycle"
                      value={addLessonTitle}
                      onChange={(e) => setAddLessonTitle(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '4px', color: '#94a3b8', fontWeight: 600 }}>Video / Content URL <span className="cont-required">*</span></label>
                      <input
                        type="text"
                        className="cont-form-input"
                        placeholder="e.g., https://youtube.com/watch?v=..."
                        value={addLessonUrl}
                        onChange={(e) => setAddLessonUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', display: 'block', marginBottom: '4px', color: '#94a3b8', fontWeight: 600 }}>Duration (mins) <span className="cont-required">*</span></label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        className="cont-form-input"
                        placeholder="45"
                        value={addLessonDuration}
                        onChange={(e) => setAddLessonDuration(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="cont-btn-cancel"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => setIsAddingLessonInline(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="cont-btn-ok"
                      style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                      onClick={handleSubmitInlineLesson}
                    >
                      Save Lesson
                    </button>
                  </div>
                </div>
              )}

              {/* Lessons List */}
              {isLoadingContent ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Loading lessons...</div>
              ) : viewingLessons.length > 0 ? (
                viewingLessons.map((lesson, idx) => {
                  const numStr = String(idx + 1).padStart(2, '0');
                  const duration = lesson.duration || lesson.asset_duration || 45;
                  const displayTitle = (lesson.title || lesson.content_title || lesson.asset_title || '').trim() || `Lesson ${idx + 1}`;
                  const lessonUrl = lesson.url || lesson.asset_url || lesson.content_url || "https://skillchain.com/lessons";

                  return (
                    <div className="cont-lesson-item" key={lesson.id || lesson.asset_id || idx} style={{ borderColor: lesson.status === 'ACCEPT' ? 'rgba(16, 185, 129, 0.4)' : (lesson.status === 'REJECT' ? 'rgba(239, 68, 68, 0.4)' : undefined) }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div className="cont-lesson-num" style={{ background: lesson.status === 'ACCEPT' ? '#10b981' : (lesson.status === 'REJECT' ? '#ef4444' : undefined) }}>
                          {numStr}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {displayTitle}
                            </span>
                            {lesson.status === 'ACCEPT' && (
                              <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid #10b981', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                ✓ Peer Approved (Preserved)
                              </span>
                            )}
                            {lesson.status === 'REJECT' && (
                              <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid #ef4444', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                ⚠️ Rejected by Peer (Edit/Replace)
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px' }}>
                            <Clock size={12} /> {duration} mins
                            {lesson.reviewedBy && <span>• Reviewed by: <strong style={{ color: '#c084fc' }}>{lesson.reviewedBy}</strong></span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="cont-lesson-preview-btn"
                          onClick={() => window.open(lessonUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <Play size={13} /> Preview
                        </button>
                        
                        {isCurrentCourseDraft && (
                          <button
                            type="button"
                            className="cont-lesson-del-btn"
                            onClick={() => handleDeleteLesson(lesson, idx)}
                            title="Delete Lesson from Draft"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <BookOpen size={30} color="#8b5cf6" style={{ opacity: 0.8, marginBottom: '6px' }} />
                  <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>No lessons added to this draft yet. Click "+ Add Lesson" to start building.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="cont-modal-footer" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {isCurrentCourseDraft && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Tip: You can add lessons over time before final submission.
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="cont-btn-cancel" onClick={handleCloseViewContent}>Close</button>
                {isCurrentCourseDraft && (
                  <button 
                    className="cont-btn-ok" 
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleSubmitCourseForReview(activeViewingCourse?.id || activeViewingCourse?.course_id)}
                  >
                    <Send size={15} /> Submit Course for Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 2. "EDIT EXAM" SUB-MODAL (DRAFT ONLY) ---------- */}
      {isEditExamModalOpen && (
        <div className="cont-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="cont-modal" style={{ maxWidth: '640px', width: '92%', maxHeight: '88vh', overflowY: 'auto' }}>
            <button className="cont-modal-close" onClick={handleCloseEditExam}>
              <X size={22} />
            </button>
            <h2>Course Certification Exam Builder</h2>
            <p>Students who score &ge;70% on this exam will automatically receive the official <strong>"Completion of {activeViewingCourse?.title || 'Course'}"</strong> certificate in their Profile.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="cont-form-group" style={{ margin: 0 }}>
                <label>Exam Duration (Minutes) <span className="cont-required">*</span></label>
                <input
                  type="number"
                  min="5"
                  max="240"
                  className="cont-form-input"
                  placeholder="30"
                  value={editExamDuration}
                  onChange={(e) => setEditExamDuration(e.target.value)}
                />
              </div>

              <div className="cont-form-group" style={{ margin: 0 }}>
                <label>Passing Threshold</label>
                <input
                  type="text"
                  className="cont-form-input"
                  value="70% Passing Mark"
                  disabled
                  style={{ opacity: 0.8, cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Exam Questions Section */}
            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(139, 92, 246, 0.2)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>
                  Multiple Choice Questions ({examQuestions.length})
                </h4>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: '#c4b5fd',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={14} /> Add Question
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {examQuestions.map((q, qIdx) => (
                  <div key={q.id || qIdx} style={{
                    background: '#0b1120',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '10px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.88rem' }}>Question {qIdx + 1}</span>
                      {examQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.78rem'
                          }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                    </div>

                    <div className="cont-form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.78rem' }}>Question Statement <span className="cont-required">*</span></label>
                      <input
                        type="text"
                        className="cont-form-input"
                        placeholder="e.g., Which data structure provides fastest random lookup?"
                        value={q.question}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                      />
                    </div>

                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      Options (Select the correct radio button):
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                        <div key={optIdx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: q.correct === optIdx ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${q.correct === optIdx ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '8px',
                          padding: '6px 10px'
                        }}>
                          <input
                            type="radio"
                            name={`correct_opt_${qIdx}`}
                            checked={q.correct === optIdx}
                            onChange={() => handleCorrectOptionChange(qIdx, optIdx)}
                            style={{ cursor: 'pointer', accentColor: '#10b981' }}
                          />
                          <input
                            type="text"
                            className="cont-form-input"
                            style={{ padding: '4px 8px', fontSize: '0.82rem', border: 'none', background: 'transparent' }}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            value={opt}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cont-modal-footer" style={{ marginTop: '20px' }}>
              <button className="cont-btn-cancel" onClick={handleCloseEditExam}>Cancel</button>
              <button className="cont-btn-ok" onClick={handleSubmitEditExam}>Save Exam Questions</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 3. "ADD NEW COURSE" MODAL ---------- */}
      {isAddCourseModalOpen && (
        <div className="cont-modal-overlay">
          <div className="cont-modal" style={{ maxWidth: '640px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="cont-modal-close" onClick={handleCloseAddCourse}>
              <X size={24} />
            </button>
            <h2>Create New Course</h2>
            <p>Save as a draft to add lessons and exams over time, or submit immediately once completed.</p>
            
            <div className="cont-form-group">
              <label>Course Title <span className="cont-required">*</span></label>
              <input 
                type="text" 
                className="cont-form-input" 
                placeholder="e.g. Master React & Node.js Architecture"
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
              />
            </div>

            <div className="cont-form-group">
              <label>Difficulty Level <span className="cont-required">*</span></label>
              <select 
                className="cont-form-select"
                value={newCourseLevel}
                onChange={(e) => setNewCourseLevel(e.target.value)}
              >
                <option value="" disabled className="cont-placeholder-option">--Select Level--</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            {/* LESSONS BUILDER */}
            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ margin: 0, fontWeight: 'bold', color: '#f8fafc' }}>
                  Initial Lessons ({lessons.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddLessonField}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid #8b5cf6',
                    color: '#c4b5fd',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Add Another Lesson
                </button>
              </div>

              {lessons.map((lesson, idx) => (
                <div key={idx} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Lesson #{idx + 1}</span>
                    {lessons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLessonField(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    className="cont-form-input"
                    placeholder="Lesson Title (e.g. Setting up Environment)"
                    value={lesson.title}
                    onChange={(e) => handleLessonChange(idx, 'title', e.target.value)}
                    style={{ marginBottom: '8px' }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="cont-form-input"
                      placeholder="Content / Video URL"
                      value={lesson.url}
                      onChange={(e) => handleLessonChange(idx, 'url', e.target.value)}
                    />
                    <input
                      type="number"
                      className="cont-form-input"
                      placeholder="Duration (mins)"
                      value={lesson.duration}
                      onChange={(e) => handleLessonChange(idx, 'duration', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ATTACH EXAM SECTION */}
            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ margin: 0, fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Course Exam / Assessment</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={hasExam}
                    onChange={(e) => setHasExam(e.target.checked)}
                    style={{ accentColor: '#8b5cf6', width: '16px', height: '16px' }}
                  />
                  <span>Attach Exam</span>
                </label>
              </div>

              {hasExam && (
                <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    You can also build detailed multiple choice questions later while in Draft mode.
                  </p>
                  
                  <div className="cont-form-group" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.82rem' }}>Exam / Assessment Link (Optional)</label>
                    <input
                      type="text"
                      className="cont-form-input"
                      placeholder="e.g. https://forms.gle/exam-link or custom URL"
                      value={examUrl}
                      onChange={(e) => setExamUrl(e.target.value)}
                    />
                  </div>

                  <div className="cont-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.82rem' }}>Exam Duration (Minutes) <span className="cont-required">*</span></label>
                    <input
                      type="number"
                      min="5"
                      max="180"
                      className="cont-form-input"
                      placeholder="e.g. 30, 45, 60"
                      value={examDuration}
                      onChange={(e) => setExamDuration(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="cont-modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button className="cont-btn-cancel" onClick={handleCloseAddCourse}>Cancel</button>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="cont-btn-ok" 
                  style={{ background: 'rgba(139, 92, 246, 0.25)', border: '1px solid #8b5cf6', color: '#c4b5fd' }}
                  onClick={() => handleSaveCourse(false)}
                >
                  Save as Draft (Add Lessons Later)
                </button>
                <button 
                  type="button" 
                  className="cont-btn-ok" 
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => handleSaveCourse(true)}
                >
                  <Send size={14} /> Submit for Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN PAGE CONTENT */}
      {/* ========================================================= */}
      {isInstructorRestricted && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fca5a5'
        }}>
          <AlertCircle size={24} color="#ef4444" />
          <div>
            <strong style={{ color: '#ffffff', display: 'block', marginBottom: '2px' }}>Instructor Privileges Suspended</strong>
            Your instructor privileges have been restricted due to low ratings. You cannot create new courses, but you can still access and learn your enrolled courses.
          </div>
        </div>
      )}

      <div className="cont-header-section">
        <div className="cont-header-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2>My Contributions</h2>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: '20px',
              background: isExpert ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
              border: isExpert ? '1px solid #10b981' : '1px solid #8b5cf6',
              color: isExpert ? '#4ade80' : '#c4b5fd'
            }}>
              {isInstructorRestricted ? 'Restricted Instructor' : (isExpert ? 'Expert Contributor' : 'Newbie Contributor')}
            </span>
          </div>
          <p>
            {isExpert 
              ? 'As an Expert, your submitted courses go directly to Admin Review.' 
              : 'As a Newbie, your submitted courses go to Community Peer Review (70% approval needed).'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="cont-refresh-btn" 
            onClick={() => loadContributions(false)}
            title="Refresh Contributions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: 'rgba(51, 65, 85, 0.8)',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RotateCw size={16} className={isRefreshing ? 'animate-spin' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          {!isInstructorRestricted && (
            <button className="cont-add-course-btn" onClick={handleOpenAddCourse}>
              <Plus size={18} /> Add New Course
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. DRAFT / IN-PREPARATION COURSES (EDITABLE) */}
      {/* ========================================================= */}
      <div className="cont-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="cont-section-title" style={{ color: '#c084fc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={16} /> Courses in Preparation / Drafts ({draftCourses.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Add lessons &amp; configure exams at your own pace before submitting
          </span>
        </div>
        
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading courses in preparation...</p>
        ) : draftCourses.length > 0 ? (
          draftCourses.map((course) => (
            <div className="cont-card" key={course.id || course.course_id} style={{ border: '1px solid rgba(139, 92, 246, 0.35)', background: 'rgba(15, 23, 42, 0.6)' }}>
              
              <div className="cont-card-top">
                <div>
                  <h4 className="cont-card-title">{course.title || course.course_title}</h4>
                  
                  <div className="cont-badges-wrapper">
                    <div className="cont-level-badge">{course.level || course.course_level || 'Intermediate'}</div>
                    {course.status === 'Peer_Review_Rejected' ? (
                      <div className="cont-status-badge" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5' }}>
                        Revisions Required ({course.lastReviewScore || 33}% &lt; 70%)
                      </div>
                    ) : (
                      <div className="cont-status-badge" style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6', color: '#c4b5fd' }}>
                        Draft • In Preparation
                      </div>
                    )}
                    {course.exam ? (
                      <div className="cont-level-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        Exam Attached
                      </div>
                    ) : (
                      <div className="cont-level-badge" style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' }}>
                        No Exam Yet
                      </div>
                    )}
                  </div>

                  {course.status === 'Peer_Review_Rejected' && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} color="#ef4444" />
                      <span>Peer review rating was <strong>{course.lastReviewScore || 33}%</strong> (&lt; 70% threshold). Please revise rejected lessons. (Approved lessons are preserved!)</span>
                    </div>
                  )}
                </div>

                <div className="cont-lesson-count">
                  Lessons added : <strong>{course.lessons ? course.lessons.length : (course.totalLessons || 0)}</strong>
                </div>
              </div>

              <div className="cont-card-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#a855f7" /> Ready to publish? Click Submit when lessons and exam are completed.
                </div>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    className="cont-mark-completed-btn"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleDeleteDraft(course.id || course.course_id)}
                    title="Delete this draft course"
                  >
                    <Trash2 size={14} /> Delete Draft
                  </button>
                  <button 
                    className="cont-mark-completed-btn"
                    style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: '#8b5cf6', color: '#c4b5fd', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleOpenViewContent(course)}
                  >
                    <Plus size={14} /> Add / Edit Curriculum &amp; Exam
                  </button>
                  <button 
                    className="cont-mark-completed-btn"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleSubmitCourseForReview(course.id || course.course_id)}
                  >
                    <Send size={14} /> Submit Course for Review
                  </button>
                </div>
              </div>

            </div>
          ))
        ) : (
          <div style={{ padding: '20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '10px', border: '1px dashed rgba(139, 92, 246, 0.3)', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', margin: '0 0 8px 0', fontSize: '0.9rem' }}>You have no draft courses in preparation.</p>
            <button 
              className="cont-btn-ok" 
              style={{ padding: '6px 16px', fontSize: '0.82rem', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid #8b5cf6', color: '#c4b5fd' }}
              onClick={handleOpenAddCourse}
            >
              + Start a New Course Draft
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. PENDING REVIEW */}
      {/* ========================================================= */}
      {pendingCourses.length > 0 && (
        <div className="cont-section" style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="cont-section-title" style={{ color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} /> Courses in Review ({pendingCourses.length})
            </h3>
          </div>
          
          {pendingCourses.map((course) => {
            const isPeer = (course.status || '').toLowerCase().includes('peer');
            const lessons = course.lessons || [];
            const reviewedCount = lessons.filter(l => l.status === 'ACCEPT' || l.status === 'REJECT').length;
            const acceptedCount = lessons.filter(l => l.status === 'ACCEPT').length;
            const approvalPct = lessons.length > 0 ? Math.round((acceptedCount / lessons.length) * 100) : 0;

            return (
              <div className="cont-card" key={course.id || course.course_id} style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                <div className="cont-card-top">
                  <div>
                    <h4 className="cont-card-title">{course.title || course.course_title}</h4>
                    
                    <div className="cont-badges-wrapper">
                      <div className="cont-level-badge">{course.level || course.course_level}</div>
                      {isPeer ? (
                        <div className="cont-status-badge" style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8' }}>
                          Community Peer Review ({reviewedCount}/{lessons.length} Reviewed • {approvalPct}% Rating)
                        </div>
                      ) : (
                        <div className="cont-status-badge" style={{ background: '#f59e0b', color: '#fff' }}>
                          Awaiting Admin Approval
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="cont-lesson-count">
                    Total lessons : {course.lessons ? course.lessons.length : (course.totalLessons || 1)}
                  </div>
                </div>

                <div className="cont-card-actions">
                  <button 
                    className="cont-mark-completed-btn"
                    style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => handleOpenViewContent(course)}
                  >
                    <BookOpen size={14} /> View Submitted Lessons
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. APPROVED & PUBLISHED COURSES */}
      {/* ========================================================= */}
      <div className="cont-section" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="cont-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={16} color="#10b981" /> My Approved &amp; Published Courses ({approvedCourses.length})
          </h3>
        </div>
        
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading approved courses...</p>
        ) : approvedCourses.length > 0 ? (
          approvedCourses.map((course) => (
            <div className="cont-card" key={course.id || course.course_id}>
              
              <div className="cont-card-top">
                <div>
                  <h4 className="cont-card-title">{course.title || course.course_title}</h4>
                  
                  <div className="cont-badges-wrapper">
                    <div className="cont-level-badge">{course.level || course.course_level}</div>
                    <div className="cont-status-badge" style={{ background: '#10b981', color: '#fff' }}>
                      Live on SkillHub
                    </div>
                    <div className="cont-level-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                      Price: {course.price || course.charge || 500} Credits
                    </div>
                  </div>
                </div>

                <div className="cont-lesson-count">
                  Total lessons : {course.totalLessons || (course.lessons ? course.lessons.length : 10)}
                </div>
              </div>

              <div className="cont-card-actions">
                <button 
                  className="cont-mark-completed-btn"
                  onClick={() => handleOpenViewContent(course)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <BookOpen size={14} /> View Content
                </button>
              </div>

            </div>
          ))
        ) : (
          <p style={{ color: '#64748b', fontStyle: 'italic' }}>You have not published any approved courses yet. Create a draft above and submit it for review!</p>
        )}
      </div>

    </div>
  );
};

export default Contribution;