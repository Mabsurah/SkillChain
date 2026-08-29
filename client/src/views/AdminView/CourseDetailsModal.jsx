import React from 'react';
import { X, Mail, Phone, MapPin, Shield } from 'lucide-react';
import './CourseDetailsModal.css';

const CourseDetailsModal = ({ isOpen, course, onClose }) => {
  if (!isOpen || !course) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-gradient-border" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          
          {/* Header using dynamic course title */}
          <div className="modal-header">
            <h2>{course.title}</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          {/* First Card - Instructor */}
          <div className="instructor-card">
            <div className="instructor-left">
              <div className="instructor-avatar">AS</div>
              <div className="instructor-info">
                <span className="instructor-label">Instructor</span>
                <h3 className="instructor-name">Anik Sarker</h3>
              </div>
            </div>

            <div className="vertical-divider"></div>

            <div className="instructor-right">
              <div className="contact-item">
                <Mail size={18} className="contact-icon" />
                <span>anik.sarker@example.com</span>
              </div>
              <div className="contact-item">
                <Phone size={18} className="contact-icon" />
                <span>+880 1712 345678</span>
              </div>
              <div className="contact-item">
                <MapPin size={18} className="contact-icon" />
                <span>Dhaka, Bangladesh</span>
              </div>
            </div>
          </div>

          {/* Second Card - Certificate List */}
          <h3 className="section-title">Certificate List</h3>
          <div className="certificate-card">
            <div className="certificate-item">
              <div className="cert-icon-wrapper">
                <Shield size={20} />
              </div>
              <span className="cert-name">{course.title} Fundamentals</span>
            </div>
            
            <div className="horizontal-divider"></div>
            
            <div className="certificate-item">
              <div className="cert-icon-wrapper">
                <Shield size={20} />
              </div>
              <span className="cert-name">Advanced {course.title}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CourseDetailsModal;