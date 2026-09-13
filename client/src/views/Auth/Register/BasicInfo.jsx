import React from 'react';
import { Calendar, Mail, Phone, Key, PhoneCall } from 'lucide-react';

const BasicInfo = ({ setStep, setFormData, formData }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    setStep(2); // Moves to the Skill Setup window
  };

  return (
    <form onSubmit={handleNext}>
      
      {/* SECTION 1: Personal Info */}
      <h4 className="section-title">Personal Info</h4>
      
      <div className="grid-2">
        <input 
          type="text" 
          name="firstName" 
          className="glass-input" 
          placeholder="First Name" 
          required 
          value={formData.firstName || ''}
          onChange={handleChange}
        />
        <input 
          type="text" 
          name="lastName" 
          className="glass-input" 
          placeholder="Last Name" 
          required 
          value={formData.lastName || ''}
          onChange={handleChange}
        />
      </div>

      <div className="form-row-side-label">
        <label>Date of Birth</label>
        <div className="form-input-container">
          <Calendar className="input-icon-reg" size={18} />
          <input 
            type="text" 
            name="dob" 
            className="glass-input with-icon" 
            placeholder="DD/MM/YYYY" 
            required 
            value={formData.dob || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row-side-label">
        <label>Email</label>
        <div className="form-input-container">
          <Mail className="input-icon-reg" size={18} />
          <input 
            type="email" 
            name="email" 
            className="glass-input with-icon" 
            required 
            value={formData.email || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row-side-label">
        <label>Phone No.</label>
        <div className="form-input-container">
          <Phone className="input-icon-reg" size={18} />
          <input 
            type="tel" 
            name="phone" 
            className="glass-input with-icon" 
            required 
            value={formData.phone || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row-side-label">
        <label>Alt. Phone No.</label>
        <div className="form-input-container">
          <PhoneCall className="input-icon-reg" size={18} />
          <input 
            type="tel" 
            name="altPhone" 
            className="glass-input with-icon" 
            placeholder="(Optional)" 
            value={formData.altPhone || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row-side-label">
        <label>Password</label>
        <div className="form-input-container">
          <Key className="input-icon-reg" size={18} />
          <input 
            type="password" 
            name="password" 
            className="glass-input with-icon" 
            placeholder="••••••••" 
            required 
            value={formData.password || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* SECTION 2: Location */}
      <h4 className="section-title">Location</h4>
      
      <div className="grid-3">
        <div className="grid-col">
          <label>Division</label>
          <input 
            type="text" 
            name="division" 
            className="glass-input" 
            required 
            value={formData.division || ''}
            onChange={handleChange}
          />
        </div>
        <div className="grid-col">
          <label>District</label>
          <input 
            type="text" 
            name="district" 
            className="glass-input" 
            required 
            value={formData.district || ''}
            onChange={handleChange}
          />
        </div>
        <div className="grid-col">
          <label>City</label>
          <input 
            type="text" 
            name="city" 
            className="glass-input" 
            required 
            value={formData.city || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid-3">
        <div className="grid-col">
          <label>Area</label>
          <input 
            type="text" 
            name="area" 
            className="glass-input" 
            required 
            value={formData.area || ''}
            onChange={handleChange}
          />
        </div>
        <div className="grid-col">
          <label>Road</label>
          <input 
            type="text" 
            name="road" 
            className="glass-input" 
            required 
            value={formData.road || ''}
            onChange={handleChange}
          />
        </div>
        <div className="grid-col">
          <label>House No.</label>
          <input 
            type="text" 
            name="house" 
            className="glass-input" 
            required 
            value={formData.house || ''}
            onChange={handleChange}
          />
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