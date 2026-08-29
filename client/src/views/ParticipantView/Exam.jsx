import React from 'react';
import { FileText, Clock, ArrowRight, CheckCircle } from 'lucide-react'; // Removed ChevronRight
import './Exam.css';

const Exam = () => {
  // Mock Data: Pending Test
  const pendingTest = {
    title: 'Database Management System',
    duration: '30 minutes only',
  };

  // Mock Data: Completed Tests
  const completedTests = [
    {
      id: 1,
      title: 'C Programming Course',
      duration: '45 minutes',
      score: 70,
    },
    {
      id: 2,
      title: 'JavaScript Essentials',
      duration: '25 minutes',
      score: 85,
    },
    {
      id: 3,
      title: 'Python Programming',
      duration: '40 minutes',
      score: 90,
    },
    {
      id: 4,
      title: 'Data Structures & Algorithms',
      duration: '60 minutes',
      score: 80,
    }
  ];

  return (
    <div className="exam-page-container">
      
      {/* Header */}
      <div className="exam-header-section">
        <div className="exam-header-left">
          <h2>Exam & Result</h2>
          <p>Take tests, track your results and keep improving.</p>
        </div>
        <div className="exam-header-icon">
          <FileText size={22} />
        </div>
      </div>

      {/* Pending Test Section */}
      <div className="pending-section">
        <div className="pending-card">
          <div className="pending-info">
            <div className="pending-label">Pending Test</div>
            <h3 className="pending-title">{pendingTest.title}</h3>
            <div className="duration-info">
              <Clock size={16} className="duration-icon" />
              <span>Duration: {pendingTest.duration}</span>
            </div>
          </div>
          <button className="take-test-btn">
            Take Test <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Completed Tests Section */}
      <div className="completed-section">
        <h3 className="section-subtitle">Completed Tests</h3>
        
        <div className="completed-list">
          {completedTests.map((test) => (
            <div className="completed-card" key={test.id}>
              
              {/* Left Side: Title & Duration */}
              <div className="completed-info">
                <h3>{test.title}</h3>
                <div className="duration-info">
                  <span>Duration: {test.duration}</span>
                </div>
              </div>

              {/* Right Side: Score & Badge */}
              <div className="completed-metrics">
                <div className="score-text">
                  Achieved <span>{test.score}%</span> marks!
                </div>
                
                <div className="completed-badge">
                  Completed <CheckCircle size={16} />
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Exam;