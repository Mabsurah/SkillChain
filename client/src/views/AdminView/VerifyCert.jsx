import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Eye, Check, X } from 'lucide-react';
import './VerifyCert.css';

const VerifyCert = () => {
  // Real Data store korar jonno state
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Database theke Data Fetch Kora
  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/certificates');
        const data = await response.json();
        
        // Oracle-er data ke frontend format-e map kora
        const formattedData = data.map((cert, index) => ({
          id: index + 1, 
          certId: cert.CERT_ID,
          skill: cert.SKILL_NAME || '',
          status: cert.STATUS, // 'Accepted', 'Pending', 'Rejected'
          assetUrl: cert.ASSET_URL
        }));

        setCertificates(formattedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching certificates:", error);
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  // Derived Summary Stats
  const totalCerts = certificates.length;
  const acceptedCerts = certificates.filter(c => c.status === 'Accepted').length;
  const rejectedCerts = certificates.filter(c => c.status === 'Rejected').length;
  const pendingCerts = certificates.filter(c => c.status === 'Pending').length;

  // Local state updates (Future-e ekhane PUT request hobe database update korar jonno)
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

  // Sort the certificates before displaying them
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

        {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
               Loading real certificates from Oracle 11g Database...
            </div>
        ) : (
            <>
                {/* Table Data Rows */}
                {sortedCertificates.map((cert) => {
                
                const isAccepted = cert.status === 'Accepted';
                const isRejected = cert.status === 'Rejected';
                
                // Disable Accept button if already accepted OR if no skill is selected
                const isAcceptDisabled = isAccepted || cert.skill === ''; 

                return (
                    <div className="vc-table-row" key={cert.id}>
                    
                    {/* Cert ID */}
                    <div className="vc-col vc-cert-id">
                        <span className="vc-dot"></span>
                        {cert.certId}
                    </div>

                    {/* View Button - ekhon alert e asol link dekhabe */}
                    <div className="vc-col">
                        <button className="vc-view-btn" onClick={() => alert(`Certificate Link: ${cert.assetUrl}`)}>
                        <Eye size={16} /> View
                        </button>
                    </div>

                    {/* Dropdown - Database er asol skills */}
                    <div className="vc-col">
                        <select 
                        className="vc-select" 
                        value={cert.skill} 
                        onChange={(e) => handleSkillChange(cert.id, e.target.value)}
                        disabled={isAccepted}
                        >
                        <option value="" disabled>Add Skill Name</option>
                        <option value="C++ Programming">C++ Programming</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Python Programming">Python Programming</option>
                        <option value="Database Management">Database Management</option>
                        <option value="Machine Learning">Machine Learning</option>
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
                        
                        <button 
                        className="vc-action-btn vc-btn-accept"
                        onClick={() => handleUpdateStatus(cert.id, 'Accepted')}
                        disabled={isAcceptDisabled} 
                        >
                        <Check size={16} /> Accept
                        </button>

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
            </>
        )}
      </div>

    </div>
  );
};

export default VerifyCert;