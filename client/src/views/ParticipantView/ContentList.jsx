import React, { useState } from 'react';
import { Trash2, ArrowRight, CloudUpload, Plus, X } from 'lucide-react';
import './ContentList.css';

const ContentList = () => {
  // --- Lesson Data State ---
  const [lessons, setLessons] = useState([
    { id: 1, title: 'Introduction to C programming' },
    { id: 2, title: 'First C Program' },
    { id: 3, title: 'Variables and Data Types in C' },
    { id: 4, title: 'Operators in C' },
    { id: 5, title: 'Decision Making in C' }
  ]);

  const currentCourseTitle = "C Programming Course"; 

  // --- "Add Content" Modal States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonUrl, setLessonUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');

  // --- "Upload Test" Modal States ---
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testDuration, setTestDuration] = useState('');

  // ==========================================
  // HANDLERS FOR LESSON LIST
  // ==========================================
  const handleDelete = (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      setLessons(prev => prev.filter(lesson => lesson.id !== id));
    }
  };

  // ==========================================
  // HANDLERS FOR "ADD CONTENT" MODAL
  // ==========================================
  const handleOpenModal = () => setIsModalOpen(true);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setLessonTitle('');
    setLessonUrl('');
    setLessonDuration('');
  };

  const handleSubmitContent = () => {
    if (!lessonTitle.trim() || !lessonUrl.trim() || !lessonDuration.trim()) {
      alert("Please fill out all required fields.");
      return;
    }

    const newLesson = {
      id: lessons.length > 0 ? Math.max(...lessons.map(l => l.id)) + 1 : 1, 
      title: lessonTitle
    };

    setLessons(prev => [...prev, newLesson]);
    handleCloseModal();
  };

  // ==========================================
  // HANDLERS FOR "UPLOAD TEST" MODAL
  // ==========================================
  const handleOpenTestModal = () => setIsTestModalOpen(true);

  const handleCloseTestModal = () => {
    setIsTestModalOpen(false);
    setTestUrl('');
    setTestDuration('');
  };

  const handleSubmitTest = () => {
    if (!testUrl.trim() || !testDuration.trim()) {
      alert("Please fill out all required fields for the test.");
      return;
    }
    
    alert(`Success! Test uploaded for ${currentCourseTitle}.\nURL: ${testUrl}\nDuration: ${testDuration}`);
    handleCloseTestModal();
  };

  return (
    <div className="content-list-container">
      
      {/* ---------- 1. "ADD CONTENT" MODAL OVERLAY ---------- */}
      {isModalOpen && (
        <div className="cl-modal-overlay">
          <div className="cl-modal">
            <button className="cl-modal-close" onClick={handleCloseModal}>
              <X size={24} />
            </button>
            
            <h2>{currentCourseTitle}</h2>
            <p>Add new lesson content to your course</p>
            
            <div className="cl-form-group">
              <label>Title of the lesson <span className="cl-required">*</span></label>
              <input 
                type="text" 
                className="cl-form-input" 
                placeholder="Enter lesson title"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </div>
            
            <div className="cl-form-group">
              <label>URL <span className="cl-required">*</span></label>
              <input 
                type="text" 
                className="cl-form-input" 
                placeholder="Enter lesson URL"
                value={lessonUrl}
                onChange={(e) => setLessonUrl(e.target.value)}
              />
            </div>
            
            <div className="cl-form-group">
              <label>Duration <span className="cl-required">*</span></label>
              <input 
                type="text" 
                className="cl-form-input" 
                placeholder="Enter duration (e.g. 30 minutes)"
                value={lessonDuration}
                onChange={(e) => setLessonDuration(e.target.value)}
              />
            </div>
            
            <div className="cl-modal-footer">
              <button className="cl-btn-cancel" onClick={handleCloseModal}>Cancel</button>
              <button className="cl-btn-ok" onClick={handleSubmitContent}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 2. "UPLOAD TEST" MODAL OVERLAY ---------- */}
      {isTestModalOpen && (
        <div className="cl-modal-overlay">
          <div className="cl-modal">
            <button className="cl-modal-close" onClick={handleCloseTestModal}>
              <X size={24} />
            </button>
            
            <h2>{currentCourseTitle}</h2>
            <p>Upload a test for your course</p>
            
            {/* Notice: The Title field has been removed here as requested! */}
            
            <div className="cl-form-group">
              <label>URL <span className="cl-required">*</span></label>
              <input 
                type="text" 
                className="cl-form-input" 
                placeholder="Enter test URL (e.g., Google Forms link)"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
              />
            </div>
            
            <div className="cl-form-group">
              <label>Duration <span className="cl-required">*</span></label>
              <input 
                type="text" 
                className="cl-form-input" 
                placeholder="Enter duration (e.g. 30 minutes)"
                value={testDuration}
                onChange={(e) => setTestDuration(e.target.value)}
              />
            </div>
            
            <div className="cl-modal-footer">
              <button className="cl-btn-cancel" onClick={handleCloseTestModal}>Cancel</button>
              <button className="cl-btn-ok" onClick={handleSubmitTest}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN PAGE CONTENT */}
      {/* ========================================================= */}
      <div className="cl-header">
        <h2>Content List</h2>
        <p>Manage your course content and build a better learning experience.</p>
      </div>

      {/* List of Lessons */}
      <div className="cl-list-wrapper">
        {lessons.length > 0 ? (
          lessons.map((lesson, index) => {
            const visualNumber = String(index + 1).padStart(2, '0');

            return (
              <div className="cl-lesson-card" key={lesson.id}>
                
                <div className="cl-card-left">
                  <div className="cl-number-badge">{visualNumber}</div>
                  <h3 className="cl-lesson-title">{lesson.title}</h3>
                </div>

                <div className="cl-card-actions">
                  <button 
                    className="cl-delete-btn"
                    onClick={() => handleDelete(lesson.id, lesson.title)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                  
                  <button className="cl-watch-btn" onClick={() => alert(`Playing ${lesson.title}`)}>
                    Watch Now <ArrowRight size={16} />
                  </button>
                </div>

              </div>
            );
          })
        ) : (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '20px 0' }}>
            No lessons available. Click "Add Content" below to get started!
          </p>
        )}
      </div>

      {/* Bottom Action Cards */}
      <div className="cl-bottom-actions">
        
        {/* Updated: Triggers the Test Modal */}
        <div className="cl-action-card cl-card-blue" onClick={handleOpenTestModal}>
          <div className="cl-action-left">
            <div className="cl-action-icon">
              <CloudUpload size={24} />
            </div>
            <div className="cl-action-text">
              <h4>Upload Test</h4>
              <p>Upload test for your course</p>
            </div>
          </div>
          <ArrowRight size={24} className="cl-arrow" />
        </div>

        {/* Triggers the Content Modal */}
        <div className="cl-action-card cl-card-purple" onClick={handleOpenModal}>
          <div className="cl-action-left">
            <div className="cl-action-icon">
              <Plus size={24} />
            </div>
            <div className="cl-action-text">
              <h4>Add Content</h4>
              <p>Add new content to your course</p>
            </div>
          </div>
          <ArrowRight size={24} className="cl-arrow" />
        </div>

      </div>

    </div>
  );
};

export default ContentList;