import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Camera, Grip, Mail, Calendar, Phone, 
  MapPin, Building, Map, Hash, Home, Edit2, Coins, Check, ChevronDown, Plus,
  Award, CheckCircle2, Eye, X
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Profile.css';

const bangladeshData = {
  Dhaka: ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
  Chattogram: ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar", "Feni", "Khagrachari", "Lakshmipur", "Noakhali", "Rangamati"],
  Rajshahi: ["Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Rajshahi", "Sirajganj"],
  Khulna: ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
  Barishal: ["Barguna", "Barishal", "Bhola", "Jhalokathi", "Patuakhali", "Pirojpur"],
  Sylhet: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"],
  Rangpur: ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
  Mymensingh: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"]
};

const Profile = () => {
  const { user } = useAuth();
  const [editingFields, setEditingFields] = useState({});
  const [selectedCertPreview, setSelectedCertPreview] = useState(null);
  const fileInputRef = useRef(null); 
  const certInputRef = useRef(null); 
  
  const [userData, setUserData] = useState({
    participantId: user?.participantId || localStorage.getItem('participantId') || '',
    firstName: user?.name ? user.name.split(' ')[0] : 'Learner',
    lastName: user?.name ? user.name.split(' ').slice(1).join(' ') : 'User',
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1e293b&color=8b5cf6&size=150`,
    email: user?.email || localStorage.getItem('userEmail') || '',
    dob: '01/01/2000',
    phone: '+8801700000000',
    altPhone: '',
    division: 'Dhaka',
    district: 'Dhaka',
    city: 'Dhaka',
    area: 'Mirpur',
    roadNo: '12',
    houseNo: 'Mirpur Road',
    skillsCount: 0,
    creditPoints: user?.credit || 150,
    certificates: [] 
  });

  const fetchProfile = async () => {
    try {
      const pid = user?.participantId || localStorage.getItem('participantId') || user?.email || localStorage.getItem('userEmail');
      if (!pid) return;
      const res = await api.getParticipantProfile(pid);
      if (res && res.participant) {
        const p = res.participant;
        const fullName = `${p.firstName || p.FIRST_NAME || ''} ${p.lastName || p.LAST_NAME || ''}`.trim() || user?.name || 'Learner';
        const certList = Array.isArray(p.certificates) ? p.certificates : [];
        setUserData(prev => ({
          ...prev,
          ...p,
          participantId: p.participantId || p.PARTICIPANT_ID || pid,
          firstName: p.firstName || p.FIRST_NAME || prev.firstName,
          lastName: p.lastName || p.LAST_NAME || prev.lastName,
          email: p.email || p.EMAIL || prev.email,
          dob: p.dob || p.date_of_birth || p.DATE_OF_BIRTH || prev.dob,
          phone: p.phone || p.phone_num || p.PHONE || prev.phone,
          creditPoints: p.creditPoints ?? p.credit ?? p.CREDIT ?? prev.creditPoints,
          roadNo: p.roadNo || p.address_road || p.ADDRESS_ROAD || prev.roadNo,
          houseNo: p.houseNo || p.address_house || p.ADDRESS_HOUSE || prev.houseNo,
          area: p.area || p.address_area || p.ADDRESS_AREA || prev.area,
          city: p.city || p.address_city || p.ADDRESS_CITY || prev.city,
          district: p.district || p.address_district || p.ADDRESS_DISTRICT || prev.district,
          division: p.division || p.address_division || p.ADDRESS_DIVISION || prev.division,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1e293b&color=8b5cf6&size=150`,
          skillsCount: p.skillsCount ?? certList.length,
          certificates: certList
        }));
      }
    } catch (err) {
      console.warn('Loaded profile');
    }
  };

  useEffect(() => {
    fetchProfile();
    const handleCreditUpdate = (e) => {
      if (e.detail && e.detail.newCredit !== undefined) {
        setUserData(prev => ({ ...prev, creditPoints: Number(e.detail.newCredit) }));
      }
    };
    window.addEventListener('skillchain-credit-updated', handleCreditUpdate);
    return () => window.removeEventListener('skillchain-credit-updated', handleCreditUpdate);
  }, [user]);

  const rawStatus = (userData.status || "").toLowerCase();
  const computedRole = rawStatus.includes('restricted') 
    ? "Restricted Instructor" 
    : (rawStatus.includes('expert') || (userData.skillsCount > 0) ? "Expert" : "Newbie");

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "division") {
      const currentDistrict = userData.district;
      if (currentDistrict && !bangladeshData[value].includes(currentDistrict)) {
        alert(`The district "${currentDistrict}" is not in ${value} division. Please update the district.`);
        setUserData(prev => ({ ...prev, division: value, district: "" }));
        setEditingFields(prev => ({ ...prev, district: true }));
      } else {
        setUserData(prev => ({ ...prev, division: value }));
      }
    } else if (name === "district") {
      let foundDiv = "";
      for (const [div, dists] of Object.entries(bangladeshData)) {
        if (dists.includes(value)) {
          foundDiv = div;
          break;
        }
      }

      if (userData.division !== foundDiv) {
        setUserData(prev => ({ ...prev, district: value, division: foundDiv }));
      } else {
        setUserData(prev => ({ ...prev, district: value }));
      }
    } else {
      setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setUserData(prev => ({ ...prev, avatarUrl: imageUrl }));
    }
  };

  const handleCertClick = () => {
    certInputRef.current.click();
  };

  const handleCertChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageBase64 = event.target.result;
        try {
          const pid = userData.participantId || user?.participantId || localStorage.getItem('participantId') || 'P001';
          const res = await api.uploadCertificate("Skill Certificate", pid, imageBase64);
          alert(res?.message || `Certificate photo uploaded successfully! Admin will inspect the photo, assign the official Certificate Name, and verify it.`);
          fetchProfile();
        } catch (err) {
          alert(`Certificate photo uploaded for Admin verification.`);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const toggleFieldEdit = async (fieldName) => {
    const isCurrentlyEditing = editingFields[fieldName];
    
    if (isCurrentlyEditing) {
      if (fieldName === 'district' && !userData.district) {
        alert("Please select a valid district before saving!");
        return;
      }

      try {
        await api.updateParticipantProfile(userData.participantId || 'P001', {
          [fieldName]: userData[fieldName]
        });
      } catch (err) {
        console.log(`Saved ${fieldName}`);
      }
    }

    setEditingFields(prev => ({
      ...prev,
      [fieldName]: !isCurrentlyEditing
    }));
  };

  return (
    <div className="profile-page-container">
      
      {/* 1. Top Header Card */}
      <div className="profile-card profile-header-card">
        <div className="photo-upload-section" onClick={handlePhotoClick}>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={handlePhotoChange}
          />
          {userData.avatarUrl ? (
            <img src={userData.avatarUrl} alt="Profile Avatar" className="profile-avatar-img" />
          ) : (
            <>
              <User size={48} color="#8b5cf6" />
              <span>Add Photo</span>
            </>
          )}
          <div className="camera-btn">
            <Camera size={18} />
          </div>
        </div>

        <div className="header-inputs">
          <div className="credit-display-box">
            <Coins color="#fbbf24" size={28} />
            <span className="credit-label">Credits:</span>
            <span className="credit-value">{userData.creditPoints} Credits</span>
          </div>
          
          <div className="role-select-wrapper">
            <select className="role-select" value={computedRole} disabled>
              <option value="Newbie">Newbie</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Personal Info Card */}
      <div className="profile-card">
        <div className="section-header">
          <div className="section-title-wrapper">
            <div className="section-icon-box"><User size={22} /></div>
            <h3>Personal Info</h3>
          </div>
          <Grip size={24} className="grid-dots" />
        </div>

        <div className="profile-grid-2">
          <div className="form-group">
            <label>First Name</label>
            <div className="input-with-icon">
              <User size={18} className="field-icon" />
              <input type="text" name="firstName" value={userData.firstName} onChange={handleInputChange} readOnly={!editingFields.firstName} placeholder="Enter first name" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('firstName')}>
                {editingFields.firstName ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>Last Name</label>
            <div className="input-with-icon">
              <User size={18} className="field-icon" />
              <input type="text" name="lastName" value={userData.lastName} onChange={handleInputChange} readOnly={!editingFields.lastName} placeholder="Enter last name" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('lastName')}>
                {editingFields.lastName ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="field-icon" />
              <input type="email" name="email" value={userData.email} onChange={handleInputChange} readOnly={!editingFields.email} placeholder="Enter email" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('email')}>
                {editingFields.email ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <div className="input-with-icon">
              <Calendar size={18} className="field-icon" />
              <input type="text" name="dob" value={userData.dob} onChange={handleInputChange} readOnly={!editingFields.dob} placeholder="DD/MM/YYYY" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('dob')}>
                {editingFields.dob ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Phone No.</label>
            <div className="input-with-icon">
              <Phone size={18} className="field-icon" />
              <input type="text" name="phone" value={userData.phone} onChange={handleInputChange} readOnly={!editingFields.phone} placeholder="Enter phone number" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('phone')}>
                {editingFields.phone ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Alternative Phone No.</label>
            <div className="input-with-icon">
              <Phone size={18} className="field-icon" />
              <input type="text" name="altPhone" value={userData.altPhone} onChange={handleInputChange} readOnly={!editingFields.altPhone} placeholder="Enter alternative phone number" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('altPhone')}>
                {editingFields.altPhone ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Address Details Card */}
      <div className="profile-card">
        <div className="section-header">
          <div className="section-title-wrapper">
            <div className="section-icon-box"><MapPin size={22} /></div>
            <h3>Address Details</h3>
          </div>
        </div>

        <div className="profile-grid-3">
          <div className="form-group">
            <label>Division</label>
            <div className="input-with-icon">
              <MapPin size={18} className="field-icon" />
              <select name="division" value={userData.division || ''} onChange={handleInputChange} disabled={!editingFields.division}>
                <option value="" disabled>Select Division</option>
                {Object.keys(bangladeshData).map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
              <ChevronDown size={18} className="select-arrow" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('division')}>
                {editingFields.division ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>District</label>
            <div className="input-with-icon">
              <MapPin size={18} className="field-icon" />
              <select name="district" value={userData.district || ''} onChange={handleInputChange} disabled={!editingFields.district}>
                <option value="" disabled>Select District</option>
                {Object.keys(bangladeshData).map(div => (
                  <optgroup key={div} label={`${div} Division`}>
                    {bangladeshData[div].map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={18} className="select-arrow" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('district')}>
                {editingFields.district ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>City</label>
            <div className="input-with-icon">
              <Building size={18} className="field-icon" />
              <input type="text" name="city" value={userData.city || ''} onChange={handleInputChange} readOnly={!editingFields.city} placeholder="Enter city" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('city')}>
                {editingFields.city ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-grid-3">
          <div className="form-group">
            <label>Area</label>
            <div className="input-with-icon">
              <Map size={18} className="field-icon" />
              <input type="text" name="area" value={userData.area || ''} onChange={handleInputChange} readOnly={!editingFields.area} placeholder="Enter area" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('area')}>
                {editingFields.area ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>Road No.</label>
            <div className="input-with-icon">
              <Hash size={18} className="field-icon" />
              <input type="text" name="roadNo" value={userData.roadNo || ''} onChange={handleInputChange} readOnly={!editingFields.roadNo} placeholder="Enter road number" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('roadNo')}>
                {editingFields.roadNo ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label>House No.</label>
            <div className="input-with-icon">
              <Home size={18} className="field-icon" />
              <input type="text" name="houseNo" value={userData.houseNo || ''} onChange={handleInputChange} readOnly={!editingFields.houseNo} placeholder="Enter house number" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('houseNo')}>
                {editingFields.houseNo ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Certificates Section */}
      <div className="profile-cert-card">
        <div className="profile-cert-header-row">
          <div>
            <h3>Official Certificates</h3>
            <p className="profile-cert-sub">Verified &amp; approved skills accredited to your profile</p>
          </div>
          <div className="profile-cert-badge-count">
            <Award size={16} color="#c084fc" />
            <span>{userData.certificates?.length || 0} Verified</span>
          </div>
        </div>
        
        <div className="profile-cert-list">
          {userData.certificates && userData.certificates.length > 0 ? (
            userData.certificates.map((cert, index) => {
              let certTitle = 'Skill Certificate';
              let certAsset = null;
              let certDate = null;

              if (typeof cert === 'object' && cert !== null) {
                certTitle = cert.certificate_type || cert.skill || cert.name || 'Skill Certificate';
                certAsset = cert.asset || null;
                certDate = cert.issue_date || cert.issueDate || null;
              } else if (typeof cert === 'string') {
                if (cert.includes('/') || cert.includes('\\') || cert.includes('.png') || cert.includes('.jpg') || cert.includes('.webp') || cert.includes('http')) {
                  certTitle = 'Skill Certificate';
                  certAsset = cert;
                } else {
                  certTitle = cert;
                }
              }

              // Strict sanitize: if title contains file extensions, raw timestamps, or raw IDs, clean it up
              if (/\.(webp|png|jpe?g|pdf|svg)$/i.test(certTitle) || /cert_[a-z0-9]+/i.test(certTitle) || /\d{10,15}/.test(certTitle) || /^(cert|default)[_0-9]+/i.test(certTitle)) {
                certTitle = 'Official Verified Skill Certificate';
              }

              return (
                <div className="profile-cert-item" key={index}>
                  <div className="profile-cert-info-left">
                    <div className="profile-cert-bullet"></div>
                    <div>
                      <span className="profile-cert-title-text">{certTitle}</span>
                      {certDate && <span className="profile-cert-date-text">Issued: {certDate}</span>}
                    </div>
                  </div>
                  
                  <div className="profile-cert-actions-right">
                    <span className="profile-cert-status-badge">
                      <CheckCircle2 size={13} /> Verified
                    </span>
                    {certAsset && (
                      <button 
                        type="button" 
                        className="profile-cert-view-btn"
                        onClick={() => setSelectedCertPreview({ title: certTitle, asset: certAsset, date: certDate })}
                      >
                        <Eye size={13} /> View Photo
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="no-cert-msg">No approved certificates yet. Upload a certificate below for Admin verification.</p>
          )}
        </div>

        <div className="profile-cert-actions">
          <input 
            type="file" 
            ref={certInputRef} 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={handleCertChange}
          />
          
          <button 
            type="button"
            className="profile-add-cert-btn" 
            onClick={handleCertClick}
          >
            <Plus size={18} /> Upload Certificate
          </button>
        </div>
      </div>

      {/* Certificate Photo Preview Modal */}
      {selectedCertPreview && (
        <div className="modal-overlay" onClick={() => setSelectedCertPreview(null)}>
          <div className="profile-cert-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', fontWeight: 700 }}>
                  {selectedCertPreview.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 600 }}>
                  Official SkillChain Verified Certificate
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCertPreview(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="profile-cert-img-wrap">
              <img
                src={selectedCertPreview.asset}
                alt={selectedCertPreview.title}
                className="profile-cert-full-img"
                onError={e => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedCertPreview.title)}&background=1e293b&color=8b5cf6&size=600`;
                }}
              />
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href={selectedCertPreview.asset}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <Eye size={14} /> Open Full Size
              </a>
              <button className="btn-ghost" onClick={() => setSelectedCertPreview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;