import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import CourseDetailsModal from '../ParticipantView/CourseDetailsModal';
import './SkillHub.css'; 

const defaultCourses = [
  { id: 'C001', course_id: 'C001', title: 'Advanced C++ Programming', level: 'Advanced', totalClasses: 10, charge: 1200, price: 1200, instructorName: 'Rahim Ahmed', instructorEmail: 'rahim@gmail.com', skillName: 'C++ Programming' },
  { id: 'C002', course_id: 'C002', title: 'Full Stack Web Development', level: 'Intermediate', totalClasses: 12, charge: 1500, price: 1500, instructorName: 'Sadia Islam', instructorEmail: 'sadia@gmail.com', skillName: 'Web Development' },
  { id: 'C003', course_id: 'C003', title: 'Python for Data Science', level: 'Advanced', totalClasses: 8, charge: 1300, price: 1300, instructorName: 'Tanvir Hossain', instructorEmail: 'tanvir@gmail.com', skillName: 'Python Programming' },
  { id: 'C004', course_id: 'C004', title: 'Oracle Database Management', level: 'Intermediate', totalClasses: 15, charge: 1000, price: 1000, instructorName: 'Nusrat Jahan', instructorEmail: 'nusrat@gmail.com', skillName: 'Database Management' },
  { id: 'C005', course_id: 'C005', title: 'Introduction to Machine Learning', level: 'Advanced', totalClasses: 14, charge: 1800, price: 1800, instructorName: 'Fahim Hasan', instructorEmail: 'fahim@gmail.com', skillName: 'Machine Learning' }
];

const AdminSkillHub = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState(defaultCourses);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate(); 

  const fetchCourses = async () => {
    try {
      const res = await api.getCourses();
      if (res && Array.isArray(res.courses) && res.courses.length > 0) {
        setCourses(res.courses);
      }
    } catch (err) {
      console.warn("Using default catalog");
    }
  };

  useEffect(() => {
    fetchCourses();

    const handleCatalogUpdate = () => {
      fetchCourses();
    };

    window.addEventListener('skillchain-catalog-updated', handleCatalogUpdate);
    window.addEventListener('skillchain-course-approved', handleCatalogUpdate);
    window.addEventListener('focus', handleCatalogUpdate);

    // Periodic auto-sync
    const interval = setInterval(fetchCourses, 3000);

    return () => {
      window.removeEventListener('skillchain-catalog-updated', handleCatalogUpdate);
      window.removeEventListener('skillchain-course-approved', handleCatalogUpdate);
      window.removeEventListener('focus', handleCatalogUpdate);
      clearInterval(interval);
    };
  }, []);

  const filteredCourses = courses.filter(course =>
    (course.title || course.course_title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.skillName || course.skill_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="skillhub-page-container">
      
      {/* Header */}
      <div className="sh-header-section">
        <h2>SkillHub</h2>
        <p>Monitor and manage the complete catalog of published courses in the database</p>
      </div>

      {/* Search Bar */}
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

      {/* Grid of Course Cards */}
      <div className="sh-grid">
        {filteredCourses.length > 0 ? (
          filteredCourses.map((course) => (
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
                  Charge : {course.charge || course.price} Credits
                </div>
                
                <button 
                  className="sh-enroll-btn" 
                  onClick={() => navigate('/admin/lesson-list', { state: { courseId: course.id || course.course_id } })}
                >
                  Watch Now
                </button>
              </div>
              
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: '1.1rem' }}>
            No courses found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* RENDER THE MODAL COMPONENT */}
      <CourseDetailsModal 
        isOpen={Boolean(selectedCourse)} 
        course={selectedCourse} 
        onClose={() => setSelectedCourse(null)} 
      />

    </div>
  );
};

export default AdminSkillHub;