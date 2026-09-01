import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin, Shield, Star } from 'lucide-react';
import './CourseDetailsModal.css';

const CourseDetailsModal = ({ isOpen, course, onClose }) => {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (isOpen && course) {
      setDetails(null); 
      fetch(`http://localhost:5000/api/course-details/${course.id}`)
        .then(res => res.json())
        .then(data => setDetails(data))
        .catch(err => setDetails({ error: true }));
    }
  }, [isOpen, course]);

  if (!isOpen || !course) return null;

  // Comma separated certificates ke theek moto array te convert kora (khub strict logic)
  const certString = details ? (details.CERTIFICATES || details.certificates) : null;
  const certList = certString 
    ? certString.split(',').map(item => item.trim()).filter(item => item !== '') 
    : [];

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
              Error: Failed to fetch database.
            </p>
          ) : (
            <>
              <div className="instructor-card">
                <div className="instructor-left">
                  <div className="instructor-avatar">
                    {(details.INSTRUCTOR_NAME || details.instructor_name) ? (details.INSTRUCTOR_NAME || details.instructor_name).charAt(0) : 'U'}
                  </div>
                  <div className="instructor-info">
                    <span className="instructor-label">Instructor</span>
                    <h3 className="instructor-name">{details.INSTRUCTOR_NAME || details.instructor_name || 'No Name'}</h3>
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
                  <div className="contact-item" style={{color: '#f59e0b'}}>
                    <Star size={18} className="contact-icon" />
                    <span>{details.AVG_RATING || details.avg_rating || 0} / 5 Rating</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Certificate List */}
              <h3 className="section-title">Certificate List</h3>
              <div className="certificate-card">
                {certList.length > 0 ? (
                  certList.map((certName, index) => (
                    <React.Fragment key={index}>
                      <div className="certificate-item">
                        <div className="cert-icon-wrapper">
                          <Shield size={20} />
                        </div>
                        <span className="cert-name">{certName}</span>
                      </div>
                      {/* Shesher item chara baki shob gulor niche divider hobe */}
                      {index !== certList.length - 1 && <div className="horizontal-divider"></div>}
                    </React.Fragment>
                  ))
                ) : (
                  <div className="certificate-item">
                    <span className="cert-name" style={{ color: '#94a3b8' }}>No verified certificates found for this instructor.</span>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default CourseDetailsModal;