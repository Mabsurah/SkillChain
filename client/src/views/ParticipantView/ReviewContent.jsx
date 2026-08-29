import React, { useState } from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import './ReviewContent.css';

const ReviewContent = () => {
  // 1. Added a 'status' property to track the action taken
  const [reviewLessons, setReviewLessons] = useState([
    { id: 1, title: 'Introduction to C programming', videoUrl: 'https://www.youtube.com/watch?v=WDX1gLtCIlc', status: null },
    { id: 2, title: 'First C Program', videoUrl: 'https://www.youtube.com/watch?v=wEWHq8FzdMw', status: null },
    { id: 3, title: 'Variables and Data Types in C', videoUrl: '#', status: null },
    { id: 4, title: 'Operators in C', videoUrl: '#', status: null },
    { id: 5, title: 'Decision Making in C', videoUrl: '#', status: null }
  ]);

  // 2. Updated to change the status instead of deleting the item
  const handleAction = (id, title, actionType) => {
    if (window.confirm(`Are you sure you want to ${actionType} "${title}"?`)) {
      setReviewLessons(prev => prev.map(lesson => 
        lesson.id === id ? { ...lesson, status: actionType } : lesson
      ));
    }
  };

  const handleWatchVideo = (url) => {
    if (url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert("Video link coming soon!");
    }
  };

  return (
    <div className="review-content-container">
      
      {/* Header */}
      <div className="rc-header">
        <h2>Review Course Content</h2>
        <p>Review the course content and take action to approve or reject each item.</p>
      </div>

      {/* List of Content to Review */}
      <div className="rc-list-wrapper">
        {reviewLessons.length > 0 ? (
          reviewLessons.map((lesson) => {
            const formattedNumber = String(lesson.id).padStart(2, '0');
            
            // 3. Check if this specific lesson has had an action taken
            const isActionTaken = lesson.status !== null;

            return (
              <div className="rc-lesson-card" key={lesson.id}>
                
                {/* Left Side: Number + Title */}
                <div className="rc-card-left">
                  <div className="rc-number-badge">{formattedNumber}</div>
                  <h3 className="rc-lesson-title">{lesson.title}</h3>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="rc-card-actions">
                  
                  <button 
                    className="rc-accept-btn"
                    onClick={() => handleAction(lesson.id, lesson.title, 'ACCEPT')}
                    disabled={isActionTaken} // Disables the button
                    style={{ 
                      opacity: isActionTaken ? 0.35 : 1, 
                      cursor: isActionTaken ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    <Check size={16} /> {lesson.status === 'ACCEPT' ? 'Accepted' : 'Accept'}
                  </button>

                  <button 
                    className="rc-reject-btn"
                    onClick={() => handleAction(lesson.id, lesson.title, 'REJECT')}
                    disabled={isActionTaken} // Disables the button
                    style={{ 
                      opacity: isActionTaken ? 0.35 : 1, 
                      cursor: isActionTaken ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    <X size={16} /> {lesson.status === 'REJECT' ? 'Rejected' : 'Reject'}
                  </button>
                  
                  {/* Watch button stays active so they can still see it later if they want */}
                  <button 
                    className="rc-watch-btn"
                    onClick={() => handleWatchVideo(lesson.videoUrl)}
                  >
                    Watch Now <ArrowRight size={16} />
                  </button>
                  
                </div>

              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
            <h3>All caught up!</h3>
            <p>There are no more items left to review for this course.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ReviewContent;