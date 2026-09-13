import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './MyCourses.css';

const MyCourses = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const activePid = user?.participantId || user?.email || localStorage.getItem('participantId') || 'P001';

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        setLoading(true);
        const res = await api.getEnrollments(activePid);
        if (res && res.enrollments) {
          const courses = res.enrollments.map((enrollment, idx) => ({
            id: enrollment.courseId || enrollment.course_id || idx,
            title: enrollment.courseTitle || enrollment.course_title || `Course ${idx + 1}`,
            level: enrollment.level || 'Beginner',
            duration: enrollment.duration || '30 minutes',
            lessons: `${enrollment.totalClasses || enrollment.total_classes || 10} Lessons`,
          }));
          setEnrolledCourses(courses);
        }
      } catch (err) {
        setEnrolledCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, [activePid]);

  const filteredCourses = enrolledCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLearnNowClick = (courseId) => {
    navigate('/participant/lesson-list', { state: { courseId } });
  };

  return (
    <div className="my-courses-container">

      <div className="mc-header-section">
        <h2>My Courses</h2>
        <p>Explore your enrolled courses and continue learning.</p>
      </div>

      <div className="mc-search-wrapper">
        <Search size={20} className="mc-search-icon" />
        <input
          type="text"
          className="mc-search-input"
          placeholder="Search Course"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="mc-courses-list">
        {loading ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Loading your courses...</p>
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div className="mc-course-card" key={course.id}>

              <div className="mc-card-top">
                <div>
                  <h3 className="mc-course-title">{course.title}</h3>
                  <div className="mc-meta-row" style={{ marginTop: '8px' }}>
                    <div className="mc-enrolled-badge">
                      <div className="mc-green-dot"></div>
                      Enrolled
                    </div>
                    <div className="mc-level-text">
                      {course.level}
                    </div>
                  </div>
                </div>

                <button
                  className="mc-learn-btn"
                  onClick={() => handleLearnNowClick(course.id)}
                >
                  Learn Now! <ArrowRight size={16} />
                </button>
              </div>

              <div className="mc-card-bottom">
                <div className="mc-info-item">
                  <Clock size={16} style={{ color: '#8b5cf6' }} />
                  <span>Duration: {course.duration}</span>
                </div>
                <span className="mc-dot-separator">•</span>
                <div className="mc-info-item">
                  <BookOpen size={16} style={{ color: '#8b5cf6' }} />
                  <span>{course.lessons}</span>
                </div>
              </div>

            </div>
          ))
        ) : (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No courses found matching your search.</p>
        )}
      </div>

    </div>
  );
};

export default MyCourses;
