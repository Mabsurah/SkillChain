import React, { useState, useRef } from 'react';
import { 
  User, Camera, Grip, Mail, Calendar, Phone, 
  MapPin, Building, Map, Hash, Home, Edit2, Coins, Check, ChevronDown, Plus
} from 'lucide-react';
import './Profile.css';

// The Database of Bangladesh Divisions and Districts
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
  const [editingFields, setEditingFields] = useState({});
  const fileInputRef = useRef(null); 
  const certInputRef = useRef(null); 
  
  const [userData, setUserData] = useState({
    firstName: 'Taukir',
    lastName: 'Ahmed',
    avatarUrl: 'https://ui-avatars.com/api/?name=Taukir+Ahmed&background=1e293b&color=8b5cf6&size=150',
    email: 'taukir.ahmed@example.com',
    dob: '15/08/1998',
    phone: '+8801711000000',
    altPhone: '',
    division: 'Dhaka',
    district: 'Dhaka',
    city: 'Dhaka',
    area: 'Dhanmondi',
    roadNo: '32',
    houseNo: '10',
    skillsCount: 1,
    creditPoints: 150,
    // These are the currently "Approved" certificates fetched from the database
    certificates: ["Python Programming", "C Programming"] 
  });

  const computedRole = userData.skillsCount > 0 ? "Expert" : "Newbie";

  // SMART LOGIC: Handles dependencies between Division and District
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "division") {
      const currentDistrict = userData.district;
      if (currentDistrict && !bangladeshData[value].includes(currentDistrict)) {
        alert(`The district "${currentDistrict}" is not in ${value} division. Please update the district correctly.`);
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
        alert(`District "${value}" belongs to ${foundDiv} Division. The division has been updated automatically!`);
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

  // UPDATED: Sends to admin instead of instantly rendering
  const handleCertChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // TODO: Place your backend API call here (e.g., axios.post('/api/certificates/upload', formData))
      console.log("Uploading file to admin for approval:", file.name);
      
      // Provide feedback to the user
      alert(`Your certificate "${file.name}" has been submitted successfully! It will appear on your profile once approved by an admin.`);
      
      // Reset the input so they can upload another file if needed
      e.target.value = '';
    }
  };

  const toggleFieldEdit = (fieldName) => {
    setEditingFields(prev => {
      const isCurrentlyEditing = prev[fieldName];
      
      if (isCurrentlyEditing && fieldName === 'district' && !userData.district) {
        alert("Please select a valid district before saving!");
        return prev; 
      }

      if (isCurrentlyEditing) {
        console.log(`Saved ${fieldName}: ${userData[fieldName]} to Database!`);
      }

      return {
        ...prev,
        [fieldName]: !isCurrentlyEditing
      };
    });
  };

  return (
    <div className="profile-page-container">
      
      {/* 1. Header Card */}
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
            <span className="credit-value">{userData.creditPoints}</span>
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
          {/* First Name */}
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
          
          {/* Last Name */}
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

          {/* Email */}
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

          {/* DOB */}
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

          {/* Phone */}
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

          {/* Alt Phone */}
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
          <Grip size={24} className="grid-dots" />
        </div>

        <div className="profile-grid-3">
          
          {/* DIVISION SELECTION */}
          <div className="form-group">
            <label>Division</label>
            <div className="input-with-icon">
              <MapPin size={18} className="field-icon" />
              <select name="division" value={userData.division} onChange={handleInputChange} disabled={!editingFields.division}>
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

          {/* DISTRICT SELECTION */}
          <div className="form-group">
            <label>District</label>
            <div className="input-with-icon">
              <MapPin size={18} className="field-icon" />
              <select name="district" value={userData.district} onChange={handleInputChange} disabled={!editingFields.district}>
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

          {/* City */}
          <div className="form-group">
            <label>City</label>
            <div className="input-with-icon">
              <Building size={18} className="field-icon" />
              <input type="text" name="city" value={userData.city} onChange={handleInputChange} readOnly={!editingFields.city} placeholder="Enter city" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('city')}>
                {editingFields.city ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-grid-3">
          {/* Area */}
          <div className="form-group">
            <label>Area</label>
            <div className="input-with-icon">
              <Map size={18} className="field-icon" />
              <input type="text" name="area" value={userData.area} onChange={handleInputChange} readOnly={!editingFields.area} placeholder="Enter area" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('area')}>
                {editingFields.area ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
          
          {/* Road No */}
          <div className="form-group">
            <label>Road No.</label>
            <div className="input-with-icon">
              <Hash size={18} className="field-icon" />
              <input type="text" name="roadNo" value={userData.roadNo} onChange={handleInputChange} readOnly={!editingFields.roadNo} placeholder="Enter road number" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('roadNo')}>
                {editingFields.roadNo ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
          
          {/* House No */}
          <div className="form-group">
            <label>House No.</label>
            <div className="input-with-icon">
              <Home size={18} className="field-icon" />
              <input type="text" name="houseNo" value={userData.houseNo} onChange={handleInputChange} readOnly={!editingFields.houseNo} placeholder="Enter house number" />
              <button type="button" className="inline-edit-btn" onClick={() => toggleFieldEdit('houseNo')}>
                {editingFields.houseNo ? <Check size={16} color="#10b981" /> : <Edit2 size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- 4. CERTIFICATES SECTION ---------- */}
      <div className="profile-cert-card">
        <h3>Certificates</h3>
        
        <div className="profile-cert-list">
          {userData.certificates.map((cert, index) => (
            <div className="profile-cert-item" key={index}>
              <div className="profile-cert-bullet"></div>
              <span>{cert}</span>
            </div>
          ))}
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
            <Plus size={18} /> Add Certificate
          </button>
        </div>
      </div>

    </div>
  );
};

export default Profile;