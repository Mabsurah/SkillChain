import React from 'react';
import { LineChart } from 'lucide-react';
import './Track.css';

const CircularProgress = ({ percentage }) => {
  // Adjusted radius to fit the new 110px circle perfectly
  const radius = 46; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="progress-circle-container">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <defs>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        
        <circle cx="55" cy="55" r={radius} className="circle-bg" />
        
        <circle 
          cx="55" 
          cy="55" 
          r={radius} 
          className="circle-progress"
          style={{ 
            strokeDasharray: circumference, 
            strokeDashoffset: strokeDashoffset 
          }} 
        />
      </svg>

      <div className="progress-text">
        <span className="percent-val">{percentage}%</span>
        <span className="percent-label">Progress</span>
      </div>
    </div>
  );
};

const Track = () => {
  const coursesProgress = [
    {
      id: 1,
      title: 'C Programming Course',
      completedLessons: 3,
      totalLessons: 10,
      percentage: 30,
    },
    {
      id: 2,
      title: 'Database Management Course',
      completedLessons: 10,
      totalLessons: 30,
      percentage: 33,
    }
  ];

  return (
    <div className="track-page-container">
      
      <div className="track-header-section">
        <div className="track-header-left">
          <h2>Learning Progress</h2>
          <p>Track your course progress and keep learning consistently.</p>
        </div>
        <div className="track-header-icon">
          <LineChart size={24} />
        </div>
      </div>

      <div className="course-progress-list">
        {coursesProgress.map((course) => (
          <div className="progress-card" key={course.id}>
            
            <div className="course-info">
              <h3>{course.title}</h3>
              <p>{course.completedLessons} out of {course.totalLessons} lessons completed</p>
            </div>

            <CircularProgress percentage={course.percentage} />
            
          </div>
        ))}
      </div>

    </div>
  );
};

export default Track;