import React from 'react';
import { Calendar, Mail, Phone, Key, PhoneCall } from 'lucide-react';

const BasicInfo = ({ setStep, setFormData, formData }) => {
  const handleNext = (e) => {
    e.preventDefault();
    setStep(2); // Moves to the Skill Setup window
  };

  return (
    <form onSubmit={handleNext}>
      
      {/* SECTION 1: Personal Info */}
      <h4 className="section-title">Personal Info</h4>
      
      <div className="grid-2">
        <input type="text" className="glass-input" placeholder="First Name" required />
        <input type="text" className="glass-input" placeholder="Last Name" required />
      </div>

      <div className="form-row-side-label">
        <label>Date of Birth</label>
        <div className="form-input-container">
          <Calendar className="input-icon-reg" size={18} />
          <input type="text" className="glass-input with-icon" placeholder="DD/MM/YYYY" required />
        </div>
      </div>

      <div className="form-row-side-label">
        <label>Email</label>
        <div className="form-input-container">
          <Mail className="input-icon-reg" size={18} />
          <input type="email" className="glass-input with-icon" required />
        </div>
      </div>

      <div className="form-row-side-label">
        <label>Phone No.</label>
        <div className="form-input-container">
          <Phone className="input-icon-reg" size={18} />
          <input type="tel" className="glass-input with-icon" required />
        </div>
      </div>

      {/* NEW: Alternative Phone No. Section */}
      <div className="form-row-side-label">
        <label>Alt. Phone No.</label>
        <div className="form-input-container">
          <PhoneCall className="input-icon-reg" size={18} />
          <input type="tel" className="glass-input with-icon" placeholder="(Optional)" />
        </div>
      </div>

      <div className="form-row-side-label">
        <label>Password</label>
        <div className="form-input-container">
          <Key className="input-icon-reg" size={18} />
          <input type="password" className="glass-input with-icon" placeholder="••••••••" required />
        </div>
      </div>


      {/* SECTION 2: Location */}
      <h4 className="section-title">Location</h4>
      
      <div className="grid-3">
        <div className="grid-col">
          <label>Division</label>
          <input type="text" className="glass-input" required />
        </div>
        <div className="grid-col">
          <label>District</label>
          <input type="text" className="glass-input" required />
        </div>
        <div className="grid-col">
          <label>City</label>
          <input type="text" className="glass-input" required />
        </div>
      </div>

      <div className="grid-3">
        <div className="grid-col">
          <label>Area</label>
          <input type="text" className="glass-input" required />
        </div>
        <div className="grid-col">
          <label>Road</label>
          <input type="text" className="glass-input" required />
        </div>
        <div className="grid-col">
          <label>House No.</label>
          <input type="text" className="glass-input" required />
        </div>
      </div>

      {/* FOOTER: Next Button */}
      <div className="next-btn-container">
        <button type="submit" className="btn-next-glass">Next</button>
      </div>

    </form>
  );
};

export default BasicInfo;