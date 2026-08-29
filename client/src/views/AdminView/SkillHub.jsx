import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import './SkillHub.css'; 
import CourseDetailsModal from '../ParticipantView/CourseDetailsModal';

const SkillHub = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // State to track which course was clicked for the modal
  const [selectedCourse, setSelectedCourse] = useState(null);

  const navigate = useNavigate(); 

  // Mock Database Array
  const availableCourses = [
    {
      id: 1,
      title: 'C Programming Course',
      level: 'Beginner',
      totalClasses: 10,
      charge: 100,
    },
    {
      id: 2,
      title: 'Python Programming Course',
      level: 'Beginner',
      totalClasses: 8,
      charge: 80,
    },
    {
      id: 3,
      title: 'JavaScript Essentials',
      level: 'Intermediate',
      totalClasses: 12,
      charge: 120,
    },
    {
      id: 4,
      title: 'Database Management System',
      level: 'Intermediate',
      totalClasses: 15,
      charge: 150,
    },
    {
      id: 5,
      title: 'Web Development Basics',
      level: 'Beginner',
      totalClasses: 9,
      charge: 90,
    },
    {
      id: 6,
      title: 'Data Structures & Algorithms',
      level: 'Expert',
      totalClasses: 14,
      charge: 140,
    }
  ];

  const filteredCourses = availableCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="skillhub-page-container">
      
      {/* Header */}
      <div className="sh-header-section">
        <h2>SkillHub</h2>
        <p>Monitor and manage the complete catalog of published courses</p>
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
            <div className="sh-card" key={course.id}>
              
              <h3 className="sh-course-title">{course.title}</h3>
              
              <div className="sh-level-badge">
                {course.level}
              </div>
              
              <div className="sh-divider"></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexGrow: 1 }}>
                <div className="sh-class-count" style={{ marginBottom: 0, flexGrow: 0 }}>
                  Total Class : {course.totalClasses}
                </div>

                {/* Opens the modal and passes the specific course */}
                <button 
                  className="sh-details-btn" 
                  onClick={() => setSelectedCourse(course)}
                >
                  Details
                </button>
              </div>

              <div className="sh-card-actions">
                <div className="sh-charge-box">
                  Charge : {course.charge}
                </div>
                
                <button 
                  className="sh-enroll-btn" 
                  onClick={() => navigate('/admin/lesson-list')}
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

export default SkillHub;