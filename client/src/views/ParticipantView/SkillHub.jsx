import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Coins, AlertCircle, Shield } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CourseDetailsModal from './CourseDetailsModal';
import './SkillHub.css';

const defaultCourses = [
  { id: 'C001', course_id: 'C001', title: 'Advanced C++ Programming', level: 'Advanced', totalClasses: 10, charge: 1200, price: 1200, instructorName: 'Rahim Ahmed', instructorEmail: 'rahim@gmail.com', skillName: 'C++ Programming' },
  { id: 'C002', course_id: 'C002', title: 'Full Stack Web Development', level: 'Intermediate', totalClasses: 12, charge: 1500, price: 1500, instructorName: 'Sadia Islam', instructorEmail: 'sadia@gmail.com', skillName: 'Web Development' },
  { id: 'C003', course_id: 'C003', title: 'Python for Data Science', level: 'Advanced', totalClasses: 8, charge: 1300, price: 1300, instructorName: 'Tanvir Hossain', instructorEmail: 'tanvir@gmail.com', skillName: 'Python Programming' },
  { id: 'C004', course_id: 'C004', title: 'Oracle Database Management', level: 'Intermediate', totalClasses: 15, charge: 1000, price: 1000, instructorName: 'Nusrat Jahan', instructorEmail: 'nusrat@gmail.com', skillName: 'Database Management' },
  { id: 'C005', course_id: 'C005', title: 'Introduction to Machine Learning', level: 'Advanced', totalClasses: 14, charge: 1800, price: 1800, instructorName: 'Fahim Hasan', instructorEmail: 'fahim@gmail.com', skillName: 'Machine Learning' }
];

const ParticipantSkillHub = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState(defaultCourses);
  const [loading, setLoading] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [userCredits, setUserCredits] = useState(null);

  const activePid = user?.participantId || user?.email || localStorage.getItem('participantId') || 'P001';

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getCourses();
      if (res && Array.isArray(res.courses) && res.courses.length > 0) {
        setCourses(res.courses);
      }

      // Fetch active user's specific enrollments from Oracle DB
      const enrollRes = await api.getEnrollments(activePid);
      if (enrollRes && enrollRes.enrollments) {
        const myEnrolledIds = enrollRes.enrollments.map(e => e.courseId || e.course_id);
        setEnrolledCourseIds(myEnrolledIds);
      }

      // Fetch active participant profile for live credit balance
      const profileRes = await api.getParticipant(activePid);
      if (profileRes && profileRes.participant) {
        setUserCredits(Number(profileRes.participant.credit || 0));
      }
    } catch (err) {
      console.warn("Using default catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleCatalogUpdate = () => {
      fetchData();
    };

    window.addEventListener('skillchain-catalog-updated', handleCatalogUpdate);
    window.addEventListener('skillchain-course-approved', handleCatalogUpdate);
    window.addEventListener('focus', handleCatalogUpdate);

    // Periodic auto-sync
    const interval = setInterval(fetchData, 3000);

    return () => {
      window.removeEventListener('skillchain-catalog-updated', handleCatalogUpdate);
      window.removeEventListener('skillchain-course-approved', handleCatalogUpdate);
      window.removeEventListener('focus', handleCatalogUpdate);
      clearInterval(interval);
    };
  }, [activePid]);

  const handleEnroll = async (course) => {
    const courseId = course.id || course.course_id;
    const coursePrice = Number(course.charge || course.price || 0);

    // Client-side credit check
    if (userCredits !== null && userCredits < coursePrice) {
      alert(`⚠️ Insufficient credits!\n\nYou currently have ${userCredits} credits, but "${course.title || course.course_title}" costs ${coursePrice} credits.\n\nEarn more credits by contributing educational content or uploading verified certificates!`);
      return;
    }

    try {
      const res = await api.enrollCourse({ participantId: activePid, courseId });
      if (res && res.success) {
        setEnrolledCourseIds(prev => [...prev, courseId]);
        if (userCredits !== null) {
          setUserCredits(prev => Math.max(0, prev - coursePrice));
        }
        alert(res.message || `Successfully enrolled into "${course.title || course.course_title}"! ${coursePrice} credits spent.`);
      } else {
        alert(res?.message || "Enrollment could not be completed. Please check your credit balance.");
      }
    } catch (err) {
      alert(err.message || "Failed to process enrollment.");
    }
  };

  const filteredCourses = courses.filter(course => {
    const t = (course.title || course.course_title || "").toLowerCase();
    const l = (course.level || course.course_level || "").toLowerCase();
    const s = (course.skillName || course.skill_name || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return t.includes(q) || l.includes(q) || s.includes(q);
  });

  return (
    <div className="skillhub-page-container">
      
      {/* Header with Balance Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
        <div className="sh-header-section" style={{ marginBottom: 0 }}>
          <h2>SkillHub</h2>
          <p>Explore courses and spend credits to learn from expert instructors</p>
        </div>

        {userCredits !== null && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(59, 130, 246, 0.12))',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.12)'
          }}>
            <Coins size={22} color="#fbbf24" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Available Balance</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#f8fafc' }}>
                {userCredits.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>Credits</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="sh-search-wrapper">
        <Search size={20} className="sh-search-icon" />
        <input
          type="text"
          className="sh-search-input"
          placeholder="Search for a course or skill..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid of Course Cards */}
      <div className="sh-grid">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => {
            const courseCreatorPid = (course.participant_id || course.participantId || course.instructorEmail || '').toLowerCase();
            const currentUserId = (activePid || '').toLowerCase();
            const isOwnCourse = courseCreatorPid && (courseCreatorPid === currentUserId || (user?.email && courseCreatorPid === user.email.toLowerCase()));
            const isEnrolled = !isOwnCourse && (enrolledCourseIds.includes(course.id) || enrolledCourseIds.includes(course.course_id));
            const coursePrice = Number(course.charge || course.price || 0);
            const isAffordable = userCredits === null || userCredits >= coursePrice;

            return (
              <div className="sh-card" key={course.id || course.course_id}>
                
                <h3 className="sh-course-title">{course.title || course.course_title}</h3>
                
                <div className="sh-level-badge">
                  {course.level || course.course_level}
                </div>
                
                <div className="sh-divider"></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexGrow: 1 }}>
                  <div className="sh-class-count" style={{ marginBottom: 0, flexGrow: 0 }}>
                    Total Class : {course.totalClasses || course.total_classes || 10}
                  </div>

                  <button
                    className="sh-details-btn"
                    onClick={() => setSelectedCourse(course)}
                  >
                    Details
                  </button>
                </div>

                <div className="sh-card-actions">
                  <div className="sh-charge-box">
                    Charge : {coursePrice} Credits
                  </div>

                  <button 
                    className={`sh-enroll-btn ${isEnrolled ? 'enrolled' : ''} ${isOwnCourse ? 'instructor' : ''}`}
                    onClick={() => !isEnrolled && !isOwnCourse && handleEnroll(course)}
                    disabled={isOwnCourse || isEnrolled}
                    style={
                      isOwnCourse
                        ? { background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.35))', border: '1px solid rgba(139, 92, 246, 0.6)', color: '#c4b5fd', cursor: 'default' }
                        : (isEnrolled
                            ? { background: '#10b981', borderColor: '#10b981', cursor: 'default' }
                            : (!isAffordable ? { background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#f87171' } : {}))
                    }
                  >
                    {isOwnCourse ? (
                      <>
                        <Shield size={16} style={{ display: 'inline', marginRight: '5px' }} /> Instructor
                      </>
                    ) : (isEnrolled ? (
                      <>
                        <CheckCircle size={16} style={{ display: 'inline', marginRight: '5px' }} /> Enrolled
                      </>
                    ) : (!isAffordable ? (
                      <>
                        <AlertCircle size={15} style={{ display: 'inline', marginRight: '4px' }} /> Need {coursePrice - userCredits} Credits
                      </>
                    ) : (
                      'Enroll Now'
                    )))}
                  </button>
                </div>

              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: '1.1rem' }}>
            No courses found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Course Details Modal */}
      <CourseDetailsModal
        isOpen={Boolean(selectedCourse)}
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />

    </div>
  );
};

export default ParticipantSkillHub;