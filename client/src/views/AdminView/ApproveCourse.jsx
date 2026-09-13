import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, BookOpen, User, X, Clock, Layers } from 'lucide-react';
import { api } from '../../services/api';
import './ApproveCourse.css';

const ApproveCourse = () => {
  const [pendingCourses, setPendingCourses] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalCourse, setModalCourse] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [creditValue, setCreditValue] = useState(500);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingRes, skillsRes] = await Promise.all([
        api.getCourses({ status: 'Pending' }),
        api.getSkills()
      ]);
      setPendingCourses(pendingRes?.courses || []);
      setSkills(skillsRes?.skills || []);
    } catch {
      setPendingCourses([]);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCatalogUpdate = () => {
      loadData();
    };

    window.addEventListener('skillchain-catalog-updated', handleCatalogUpdate);
    window.addEventListener('skillchain-course-approved', handleCatalogUpdate);
    window.addEventListener('focus', handleCatalogUpdate);

    return () => {
      window.removeEventListener('skillchain-catalog-updated', handleCatalogUpdate);
      window.removeEventListener('skillchain-course-approved', handleCatalogUpdate);
      window.removeEventListener('focus', handleCatalogUpdate);
    };
  }, []);

  const openApproveModal = (course) => {
    setModalCourse(course);
    setSelectedSkill(course.skillName || course.skill_name || '');
    setCreditValue(Number(course.charge || course.price) || 500);
  };

  const handleApprove = async () => {
    if (!selectedSkill) { showToast('Please select a skill category', 'error'); return; }
    if (!creditValue || Number(creditValue) <= 0) { showToast('Please enter a valid credit value', 'error'); return; }
    
    try {
      const cid = modalCourse.id || modalCourse.course_id;
      const title = modalCourse.title || modalCourse.course_title;
      const res = await api.approveCourse({ courseId: cid, title, selectedSkill, creditValue: Number(creditValue) });
      if (res && res.success) {
        setPendingCourses(prev => prev.filter(c => (c.id || c.course_id) !== cid && (c.title || c.course_title) !== title));
        showToast(res.message || `Course "${title}" approved with ${creditValue} credits!`);
      } else {
        showToast(res?.message || 'Failed to approve course', 'error');
      }
    } catch (err) {
      showToast(`Approval error: ${err.message}`, 'error');
    }
    setModalCourse(null);
  };

  const handleReject = async (course) => {
    const cid = course.id || course.course_id;
    const title = course.title || course.course_title;
    try {
      await api.rejectCourse({ courseId: cid, title, courseTitle: title });
    } catch {}
    setPendingCourses(prev => prev.filter(c => (c.id || c.course_id) !== cid && (c.title || c.course_title) !== title));
    showToast(`Course "${title}" rejected.`, 'error');
  };

  return (
    <div className="page-container">
      {toast && (
        <div className={`ac-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <h2>Course Approval</h2>
        <p>Review submitted course proposals and set credit pricing</p>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : pendingCourses.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} color="#10b981" />
          <h3>All Caught Up!</h3>
          <p>No new course proposals pending review at this time.</p>
        </div>
      ) : (
        <div className="ac-grid">
          {pendingCourses.map(course => {
            const cid = course.id || course.course_id;
            const title = course.title || course.course_title;
            const instructor = course.instructorName || course.instructor || api.resolveParticipantName(course.participant_id || course.instructorEmail, 'Instructor');

            return (
              <div className="ac-course-card" key={cid}>
                <div className="ac-card-header">
                  <div className="ac-course-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                    <Clock size={20} />
                  </div>
                  <span className="cont-status-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fbbf24', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Pending Review
                  </span>
                </div>

                <h3 className="ac-course-title">{title}</h3>

                <div className="ac-course-meta">
                  <div className="meta-row">
                    <User size={14} />
                    <span style={{ fontSize: '0.88rem' }}>Instructor: <strong>{instructor}</strong></span>
                  </div>
                  <div className="meta-row">
                    <Layers size={14} />
                    <span style={{ fontSize: '0.85rem' }}>Level: <strong>{course.level || course.course_level || 'Intermediate'}</strong></span>
                  </div>
                </div>

                <div className="ac-actions" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  <button className="btn-success" onClick={() => openApproveModal(course)}>
                    <CheckCircle size={14} /> Approve &amp; Set Price
                  </button>
                  <button className="btn-danger" onClick={() => handleReject(course)}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal with Skill and Credit Value */}
      {modalCourse && (
        <div className="modal-overlay" onClick={() => setModalCourse(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Approve Course &amp; Set Credit Value</h3>
              <button className="modal-close-btn" onClick={() => setModalCourse(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Reviewing: <strong style={{ color: 'var(--text-primary)' }}>{modalCourse.title || modalCourse.course_title}</strong>
              <br />
              Instructor: <strong style={{ color: '#38bdf8' }}>{modalCourse.instructorName || modalCourse.instructor || api.resolveParticipantName(modalCourse.participant_id || modalCourse.instructorEmail, 'Instructor')}</strong>
            </p>

            {/* Skill Selection */}
            <div className="form-group">
              <label>Select Skill Category <span style={{ color: '#f87171' }}>*</span></label>
              <select value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)}>
                <option value="">-- Choose a skill category --</option>
                {skills.map(s => (
                  <option key={s.skill_id} value={s.skill_name}>{s.skill_name} ({s.skill_tier})</option>
                ))}
              </select>
            </div>

            {/* Admin Credit Value Selection */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>
                Set Course Credit Value / Cost (e.g. 400, 500, 800, 1200) <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  min="5"
                  step="50"
                  value={creditValue}
                  onChange={e => setCreditValue(e.target.value)}
                  placeholder="Enter credit value (e.g. 500)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #475569',
                    background: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                />
                <span style={{ position: 'absolute', right: '14px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Credits
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                Learners on SkillHub must spend this amount of credits to enroll in this course.
              </p>
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn-ghost" onClick={() => setModalCourse(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleApprove}>
                <CheckCircle size={15} /> Publish with {creditValue || 500} Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproveCourse;