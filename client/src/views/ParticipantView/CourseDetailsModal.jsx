import React from 'react';
import { X, Mail, Phone, MapPin, Shield, Coins } from 'lucide-react';
import './CourseDetailsModal.css';

const CourseDetailsModal = ({ isOpen, onClose, course }) => {
  if (!isOpen) return null;

  const title = course ? (course.title || course.course_title || 'Course Details') : 'Course Details';
  const instructorName = course ? (course.instructorName || 'Anik Sarker') : 'Anik Sarker';
  const instructorEmail = course ? (course.instructorEmail || 'anik.sarker@example.com') : 'anik.sarker@example.com';
  const skillName = course ? (course.skillName || 'Programming Foundations') : 'Programming Foundations';
  const price = course ? (course.charge || course.price || 1200) : 1200;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-gradient-border" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          
          {/* Header */}
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          {/* Instructor Card */}
          <div className="instructor-card">
            <div className="instructor-left">
              <div className="instructor-avatar">
                {instructorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="instructor-info">
                <span className="instructor-label">Course Instructor</span>
                <h3 className="instructor-name">{instructorName}</h3>
              </div>
            </div>

            <div className="vertical-divider"></div>

            <div className="instructor-right">
              <div className="contact-item">
                <Mail size={18} className="contact-icon" />
                <span>{instructorEmail}</span>
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

          {/* Certificate & Skill Overview */}
          <h3 className="section-title">Verified Skill &amp; Credentials</h3>
          <div className="certificate-card">
            <div className="certificate-item">
              <div className="cert-icon-wrapper">
                <Shield size={20} />
              </div>
              <span className="cert-name">Associated Skill: {skillName}</span>
            </div>
            
            <div className="horizontal-divider"></div>
            
            <div className="certificate-item">
              <div className="cert-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                <Coins size={20} />
              </div>
              <span className="cert-name">Enrollment Cost: <strong style={{ color: '#fbbf24' }}>{price} Credits</strong></span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CourseDetailsModal;