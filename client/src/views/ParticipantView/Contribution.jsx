import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, CheckCircle } from 'lucide-react'; 
import './Contribution.css';

const Contribution = () => {
  const navigate = useNavigate(); 

  // --- Data States (Added level field to existing mock data) ---
  const [ongoingCourses, setOngoingCourses] = useState([
    {
      id: 1,
      title: 'C Programming Course',
      level: 'Beginner',
      totalLessons: 6,
      status: 'In Progress'
    }
  ]);

  const [completedCourses, setCompletedCourses] = useState([
    {
      id: 2,
      title: 'Microsoft Excel Course',
      level: 'Intermediate',
      totalLessons: 10,
      status: 'Completed'
    }
  ]);

  // --- Add Course Modal States ---
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('');

  // --- Add Content Modal States ---
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);
  const [activeCourse, setActiveCourse] = useState(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonUrl, setLessonUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');

  // ==========================================
  // ADD NEW COURSE LOGIC
  // ==========================================
  const handleOpenAddCourse = () => {
    setIsAddCourseModalOpen(true);
  };

  const handleCloseAddCourse = () => {
    setIsAddCourseModalOpen(false);
    setNewCourseTitle('');
    setNewCourseLevel('');
  };

  const handleSubmitNewCourse = () => {
    if (!newCourseTitle.trim() || !newCourseLevel) {
      alert("Please enter a course title and select a level.");
      return;
    }
    
    const newCourse = {
      id: Date.now(), 
      title: newCourseTitle,
      level: newCourseLevel, // Captures selected Beginner/Intermediate/Expert
      totalLessons: 0,
      status: 'In Progress'
    };

    setOngoingCourses(prev => [newCourse, ...prev]);
    handleCloseAddCourse();
  };

  // ==========================================
  // ADD CONTENT LOGIC 
  // ==========================================
  const handleCloseAddContent = () => {
    setIsAddContentModalOpen(false);
    setActiveCourse(null);
    setLessonTitle('');
    setLessonUrl('');
    setLessonDuration('');
  };

  const handleSubmitContent = () => {
    if (!lessonTitle || !lessonUrl || !lessonDuration) {
      alert("Please fill out all required fields.");
      return;
    }
    
    setOngoingCourses(prevCourses => 
      prevCourses.map(course => 
        course.id === activeCourse.id 
          ? { ...course, totalLessons: course.totalLessons + 1 } 
          : course
      )
    );

    handleCloseAddContent();
  };

  // ==========================================
  // MARK COMPLETED LOGIC
  // ==========================================
  const handleMarkCompleted = (courseToMove) => {
    setOngoingCourses(prev => prev.filter(course => course.id !== courseToMove.id));
    setCompletedCourses(prev => [{ ...courseToMove, status: 'Completed' }, ...prev]);
    alert(`Success! "${courseToMove.title}" has been published to SkillHub!`);
  };

  return (
    <div className="contribution-container">
      
      {/* ---------- 1. "ADD NEW COURSE" MODAL OVERLAY ---------- */}
      {isAddCourseModalOpen && (
        <div className="cont-modal-overlay">
          <div className="cont-modal">
            <button className="cont-modal-close" onClick={handleCloseAddCourse}>
              <X size={24} />
            </button>
            <h2>New Course</h2>
            <p>Create a new course to get started.</p>
            
            <div className="cont-form-group">
              <label>Course Title <span className="cont-required">*</span></label>
              <input 
                type="text" 
                className="cont-form-input" 
                placeholder="Enter course title"
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
            
            <div className="cont-modal-footer">
              <button className="cont-btn-cancel" onClick={handleCloseAddCourse}>Cancel</button>
              <button className="cont-btn-ok" onClick={handleSubmitNewCourse}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 2. "ADD CONTENT" MODAL OVERLAY ---------- */}
      {isAddContentModalOpen && activeCourse && (
        <div className="cont-modal-overlay">
          <div className="cont-modal">
            <button className="cont-modal-close" onClick={handleCloseAddContent}>
              <X size={24} />
            </button>
            <h2>{activeCourse.title}</h2>
            <p>Add new lesson content to your course</p>
            
            <div className="cont-form-group">
              <label>Title of the lesson <span className="cont-required">*</span></label>
              <input 
                type="text" 
                className="cont-form-input" 
                placeholder="Enter lesson title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </div>
            <div className="cont-form-group">
              <label>URL <span className="cont-required">*</span></label>
              <input 
                type="text" 
                className="cont-form-input" 
                placeholder="Enter lesson URL"
                value={lessonUrl}
                onChange={(e) => setLessonUrl(e.target.value)}
              />
            </div>
            <div className="cont-form-group">
              <label>Duration <span className="cont-required">*</span></label>
              <input 
                type="text" 
                className="cont-form-input" 
                placeholder="Enter duration (e.g. 30 minutes)"
                value={lessonDuration}
                onChange={(e) => setLessonDuration(e.target.value)}
              />
            </div>
            
            <div className="cont-modal-footer">
              <button className="cont-btn-cancel" onClick={handleCloseAddContent}>Cancel</button>
              <button className="cont-btn-ok" onClick={handleSubmitContent}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN PAGE CONTENT */}
      {/* ========================================================= */}
      <div className="cont-header-section">
        <div className="cont-header-text">
          <h2>Contribution</h2>
          <p>Manage your created courses and content contributions.</p>
        </div>
        <button className="cont-add-course-btn" onClick={handleOpenAddCourse}>
          <Plus size={18} /> Add New Course
        </button>
      </div>

      {/* Ongoing Section */}
      <div className="cont-section">
        <h3 className="cont-section-title">Ongoing Section</h3>
        
        {ongoingCourses.length > 0 ? (
          ongoingCourses.map((course) => (
            <div className="cont-card" key={course.id}>
              
              <div className="cont-card-top">
                <div>
                  <h4 className="cont-card-title">{course.title}</h4>
                  
                  {/* DISPLAY LEVEL BADGE AND STATUS BADGE */}
                  <div className="cont-badges-wrapper">
                    <div className="cont-level-badge">{course.level}</div>
                    <div className="cont-status-badge">{course.status}</div>
                  </div>
                </div>

                <div className="cont-lesson-count">
                  Total lesson : {course.totalLessons}
                </div>
              </div>

              <div className="cont-card-actions">
                <button 
                  className="cont-add-content-btn"
                  onClick={() => navigate('/participant/content-list')}
                >
                  Content List
                </button>
                
                <button 
                  className="cont-mark-completed-btn"
                  onClick={() => handleMarkCompleted(course)}
                >
                  <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-top' }}/>
                  Mark Completed
                </button>
              </div>

            </div>
          ))
        ) : (
          <p style={{ color: '#64748b', fontStyle: 'italic' }}>No ongoing courses right now.</p>
        )}
      </div>

      {/* Completed Section */}
      <div className="cont-section">
        <h3 className="cont-section-title">Completed Section</h3>
        
        {completedCourses.map((course) => (
          <div className="cont-card" key={course.id}>
            
            <div className="cont-card-top">
              <div>
                <h4 className="cont-card-title">{course.title}</h4>
                
                {/* DISPLAY LEVEL BADGE AND STATUS BADGE */}
                <div className="cont-badges-wrapper">
                  <div className="cont-level-badge">{course.level}</div>
                  <div className="cont-status-badge">{course.status}</div>
                </div>
              </div>

              <div className="cont-lesson-count">
                Total lesson : {course.totalLessons}
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default Contribution;