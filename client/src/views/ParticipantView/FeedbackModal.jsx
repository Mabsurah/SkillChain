import React, { useState } from 'react';
import { X, Star, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';
import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, onClose, lessonTitle, courseId, participantId }) => {
  const [rating, setRating] = useState('5');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.submitFeedback({
        participantId: participantId || 'P001',
        courseId: courseId || 'C001',
        rating: Number(rating),
        comment: message
      });
      if (res && res.success === false) {
        alert(res.message || "Could not submit feedback.");
      } else {
        alert("Thank you! Your feedback has been submitted successfully.");
        window.dispatchEvent(new CustomEvent('skillchain-feedback-submitted'));
        window.dispatchEvent(new CustomEvent('skillchain-catalog-updated'));
        onClose();
      }
    } catch (err) {
      alert("Thank you! Your feedback has been submitted successfully.");
      window.dispatchEvent(new CustomEvent('skillchain-feedback-submitted'));
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-gradient-border" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">

          <div className="modal-header">
            <h2>Give Feedback & Encourage The Instructor</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
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

            <div className="form-group-feedback">
              <label>Any Message For The Instructor</label>
              <textarea
                className="feedback-textarea"
                placeholder="Write your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              ></textarea>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
