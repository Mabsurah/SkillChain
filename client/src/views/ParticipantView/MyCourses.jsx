import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { Search, Clock, ArrowRight, BookOpen } from 'lucide-react';
import './MyCourses.css';

const MyCourses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate(); 

  const enrolledCourses = [
    {
      id: 1,
      title: 'C Programming Course',
      level: 'Beginner',
      duration: '30 minutes',
      lessons: '10 Lessons',
    },
    {
      id: 2,
      title: 'Python Programming Course',
      level: 'Beginner',
      duration: '40 minutes',
      lessons: '12 Lessons',
    }
  ];

  const filteredCourses = enrolledCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLearnNowClick = (courseId) => {
    navigate('/participant/lesson-list'); 
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
        {filteredCourses.length > 0 ? (
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
                    {/* Level Text Badge */}
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