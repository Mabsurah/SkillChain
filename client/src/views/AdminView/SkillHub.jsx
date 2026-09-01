import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import './SkillHub.css'; 
import CourseDetailsModal from '../ParticipantView/CourseDetailsModal';

const SkillHub = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/courses');
        const data = await response.json();
        const formattedData = data.map(course => ({
          id: course.COURSE_ID,
          title: course.COURSE_TITLE,
          level: course.COURSE_LEVEL,
          totalClasses: course.TOTAL_CLASSES || 0, // Real SUBQUERY result
          charge: course.PRICE,
        }));
        setAvailableCourses(formattedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching courses:", error);
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = availableCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="skillhub-page-container">
      <div className="sh-header-section">
        <h2>SkillHub</h2>
        <p>Monitor and manage the complete catalog of published courses</p>
      </div>

      <div className="sh-search-wrapper">
        <Search size={20} className="sh-search-icon" />
        <input 
          type="text" 
          className="sh-search-input"
          placeholder="Search for a course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sh-grid">
        {isLoading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
            <div className="sh-card" key={course.id}>
              <h3 className="sh-course-title">{course.title}</h3>
              <div className="sh-level-badge">{course.level}</div>
              <div className="sh-divider"></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexGrow: 1 }}>
                <div className="sh-class-count" style={{ marginBottom: 0, flexGrow: 0 }}>
                  Total Class : {course.totalClasses}
                </div>
                <button className="sh-details-btn" onClick={() => setSelectedCourse(course)}>Details</button>
              </div>

              <div className="sh-card-actions">
                <div className="sh-charge-box">Charge : ${course.charge}</div>
                {/* ID PASS KORA HOCCHE LESSON LIST E */}
                <button className="sh-enroll-btn" onClick={() => navigate('/admin/lesson-list', { state: { courseId: course.id, courseTitle: course.title } })}>
                  Watch Now
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '40px 0' }}>No courses found.</div>
        )}
      </div>

      <CourseDetailsModal isOpen={Boolean(selectedCourse)} course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  );
};

export default SkillHub;