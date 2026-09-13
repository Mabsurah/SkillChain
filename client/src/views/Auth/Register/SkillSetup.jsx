import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CloudUpload, Award, BookOpen, Heart, CheckCircle2 } from 'lucide-react';
import { api } from '../../../services/api';
import './SkillSetup.css';

const SkillSetup = ({ formData }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileBase64, setUploadedFileBase64] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFileBase64(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteRegistration = async (selectedRole) => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        role: selectedRole || 'participant',
        certificateName: uploadedFile ? uploadedFile.name : null,
        imageBase64: uploadedFileBase64 || null
      };

      const res = await api.register(payload);
      if (res && res.success) {
        alert(`✅ [DATABASE REGISTRATION SUCCESSFUL]\nUser and Participant records created and committed in Oracle Database!\n\n${res.message}`);
        navigate('/login');
      } else {
        alert(`⚠️ Registration Not Saved to Database:\n\n${res?.message || 'Could not complete registration in database.'}`);
      }
    } catch (err) {
      alert(`⚠️ Registration Error: ${err.message || 'Failed to connect to backend server.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="role-page-wrapper">
      
      {/* Header */}
      <div className="role-header-section">
        <Users size={48} className="users-icon" color="#8b5cf6" />
        <div className="role-header-title-container">
          <span className="accent-dash accent-blue">=-</span>
          <h2>Choose Your Role</h2>
          <span className="accent-dash accent-pink">-=</span>
        </div>
        <p>Pick the option that best describes your intent in the platform.</p>
      </div>

      <div className="cards-container">
        
        {/* OR Badge */}
        <div className="or-badge">OR</div>

        {/* LEFT CARD: Teacher / Contributor */}
        <div className="role-card teacher-card">
          <div className="illustration-circle">
            <Award size={64} color="#60a5fa" strokeWidth={1.5} />
          </div>
          
          <h3>Are You Here<br/>To Contribute?</h3>
          <div className="role-tag teacher-tag">| Instructor |</div>
          <p className="role-desc">
            Upload your certificate<br/>and join directly to teach and contribute.
          </p>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            style={{ display: 'none' }} 
            accept="image/*,.pdf"
          />
          
          <button 
            className={`upload-btn ${uploadedFile ? 'file-uploaded' : ''}`} 
            onClick={handleUploadClick}
          >
            {uploadedFile ? (
              <>
                <CheckCircle2 size={20} color="#4ade80" />
                Uploaded: {uploadedFile.name.length > 18 ? uploadedFile.name.substring(0, 15) + '...' : uploadedFile.name}
              </>
            ) : (
              <>
                <CloudUpload size={20} color="#93c5fd" />
                Upload Your Certificate
              </>
            )}
          </button>
          
          <button 
            className="submit-btn" 
            onClick={() => handleCompleteRegistration('instructor')}
            disabled={!uploadedFile || submitting}
          >
            {submitting ? 'Registering...' : 'Submit to Database'}
          </button>
        </div>

        {/* RIGHT CARD: Newbie */}
        <div className="role-card newbie-card">
          <div className="illustration-circle">
            <BookOpen size={64} color="#c084fc" strokeWidth={1.5} />
          </div>
          
          <h3>Don't Have<br/>Any Skill?</h3>
          <div className="role-tag newbie-tag">| Newbie Learner |</div>
          <p className="role-desc">
            No need to worry!<br/>Learn first and contribute later.
          </p>

          <button 
            className="enroll-btn" 
            onClick={() => handleCompleteRegistration('participant')}
            disabled={submitting}
          >
            <BookOpen size={20} style={{marginRight: '8px', verticalAlign: 'text-bottom'}} />
            {submitting ? 'Registering...' : 'Enroll as a Newbie'}
          </button>
        </div>

      </div>

      {/* Footer */}
      <div className="role-footer">
        <Heart size={16} color="#ec4899" fill="#ec4899" />
        <span>Together, we learn. Together, we grow</span>
        <Heart size={16} color="#ec4899" fill="#ec4899" />
      </div>

    </div>
  );
};

export default SkillSetup;