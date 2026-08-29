import React, { useState } from 'react';
import { X, Star, ChevronDown } from 'lucide-react';
import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, onClose, lessonTitle }) => {
  const [rating, setRating] = useState('1');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`Submitting feedback for "${lessonTitle}" - Rating: ${rating}, Message: ${message}`);
    alert("Thank you! Your feedback has been submitted successfully.");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-gradient-border" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          
          {/* Header */}
          <div className="modal-header">
            <h2>Give Feedback & Encourage The Instructor</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Rating Field */}
            <div className="form-group-feedback">
              <label>Rating</label>
              <div className="select-wrapper-custom">
                <Star size={18} className="select-star-icon" />
                <select 
                  className="feedback-select" 
                  value={rating} 
                  onChange={(e) => setRating(e.target.value)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
                <ChevronDown size={18} className="select-arrow-custom" />
              </div>
            </div>

            {/* Message Field */}
            <div className="form-group-feedback">
              <label>Any Message For The Instructor</label>
              <textarea 
                className="feedback-textarea" 
                placeholder="Write your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              ></textarea>
            </div>

            {/* Footer Buttons */}
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-submit">Submit</button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;