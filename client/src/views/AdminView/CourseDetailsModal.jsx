import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, Shield, Star } from 'lucide-react';
import './CourseDetailsModal.css';

const CourseDetailsModal = ({ isOpen, course, onClose }) => {
  const [details, setDetails] = useState(null);

  // Modal open hole Database (View + Function) theke data fetch korbe
  useEffect(() => {
    if (isOpen && course) {
      setDetails(null); 
      fetch(`http://localhost:5000/api/course-details/${course.id}`)
        .then(res => res.json())
        .then(data => setDetails(data))
        .catch(err => setDetails({ error: "Database theke data ashte fail koreche!" }));
    }
  }, [isOpen, course]);

  if (!isOpen || !course) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-gradient-border" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          
          <div className="modal-header">
            <h2>{course.title}</h2>
            <button className="close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>

          {!details ? (
            <p style={{textAlign: 'center', padding: '30px', color: '#fff'}}>
              Loading Real Instructor Data from Oracle...
            </p>
          ) : details.error ? (
            <p style={{textAlign: 'center', padding: '30px', color: '#ef4444'}}>
              Backend Error: Database er sathe connect kora jayni.
            </p>
          ) : (
            <>
              {/* First Card - Real Instructor Data */}
              <div className="instructor-card">
                <div className="instructor-left">
                  <div className="instructor-avatar">
                    {/* Fallback added for uppercase/lowercase keys */}
                    {(details.INSTRUCTOR_NAME || details.instructor_name) ? (details.INSTRUCTOR_NAME || details.instructor_name).charAt(0) : 'U'}
                  </div>
                  <div className="instructor-info">
                    <span className="instructor-label">Instructor</span>
                    {/* Database theke asha asol nam */}
                    <h3 className="instructor-name">{details.INSTRUCTOR_NAME || details.instructor_name || 'No Name Found'}</h3>
                  </div>
                </div>

                <div className="vertical-divider"></div>

                <div className="instructor-right">
                  <div className="contact-item">
                    <Mail size={18} className="contact-icon" />
                    <span>{details.EMAIL || details.email}</span>
                  </div>
                  <div className="contact-item">
                    <Phone size={18} className="contact-icon" />
                    <span>{details.PHONE || details.phone || 'No Phone Added'}</span>
                  </div>
                  <div className="contact-item">
                    <MapPin size={18} className="contact-icon" />
                    <span>{details.ADDRESS_CITY || details.address_city}, Bangladesh</span>
                  </div>
                  {/* Database Function theke asha Average Rating */}
                  <div className="contact-item" style={{color: '#f59e0b'}}>
                    <Star size={18} className="contact-icon" />
                    <span>{details.AVG_RATING || details.avg_rating || 0} / 5 Rating</span>
                  </div>
                </div>
              </div>

              {/* Second Card - Course Information (Certificate List muchhe deya hoyeche) */}
              <h3 className="section-title">Course Information</h3>
              <div className="certificate-card">
                <div className="certificate-item">
                  <div className="cert-icon-wrapper">
                    <Shield size={20} />
                  </div>
                  <span className="cert-name">Course ID: {course.id}</span>
                </div>
                
                <div className="horizontal-divider"></div>
                
                <div className="certificate-item">
                  <div className="cert-icon-wrapper">
                    <Shield size={20} />
                  </div>
                  <span className="cert-name">Level: {course.level}</span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default CourseDetailsModal;