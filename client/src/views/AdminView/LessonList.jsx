import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, XCircle } from 'lucide-react';
import './LessonList.css';

const LessonList = () => {
  const [activeVideo, setActiveVideo] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const courseId = location.state?.courseId || 'C001'; 
  const courseTitle = location.state?.courseTitle || 'Course Videos';

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/lessons/${courseId}`);
        const data = await response.json();
        
        const formattedData = data.map((item, index) => {
          // PL/SQL Cursor by default Array return kore. Tai Array naki Object oita check kore value nite hobe.
          const isArray = Array.isArray(item);
          return {
            id: index + 1,
            assetId: isArray ? item[0] : (item.ASSET_ID || item.asset_id),
            title: isArray ? item[1] : (item.ASSET_TITLE || item.asset_title || 'Video Lesson'),
            videoUrl: isArray ? item[2] : (item.ASSET_URL || item.asset_url || '')
          };
        });

        setLessons(formattedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching lessons:", error);
        setLoading(false);
      }
    };
    fetchLessons();
  }, [courseId]);

  const handleWatchVideo = (lesson) => {
    let embedUrl = lesson.videoUrl;
    if (!embedUrl || !embedUrl.includes('youtube.com/embed')) {
       embedUrl = 'https://www.youtube.com/embed/wEWHq8FzdMw'; 
    }
    setActiveVideo(embedUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="lesson-list-container">
      <div className="ll-header-section">
        <h2>{courseTitle} - Lesson List</h2>
        <p>Inspect lesson details and monitor the curriculum structure</p>
      </div>

      {activeVideo && (
        <div style={{
          background: '#090e1a', padding: '20px', borderRadius: '12px',
          border: '1px solid rgba(139, 92, 246, 0.4)', marginBottom: '35px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative'
        }}>
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

      <div className="ll-list-wrapper">
        {loading ? (
          <div style={{textAlign: 'center', color: '#fff', padding: '40px'}}>
            Loading lessons directly from Oracle PL/SQL Cursor...
          </div>
        ) : lessons.length > 0 && lessons[0].assetId !== 'ERR' ? (
          lessons.map((lesson) => {
            const formattedNumber = String(lesson.id).padStart(2, '0');
            return (
              <div className="ll-lesson-card" key={lesson.assetId}>
                <div className="ll-lesson-info">
                  <div className="ll-number-badge">{formattedNumber}</div>
                  <h3 className="ll-lesson-title">{lesson.title}</h3>
                </div>
                <div className="ll-actions-wrapper">
                  <button className="ll-watch-btn" onClick={() => handleWatchVideo(lesson)}>
                    Watch Now <ArrowRight size={18} className="ll-btn-icon" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{textAlign: 'center', color: '#ef4444', padding: '40px'}}>
             {lessons.length > 0 ? lessons[0].title : 'No lessons found.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonList;