import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const res = await api.login({ email, password });

      if (res.success) {
        login(res.user || { email, role: res.role }, res.role, res.token);
        if (res.user?.participantId) {
          localStorage.setItem('participantId', res.user.participantId);
        }
        localStorage.setItem('userEmail', email);

        if (res.role === 'admin' || email.toLowerCase().includes('admin')) {
          navigate('/admin/dashboard');
        } else {
          navigate('/participant/dashboard');
        }
      } else {
        setError(res.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-bg">
        <div className="login-orb orb-1"></div>
        <div className="login-orb orb-2"></div>
        <div className="login-orb orb-3"></div>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">
            <Zap size={22} />
          </div>
          <div>
            <h1 className="brand-name">SkillChain</h1>
            <p className="brand-tagline">Learn by Contributing, Teach by Sharing.</p>
          </div>
        </div>

        <div className="login-divider-line"></div>

        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Sign in to continue your learning journey</p>

        {error && (
          <div className="login-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-wrap">
              <Mail size={16} className="input-prefix-icon" />
              <input
                type="email"
                placeholder="e.g. rahim@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-prefix-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(s => !s)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
                Authenticating...
              </span>
            ) : (
              <>
                Sign In <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer-links">
          <span>Don't have an account?</span>
          <Link to="/register" className="register-link-btn">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
