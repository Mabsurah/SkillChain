import React, { useState } from 'react';
import BasicInfo from './BasicInfo';
import SkillSetup from './SkillSetup';
import { Compass } from 'lucide-react';
import './Register.css';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  return (
    <>
      {step === 1 ? (
        // STEP 1: The Dark Glassmorphism Theme
        <div className="register-page-container">
          <div className="register-glass-card">
            <div className="register-header">
              <Compass size={32} />
              <h2>Register To Learn & Contribute</h2>
            </div>
            <BasicInfo setStep={setStep} setFormData={setFormData} formData={formData} />
          </div>
        </div>
      ) : (
        // STEP 2: The Light Pastel Theme
        <SkillSetup formData={formData} />
      )}
    </>
  );
};

export default Register;