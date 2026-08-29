import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Eye, Check, X } from 'lucide-react';
import './VerifyCert.css';

const VerifyCert = () => {
  // Mock Data mapped to state
  const [certificates, setCertificates] = useState([
    { id: 1, certId: 'Cert_1001_0001', skill: '', status: 'Pending' },
    { id: 2, certId: 'Cert_1001_0002', skill: '', status: 'Pending' },
    { id: 3, certId: 'Cert_1001_0003', skill: '', status: 'Pending' },
    { id: 4, certId: 'Cert_1002_0001', skill: '', status: 'Pending' },
    { id: 5, certId: 'Cert_1002_0002', skill: '', status: 'Pending' },
    { id: 6, certId: 'Cert_1003_0001', skill: 'C Programming', status: 'Accepted' },
    { id: 7, certId: 'Cert_1003_0002', skill: 'C Programming', status: 'Accepted' },
    { id: 8, certId: 'Cert_1003_0003', skill: 'C Programming', status: 'Accepted' },
    { id: 9, certId: 'Cert_1004_0001', skill: '', status: 'Rejected' },
    { id: 10, certId: 'Cert_1004_0002', skill: '', status: 'Rejected' },
  ]);

  // Derived Summary Stats
  const totalCerts = certificates.length;
  const acceptedCerts = certificates.filter(c => c.status === 'Accepted').length;
  const rejectedCerts = certificates.filter(c => c.status === 'Rejected').length;
  const pendingCerts = certificates.filter(c => c.status === 'Pending').length;

  const handleUpdateStatus = (id, newStatus) => {
    setCertificates(prev => 
      prev.map(cert => cert.id === id ? { ...cert, status: newStatus } : cert)
    );
  };

  const handleSkillChange = (id, newSkill) => {
    setCertificates(prev => 
      prev.map(cert => cert.id === id ? { ...cert, skill: newSkill } : cert)
    );
  };

  // Sort the certificates before displaying them!
  const sortedCertificates = [...certificates].sort((a, b) => {
    const priority = {
      'Pending': 1,
      'Accepted': 2,
      'Rejected': 3
    };
    return priority[a.status] - priority[b.status];
  });

  return (
    <div className="vc-container">
      
      {/* Top Header & Summary Stats */}
      <div className="vc-top-section">
        
        <div className="vc-header-text">
          <h2>Verify Certificate</h2>
          <p>Review, assign skill and verify the certificates submitted by instructors</p>
        </div>

        <div className="vc-stats-wrapper">
          <div className="vc-stat-card">
            <div className="vc-stat-icon vc-icon-total"><FileText size={24} /></div>
            <div className="vc-stat-info">
              <span>Total Certificates</span>
              <h3>{totalCerts}</h3>
            </div>
          </div>

          <div className="vc-stat-card">
            <div className="vc-stat-icon vc-icon-accepted"><CheckCircle size={24} /></div>
            <div className="vc-stat-info">
              <span>Accepted</span>
              <h3>{acceptedCerts}</h3>
            </div>
          </div>

          <div className="vc-stat-card">
            <div className="vc-stat-icon vc-icon-rejected"><XCircle size={24} /></div>
            <div className="vc-stat-info">
              <span>Rejected</span>
              <h3>{rejectedCerts}</h3>
            </div>
          </div>

          <div className="vc-stat-card">
            <div className="vc-stat-icon vc-icon-pending"><Clock size={24} /></div>
            <div className="vc-stat-info">
              <span>Pending</span>
              <h3>{pendingCerts}</h3>
            </div>
          </div>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="vc-table-container">
        
        {/* Table Header Row */}
        <div className="vc-table-row vc-table-header">
          <div className="vc-col">Certificate ID</div>
          <div className="vc-col">View</div>
          <div className="vc-col">Skill Name</div>
          <div className="vc-col">Status</div>
          <div className="vc-col">Actions</div>
        </div>

        {/* Table Data Rows */}
        {sortedCertificates.map((cert) => {
          
          const isAccepted = cert.status === 'Accepted';
          const isRejected = cert.status === 'Rejected';
          
          // --- NEW LOGIC: Disable Accept button if already accepted OR if no skill is selected ---
          const isAcceptDisabled = isAccepted || cert.skill === ''; 

          return (
            <div className="vc-table-row" key={cert.id}>
              
              {/* Cert ID */}
              <div className="vc-col vc-cert-id">
                <span className="vc-dot"></span>
                {cert.certId}
              </div>

              {/* View Button */}
              <div className="vc-col">
                <button className="vc-view-btn" onClick={() => alert(`Viewing ${cert.certId}`)}>
                  <Eye size={16} /> View
                </button>
              </div>

              {/* Dropdown - Disabled if Accepted */}
              <div className="vc-col">
                <select 
                  className="vc-select" 
                  value={cert.skill} 
                  onChange={(e) => handleSkillChange(cert.id, e.target.value)}
                  disabled={isAccepted}
                >
                  <option value="" disabled>Add Skill Name</option>
                  <option value="C Programming">C Programming</option>
                  <option value="Python Basics">Python Basics</option>
                  <option value="Data Structures">Data Structures</option>
                </select>
              </div>

              {/* Status Badge */}
              <div className="vc-col">
                <div className={`vc-badge ${cert.status.toLowerCase()}`}>
                  <span className="vc-badge-dot"></span>
                  {cert.status}
                </div>
              </div>

              {/* Actions */}
              <div className="vc-col vc-actions-col">
                
                {/* Accept Button with new disabled logic */}
                <button 
                  className="vc-action-btn vc-btn-accept"
                  onClick={() => handleUpdateStatus(cert.id, 'Accepted')}
                  disabled={isAcceptDisabled} 
                >
                  <Check size={16} /> Accept
                </button>

                {/* Reject Button */}
                <button 
                  className="vc-action-btn vc-btn-reject"
                  onClick={() => handleUpdateStatus(cert.id, 'Rejected')}
                  disabled={isRejected}
                >
                  <X size={16} /> Reject
                </button>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default VerifyCert;