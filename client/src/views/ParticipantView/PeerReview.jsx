import React from 'react';
// 1. IMPORT useNavigate HERE
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import './PeerReview.css';

const PeerReview = () => {
  // 2. INITIALIZE THE NAVIGATE FUNCTION
  const navigate = useNavigate();

  // Mock Data: You can fetch this from your database later
  const reviewTasks = [
    {
      id: 1,
      title: 'C Programming Course',
      completed: 4,
      total: 10,
    },
    {
      id: 2,
      title: 'Database Management System',
      completed: 7,
      total: 30,
    },
    {
      id: 3,
      title: 'JavaScript Essentials',
      completed: 12,
      total: 20,
    },
    {
      id: 4,
      title: 'Python Programming',
      completed: 9,
      total: 25,
    },
    {
      id: 5,
      title: 'Data Structures & Algorithms',
      completed: 3,
      total: 15,
    },
    {
      id: 6,
      title: 'Web Development Basics',
      completed: 6,
      total: 18,
    }
  ];

  return (
    <div className="peer-review-container">
      
      {/* Header */}
      <div className="pr-header-section">
        <div className="pr-header-left">
          <h2>Peer Review</h2>
          <p>Review your peers' work and help each other improve.</p>
        </div>
        
        <button className="guidelines-btn">
          <FileText size={18} />
          Review Guidelines
        </button>
      </div>

      {/* Grid of Courses */}
      <div className="pr-grid">
        {reviewTasks.map((task) => {
          // Calculate percentage for the progress bar width
          const progressPercentage = (task.completed / task.total) * 100;

          return (
            <div className="pr-card" key={task.id}>
              <h3 className="pr-course-title">{task.title}</h3>
              
              <div className="pr-progress-info">
                <span className="pr-progress-label">Review progress</span>
                <span className="pr-progress-ratio">
                  {task.completed} / {task.total}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="pr-progress-track">
                <div 
                  className="pr-progress-fill" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

              {/* 3. ATTACH THE ONCLICK TO NAVIGATE TO THE NEW PAGE */}
              <button 
                className="review-now-btn"
                onClick={() => navigate('/participant/review-content')}
              >
                Review Now
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default PeerReview;