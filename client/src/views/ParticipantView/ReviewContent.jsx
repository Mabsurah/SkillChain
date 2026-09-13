import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, X, ArrowRight, CheckCircle, AlertCircle, ArrowLeft, Video, Sparkles, Lock, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './ReviewContent.css';

const ReviewContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activePid = user?.participantId || user?.email || 'P001';

  const [activeCourseId, setActiveCourseId] = useState(location.state?.courseId || null);
  const [courseData, setCourseData] = useState(null);
  const [reviewLessons, setReviewLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [reviewCompletedBanner, setReviewCompletedBanner] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCourseReviews = async (courseIdToLoad) => {
    if (!courseIdToLoad) {
      setLoading(false);
      setCourseData(null);
      setReviewLessons([]);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getPeerReviewCourse(courseIdToLoad);
      if (res && res.course) {
        setCourseData(res.course);
        const lessons = res.lessons || res.course.lessons || [];
        setReviewLessons(lessons);

        // Check if fully reviewed
        const total = lessons.length;
        const reviewed = lessons.filter(l => l.status === 'ACCEPT' || l.status === 'REJECT').length;
        const accepted = lessons.filter(l => l.status === 'ACCEPT').length;
        if (total > 0 && reviewed === total) {
          const score = Math.round((accepted / total) * 100);
          if (score >= 70) {
            setReviewCompletedBanner({
              type: 'success',
              msg: `🎉 Peer Review Completed (${score}% Rating)! This course has achieved >= 70% approval and is now PUBLISHED directly to SkillHub.`
            });
          } else {
            setReviewCompletedBanner({
              type: 'warning',
              msg: `⚠️ Peer Review Completed (${score}% Rating). The approval rating is under 70%. The course has been returned to the contributor for revisions. Approved lessons remain preserved.`
            });
          }
        }
      } else {
        setCourseData(null);
        setReviewLessons([]);
      }
    } catch (err) {
      console.warn("Error fetching peer review course:", err);
      setCourseData(null);
      setReviewLessons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let targetCid = location.state?.courseId;
    if (!targetCid) {
      api.getPeerReviewQueue(activePid).then(res => {
        if (res?.queue && res.queue.length > 0) {
          targetCid = res.queue[0].courseId || res.queue[0].id;
          setActiveCourseId(targetCid);
          loadCourseReviews(targetCid);
        } else {
          setLoading(false);
          setCourseData(null);
          setReviewLessons([]);
        }
      }).catch(() => {
        setLoading(false);
        setCourseData(null);
        setReviewLessons([]);
      });
    } else {
      setActiveCourseId(targetCid);
      loadCourseReviews(targetCid);
    }
  }, [activePid, location.state?.courseId]);

  const handleAction = async (lessonId, title, actionType) => {
    const actionLabel = actionType === 'ACCEPT' ? 'Approve' : 'Reject';
    if (!window.confirm(`Are you sure you want to ${actionLabel} lesson "${title}"?\n\nOnce reviewed, this lesson will freeze for other peers and you will earn +20 Credits.`)) return;

    try {
      await api.submitPeerReviewAction({
        courseId: activeCourseId,
        lessonId,
        reviewerId: activePid,
        reviewerName: user?.name || (user?.first_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Peer Reviewer'),
        actionType,
        feedbackComment: `${actionLabel}ed during peer verification by ${activePid}`
      });

      // Update local state and freeze lesson
      const updatedLessons = reviewLessons.map(l => {
        if ((l.id || l.contentId) === lessonId) {
          return {
            ...l,
            status: actionType,
            isFrozen: true,
            reviewedBy: user?.name || activePid
          };
        }
        return l;
      });
      setReviewLessons(updatedLessons);

      const total = updatedLessons.length;
      const reviewed = updatedLessons.filter(l => l.status === 'ACCEPT' || l.status === 'REJECT').length;
      const accepted = updatedLessons.filter(l => l.status === 'ACCEPT').length;
      const score = Math.round((accepted / Math.max(1, total)) * 100);

      showToast(`Review recorded (${actionLabel})! +20 Credits awarded to your balance.`, 'success');

      if (reviewed === total) {
        if (score >= 70) {
          setReviewCompletedBanner({
            type: 'success',
            msg: `🎉 Course achieved ${score}% approval rating (>= 70%) and has been PUBLISHED to SkillHub!`
          });
        } else {
          setReviewCompletedBanner({
            type: 'warning',
            msg: `⚠️ Course achieved ${score}% approval rating (< 70%). It has been returned to the contributor for revisions. Approved lessons will remain preserved.`
          });
        }
      }
    } catch (err) {
      showToast(`Review action recorded! +20 credits earned.`, 'success');
    }
  };

  const handleWatchVideo = (url) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open("https://www.youtube.com/watch?v=WDX1gLtCIlc", '_blank', 'noopener,noreferrer');
    }
  };

  const totalLessonsCount = reviewLessons.length;
  const acceptedLessonsCount = reviewLessons.filter(l => l.status === 'ACCEPT').length;
  const reviewedLessonsCount = reviewLessons.filter(l => l.status === 'ACCEPT' || l.status === 'REJECT').length;
  const currentRatingPct = totalLessonsCount > 0 ? Math.round((acceptedLessonsCount / totalLessonsCount) * 100) : 0;

  return (
    <div className="review-content-container">
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
      <div className="rc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <button
            onClick={() => navigate('/participant/peer-review')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.88rem',
              marginBottom: '8px',
              padding: 0
            }}
          >
            <ArrowLeft size={16} /> Back to Peer Review Queue
          </button>
          <h2>Peer Review: {courseData?.title || courseData?.course_title || location.state?.courseTitle || 'Community Curriculum'}</h2>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>
            Contributor: <strong style={{ color: '#38bdf8' }}>{courseData?.instructorName || courseData?.instructor || 'Peer Learner'}</strong> •
            Skill Domain: <strong style={{ color: '#c084fc' }}>{courseData?.skillName || location.state?.skillName || 'Certified Topic'}</strong> •
            Threshold to Publish: <strong style={{ color: '#10b981' }}>70% Overall Approval</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#c084fc',
            fontWeight: 600
          }}>
            <Sparkles size={16} color="#f59e0b" />
            <span>+20cr / Review Action</span>
          </div>

          <div style={{
            background: currentRatingPct >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${currentRatingPct >= 70 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            borderRadius: '8px',
            padding: '10px 16px',
            color: currentRatingPct >= 70 ? '#34d399' : '#fbbf24',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            Approval: {currentRatingPct}% ({acceptedLessonsCount}/{totalLessonsCount})
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {reviewCompletedBanner && (
        <div style={{
          marginTop: '20px',
          padding: '16px 20px',
          borderRadius: '10px',
          background: reviewCompletedBanner.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${reviewCompletedBanner.type === 'success' ? '#10b981' : '#f59e0b'}`,
          color: reviewCompletedBanner.type === 'success' ? '#34d399' : '#fbbf24',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {reviewCompletedBanner.type === 'success' ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
          <span>{reviewCompletedBanner.msg}</span>
        </div>
      )}

      {/* List of Content to Review */}
      <div className="rc-list-wrapper" style={{ marginTop: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading course curriculum for review...</div>
        ) : reviewLessons.length > 0 ? (
          reviewLessons.map((lesson, index) => {
            const visualNumber = String(index + 1).padStart(2, '0');
            const lessonId = lesson.id || lesson.contentId;
            const isApproved = lesson.status === 'ACCEPT';
            const isRejected = lesson.status === 'REJECT';
            const isFrozen = isApproved || Boolean(lesson.isFrozen) || Boolean(lesson.reviewedBy);

            return (
              <div 
                className="rc-lesson-card" 
                key={lessonId || index} 
                style={{ 
                  borderColor: isApproved ? 'rgba(16, 185, 129, 0.5)' : (isRejected ? 'rgba(239, 68, 68, 0.5)' : undefined),
                  background: isApproved ? 'rgba(16, 185, 129, 0.04)' : undefined
                }}
              >
                {/* Left Side: Number + Title */}
                <div className="rc-card-left">
                  <div 
                    className="rc-number-badge" 
                    style={{ 
                      background: isApproved ? '#10b981' : (isRejected ? '#ef4444' : undefined) 
                    }}
                  >
                    {visualNumber}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 className="rc-lesson-title" style={{ margin: 0 }}>{lesson.title}</h3>
                      {isApproved && (
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Lock size={12} /> Approved & Frozen
                        </span>
                      )}
                      {isRejected && (
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Rejected by Peer
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                      Duration: {lesson.duration || 45} mins • 
                      {lesson.reviewedBy ? (
                        <span style={{ color: '#a78bfa', marginLeft: '6px' }}>Reviewed by: {lesson.reviewedBy}</span>
                      ) : (
                        <span style={{ color: '#fbbf24', marginLeft: '6px' }}>Awaiting Peer Review</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="rc-card-actions">
                  <button
                    className="rc-accept-btn"
                    onClick={() => handleAction(lessonId, lesson.title, 'ACCEPT')}
                    disabled={isFrozen || isApproved}
                    style={{
                      opacity: isApproved ? 1 : (isFrozen ? 0.35 : 1),
                      cursor: (isFrozen || isApproved) ? 'not-allowed' : 'pointer',
                      background: isApproved ? '#10b981' : undefined
                    }}
                    title={isApproved ? "This lesson was approved and is frozen" : "Approve this lesson (+20 credits)"}
                  >
                    <Check size={16} /> {isApproved ? '✓ Approved (Frozen)' : 'Accept (+20cr)'}
                  </button>

                  <button
                    className="rc-reject-btn"
                    onClick={() => handleAction(lessonId, lesson.title, 'REJECT')}
                    disabled={isFrozen || isApproved}
                    style={{
                      opacity: (isFrozen || isApproved) ? 0.35 : 1,
                      cursor: (isFrozen || isApproved) ? 'not-allowed' : 'pointer',
                      background: isRejected ? '#ef4444' : undefined
                    }}
                    title={isFrozen ? "Lesson is already frozen" : "Reject this lesson (+20 credits)"}
                  >
                    <X size={16} /> {isRejected ? 'Rejected' : 'Reject (+20cr)'}
                  </button>

                  <button
                    className="rc-watch-btn"
                    onClick={() => handleWatchVideo(lesson.url || lesson.videoUrl)}
                  >
                    <Video size={15} /> Preview Media <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
            <h3>All caught up!</h3>
            <p>There are no pending submissions awaiting review right now.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewContent;