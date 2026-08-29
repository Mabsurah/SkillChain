import React, { useState } from 'react';
import { ArrowRight, XCircle } from 'lucide-react';
import './LessonList.css';

const LessonList = () => {
  const [activeVideo, setActiveVideo] = useState(null);

  const courseLessons = [
    {
      id: 1,
      title: 'Introduction to C programming',
      videoUrl: 'https://www.youtube.com/embed/WDX1gLtCIlc' 
    },
    {
      id: 2,
      title: 'First C Program',
      videoUrl: 'https://www.youtube.com/embed/wEWHq8FzdMw'
    },
    {
      id: 3,
      title: 'Variables and Data Types in C',
      videoUrl: '#'
    },
    {
      id: 4,
      title: 'Operators in C',
      videoUrl: '#'
    },
    {
      id: 5,
      title: 'Decision Making in C',
      videoUrl: '#'
    }
  ];

  const handleWatchVideo = (lesson) => {
    if (lesson.videoUrl !== '#') {
      setActiveVideo(lesson.videoUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert("Video link coming soon!");
    }
  };

  return (
    <div className="lesson-list-container">
      
      {/* Header */}
      <div className="ll-header-section">
        <h2>Lesson List</h2>
        <p>Inspect lesson details and monitor the curriculum structure</p>
      </div>

      {/* THE VIDEO PLAYER */}
      {activeVideo && (
        <div style={{
          background: '#090e1a',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          marginBottom: '35px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          position: 'relative'
        }}>
          {/* Close Button */}
          <button 
            onClick={() => setActiveVideo(null)}
            style={{
              position: 'absolute', top: '15px', right: '15px', 
              background: 'transparent', border: 'none', 
              color: '#ef4444', cursor: 'pointer', zIndex: 10
            }}
          >
            <XCircle size={28} />
          </button>

          {/* YouTube iFrame Embed */}
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '8px', overflow: 'hidden' }}>
            <iframe 
              src={`${activeVideo}?autoplay=1`} 
              title="Course Video Player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            ></iframe>
          </div>
        </div>
      )}

      {/* List of Lessons */}
      <div className="ll-list-wrapper">
        
        {courseLessons.map((lesson) => {
          const formattedNumber = String(lesson.id).padStart(2, '0');

          return (
            <div className="ll-lesson-card" key={lesson.id}>
              
              <div className="ll-lesson-info">
                <div className="ll-number-badge">
                  {formattedNumber}
                </div>
                <h3 className="ll-lesson-title">{lesson.title}</h3>
              </div>

              {/* Action Buttons Container */}
              <div className="ll-actions-wrapper">
                
                {/* Watch Now Button Only */}
                <button 
                  className="ll-watch-btn" 
                  onClick={() => handleWatchVideo(lesson)}
                >
                  Watch Now <ArrowRight size={18} className="ll-btn-icon" />
                </button>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
};

export default LessonList;