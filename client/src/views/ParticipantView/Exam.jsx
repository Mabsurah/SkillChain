import React, { useState, useEffect } from 'react';
import { FileText, Clock, ArrowRight, CheckCircle, XCircle, Award, AlertCircle, HelpCircle, X, Sparkles, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Exam.css';

const Exam = () => {
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || 'P001';

  const [pendingTests, setPendingTests] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [completedTests, setCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Exam Taking Modal States
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.getExams(activePid);
      if (res) {
        if (res.completed) {
          setCompletedTests(res.completed);
        }

        const resolveExamUnlock = (e) => {
          const cid = e.courseId || e.id;
          let localCompletedCount = 0;
          const finalTotal = Math.max(Number(e.totalLessons) || 1, 1);

          const savedKey = `skillchain_completed_lessons_${activePid}_${cid}`;
          const raw = localStorage.getItem(savedKey);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                localCompletedCount = parsed.length;
              }
            } catch {}
          }

          if (localCompletedCount === 0) {
            try {
              localStorage.removeItem(`skillchain_course_progress_${activePid}_${cid}`);
            } catch {}
          }

          const finalProg = finalTotal > 0 ? Math.round((localCompletedCount / finalTotal) * 100) : 0;
          const isUnlocked = finalProg >= 100 || localCompletedCount >= finalTotal || e.isCompleted;

          return {
            ...e,
            isUnlocked,
            progressPercentage: Math.min(100, finalProg),
            completedLessons: Math.min(finalTotal, localCompletedCount),
            totalLessons: finalTotal
          };
        };

        if (res.pendingList && res.pendingList.length > 0) {
          setPendingTests(res.pendingList.map(resolveExamUnlock));
        } else if (res.available && res.available.length > 0) {
          setPendingTests(res.available.filter(e => !e.isCompleted).map(resolveExamUnlock));
        } else if (res.pending) {
          setPendingTests([resolveExamUnlock(res.pending)]);
        } else {
          setPendingTests([]);
        }
      }
    } catch (err) {
      console.warn("Exams load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [activePid]);

  const handleStartExam = (test) => {
    setActiveExam(test);
    setSelectedAnswers({});
    setExamResult(null);
    setIsExamModalOpen(true);
  };

  const handleSelectOption = (questionId, optionIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitExam = async () => {
    if (!activeExam) return;
    const questions = activeExam.questions || [];
    if (questions.length === 0) {
      alert("No questions available for this exam.");
      return;
    }

    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < questions.length) {
      if (!window.confirm(`You answered ${answeredCount} of ${questions.length} questions. Are you sure you want to submit now?`)) {
        return;
      }
    }

    // Calculate score
    let correctCount = 0;
    questions.forEach(q => {
      const selected = selectedAnswers[q.id];
      if (selected !== undefined && selected === q.correct) {
        correctCount += 1;
      }
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    const passed = scorePercentage >= 70;

    setSubmitting(true);
    try {
      const res = await api.submitExam({
        participantId: activePid,
        examId: activeExam.id || activeExam.examId || 'EXAM_01',
        courseId: activeExam.courseId || 'C001',
        score: scorePercentage,
        courseTitle: activeExam.courseTitle || activeExam.title
      });

      const certTitle = res?.certificateTitle || `Completion of ${(activeExam.courseTitle || activeExam.title || '').replace(/^Completion of\s+/i, '')}`;

      setExamResult({
        score: scorePercentage,
        passed,
        correctCount,
        totalQuestions: questions.length,
        creditsAwarded: passed ? 50 : 0,
        certificateTitle: certTitle
      });

      // Refresh history & remove from pending
      setCompletedTests(prev => [
        {
          id: prev.length + 1,
          examId: activeExam.id || activeExam.examId,
          courseId: activeExam.courseId,
          title: activeExam.title,
          duration: activeExam.duration || "30 mins",
          score: scorePercentage,
          attemptDate: "Just now"
        },
        ...prev
      ]);

      if (passed) {
        setPendingTests(prev => prev.filter(t => (t.courseId || t.id) !== (activeExam.courseId || activeExam.id)));
        showToast(`Congratulations! You passed with ${scorePercentage}%! Certificate "${certTitle}" added to your profile (+50 credits).`, 'success');
      } else {
        showToast(`Assessment completed: ${scorePercentage}%. Retake anytime to earn credits.`, 'error');
      }
    } catch (err) {
      setExamResult({
        score: scorePercentage,
        passed,
        correctCount,
        totalQuestions: questions.length,
        creditsAwarded: passed ? 50 : 0,
        certificateTitle: `Completion of ${(activeExam.courseTitle || activeExam.title || '').replace(/^Completion of\s+/i, '')}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exam-page-container">
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

      {/* Header */}
      <div className="exam-header-section">
        <div className="exam-header-left">
          <h2>Exams &amp; Certifications</h2>
          <p>Take competency assessments for your enrolled courses, earn bonus reward credits (+50 credits on passing), and verify skill proficiency.</p>
        </div>
        <div className="exam-header-icon">
          <FileText size={22} />
        </div>
      </div>

      {/* Scheduled Assessments for Enrolled Courses */}
      <div className="pending-section">
        <h3 className="section-subtitle" style={{ color: '#f8fafc', marginBottom: '14px', fontSize: '1.1rem', fontWeight: 600 }}>
          Available Enrolled Course Assessments
        </h3>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading assessments for your enrolled courses...</p>
        ) : pendingTests.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pendingTests.map((test) => (
              <div 
                key={test.id || test.examId || test.courseId} 
                className="pending-card" 
                style={{
                  background: 'linear-gradient(135deg, rgba(26, 27, 36, 0.9) 0%, rgba(38, 40, 58, 0.7) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '22px 24px',
                  borderRadius: '14px'
                }}
              >
                <div className="pending-info" style={{ flex: 1, paddingRight: '20px' }}>
                  <div className="pending-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      <Sparkles size={14} color="#f59e0b" /> Enrolled Course Assessment
                    </span>
                    {test.level && (
                      <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {test.level}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="pending-title" style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#f8fafc' }}>
                    {test.title || `${test.courseTitle} - Assessment`}
                  </h3>
                  
                  <div className="duration-info" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#94a3b8', fontSize: '0.88rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} className="duration-icon" color="#8b5cf6" />
                      Duration: {test.duration || `${test.durationMinutes || 30} minutes`}
                    </span>
                    <span>•</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      Passing Mark: 70% (+50 Reward Credits)
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {test.isUnlocked ? (
                    <button className="take-test-btn" onClick={() => handleStartExam(test)}>
                      Take Exam <ArrowRight size={18} />
                    </button>
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <button 
                        className="take-test-btn" 
                        disabled 
                        style={{ background: 'rgba(100, 116, 139, 0.25)', borderColor: 'rgba(100, 116, 139, 0.4)', color: '#94a3b8', cursor: 'not-allowed' }}
                      >
                        Locked 🔒
                      </button>
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px' }}>
                        Progress: {test.progressPercentage || 0}% ({test.completedLessons || 0}/{test.totalLessons || 1} lessons)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: '#131b2e',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            padding: '32px 20px',
            textAlign: 'center'
          }}>
            <BookOpen size={36} color="#8b5cf6" style={{ marginBottom: '10px', opacity: 0.8 }} />
            <h4 style={{ color: '#f8fafc', marginBottom: '6px', fontSize: '1.05rem', fontWeight: 600 }}>
              No Pending Assessments
            </h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
              You have completed all assessments for your enrolled courses, or have not enrolled in any courses yet. Enroll in courses from SkillHub to access certification assessments and earn reward credits!
            </p>
          </div>
        )}
      </div>

      {/* Interactive Exam Modal */}
      {isExamModalOpen && (
        <div className="exam-modal-overlay">
          <div className="exam-modal-container">
            <button
              onClick={() => setIsExamModalOpen(false)}
              className="exam-modal-close-btn"
              title="Close Assessment"
            >
              <X size={22} />
            </button>

            {!examResult ? (
              <>
                {/* Modal Header */}
                <div className="exam-modal-header">
                  <div className="exam-modal-pill">
                    <Sparkles size={14} /> Official Certification Exam
                  </div>
                  <h2 className="exam-modal-title">{activeExam?.title || "Course Competency Assessment"}</h2>
                  <p className="exam-modal-desc">
                    Answer all multiple choice questions below. Score at least <strong>70%</strong> to receive an official Certificate of Completion and earn <strong>+50 reward credits</strong>.
                  </p>

                  {/* Progress bar */}
                  <div className="exam-progress-bar-container">
                    <div className="exam-progress-info">
                      <span>Progress</span>
                      <span>
                        {Object.keys(selectedAnswers).length} of {(activeExam?.questions || []).length} answered
                      </span>
                    </div>
                    <div className="exam-progress-track">
                      <div
                        className="exam-progress-fill"
                        style={{
                          width: `${((Object.keys(selectedAnswers).length) / Math.max((activeExam?.questions || []).length, 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div className="mcq-questions-list">
                  {(activeExam?.questions || []).map((q, idx) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const isAnswered = selectedAnswers[q.id] !== undefined;

                    return (
                      <div
                        key={q.id}
                        className={`mcq-question-card ${isAnswered ? 'answered' : ''}`}
                      >
                        <div className="mcq-question-header">
                          <span className="mcq-question-number">Question {idx + 1}</span>
                          <span className="mcq-question-text">{q.question}</span>
                        </div>

                        <div className="mcq-options-grid">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedAnswers[q.id] === optIdx;
                            const optionLetter = letters[optIdx] || String.fromCharCode(65 + optIdx);

                            return (
                              <div
                                key={optIdx}
                                onClick={() => handleSelectOption(q.id, optIdx)}
                                className={`mcq-option-row ${isSelected ? 'selected' : ''}`}
                              >
                                <div className={`mcq-option-badge ${isSelected ? 'selected' : ''}`}>
                                  {optionLetter}
                                </div>
                                <div className="mcq-option-content">
                                  {opt}
                                </div>
                                <div className={`mcq-radio-indicator ${isSelected ? 'selected' : ''}`}>
                                  {isSelected && <div className="mcq-radio-inner-dot" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Controls */}
                <div className="exam-modal-footer">
                  <button
                    type="button"
                    onClick={() => setIsExamModalOpen(false)}
                    className="exam-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    disabled={submitting}
                    className="exam-btn-primary"
                  >
                    {submitting ? 'Submitting & Grading...' : 'Submit Answers & Finish'}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            ) : (
              /* Result Card */
              <div className="exam-result-container">
                <div className={`exam-result-icon-circle ${examResult.passed ? 'passed' : 'failed'}`}>
                  {examResult.passed ? <CheckCircle size={48} /> : <XCircle size={48} />}
                </div>

                <h2 className="exam-result-title">
                  {examResult.passed ? "Assessment Passed!" : "Assessment Needs Review"}
                </h2>

                <p className="exam-result-summary">
                  {examResult.passed
                    ? `Outstanding performance! You answered ${examResult.correctCount} out of ${examResult.totalQuestions} questions correctly.`
                    : `You answered ${examResult.correctCount} out of ${examResult.totalQuestions} questions correctly. Passing mark is 70%. You can review the material and retake the test at any time.`}
                </p>

                {examResult.passed && (
                  <div className="exam-cert-award-banner">
                    <Award size={36} color="#34d399" style={{ flexShrink: 0 }} />
                    <div>
                      <div className="award-heading">Certificate Automatically Issued!</div>
                      <div className="award-sub">
                        "{examResult.certificateTitle || 'Course Completion Certificate'}" is now recorded and verified in your Profile.
                      </div>
                    </div>
                  </div>
                )}

                <div className="exam-metrics-row">
                  <div className="exam-metric-box">
                    <div className="metric-label">Final Score</div>
                    <div className={`metric-value ${examResult.passed ? 'passed' : 'failed'}`}>
                      {examResult.score}%
                    </div>
                  </div>

                  <div className="metric-divider" />

                  <div className="exam-metric-box">
                    <div className="metric-label">Reward Credits</div>
                    <div className="metric-value credits">
                      +{examResult.creditsAwarded} Credits
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button
                    onClick={() => setIsExamModalOpen(false)}
                    className="exam-btn-primary"
                    style={{ padding: '12px 32px' }}
                  >
                    Close &amp; Return to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completed Tests Section */}
      <div className="completed-section">
        <h3 className="section-subtitle">Completed Assessment History</h3>

        <div className="completed-list">
          {completedTests.length > 0 ? (
            completedTests.map((test) => {
              const isPassed = (test.score || 0) >= 70;
              return (
                <div className="completed-card" key={test.id || test.examId || Math.random()}>
                  {/* Left Side: Title & Duration */}
                  <div className="completed-info">
                    <h3>{test.title}</h3>
                    <div className="duration-info">
                      <span>Duration: {test.duration || '30 mins'} • Completed on: {test.attemptDate || 'Recently'}</span>
                    </div>
                  </div>

                  {/* Right Side: Score & Badge */}
                  <div className="completed-metrics">
                    <div className="score-text">
                      Achieved <span style={{ color: isPassed ? '#10b981' : '#ef4444', fontWeight: 700 }}>{test.score}%</span> marks
                    </div>

                    <div className="completed-badge" style={{
                      background: isPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isPassed ? '#34d399' : '#f87171',
                      border: `1px solid ${isPassed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}>
                      {isPassed ? 'Passed (+50 Credits)' : 'Needs Review'} {isPassed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              background: '#131b2e',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '36px 20px',
              textAlign: 'center'
            }}>
              <Award size={36} color="#8b5cf6" style={{ marginBottom: '10px', opacity: 0.8 }} />
              <h4 style={{ color: '#f8fafc', marginBottom: '6px', fontSize: '1.05rem', fontWeight: 600 }}>
                No Completed Assessments Yet
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
                Complete your scheduled competency assessment above to earn official certification badges and reward credits. Your completed assessment results will appear here one by one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Exam;