import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Key } from 'lucide-react';
import './Login.css'; // This links your new CSS file!

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    
    // DEMO LOGIC FOR PRESENTATION:
    // If you type "admin" anywhere in the email box, it takes you to the Admin page.
    // Otherwise, it logs you in as a normal participant.
    if (email.toLowerCase().includes('admin')) {
      navigate('/admin/dashboard');
    } else {
      navigate('/participant/dashboard');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-glass-card">
        <h2 className="login-title">Welcome Back!</h2>
        
        <form onSubmit={handleLogin}>
          
          <div className="input-group-custom">
            <label>Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={22} />
              <input 
                type="text" 
                placeholder="Enter your email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group-custom">
            <label>Password</label>
            <div className="input-wrapper">
              <Key className="input-icon" size={22} />
              <input 
                type="password" 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="login-btn">Log In</button>
        
        </form>

        <div className="login-footer">
          <span>Don't have an account?</span>
          <Link to="/register" className="register-link">Register</Link>
        </div>

      </div>
    </div>
  );
};

export default Login;