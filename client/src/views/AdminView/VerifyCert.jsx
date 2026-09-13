import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Award, User, X, Eye, Edit3, Tag } from 'lucide-react';
import { api } from '../../services/api';
import './VerifyCert.css';

const resolveCertAsset = (asset, fallbackText = 'Certificate') => {
  if (!asset) return `/uploads/certificates/default.png`;
  if (asset.startsWith('data:image/') || asset.startsWith('http://') || asset.startsWith('https://') || asset.startsWith('/uploads/')) {
    return asset;
  }
  if (asset.includes('.png') || asset.includes('.jpg') || asset.includes('.jpeg') || asset.includes('.webp')) {
    return `/uploads/certificates/${asset.replace(/^\/+/, '')}`;
  }
  return asset;
};

const VerifyCert = () => {
  const [certs, setCerts] = useState([]);
  const [customSkills, setCustomSkills] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [previewCert, setPreviewCert] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getCertificates();
        setCerts(res.certificates || []);
      } catch {
        setCerts([
          { id: 1, certId: 'CERT001', skill: 'C++ Programming Certificate', status: 'Pending', participant_id: 'P001', participantName: 'Rahim Ahmed', asset: '/uploads/certificates/cert_P001_1788287886978.png' },
          { id: 2, certId: 'CERT002', skill: 'Web Development Certificate', status: 'Accepted', participant_id: 'P002', participantName: 'Sadia Islam', asset: '/uploads/certificates/default.png' },
          { id: 3, certId: 'CERT003', skill: 'Python Programming Certificate', status: 'Pending', participant_id: 'P003', participantName: 'Tanvir Hossain', asset: '/uploads/certificates/default.png' },
          { id: 4, certId: 'CERT004', skill: 'Database Management Certificate', status: 'Pending', participant_id: 'P004', participantName: 'Nusrat Jahan', asset: '/uploads/certificates/default.png' },
          { id: 5, certId: 'CERT005', skill: 'Machine Learning Certificate', status: 'Accepted', participant_id: 'P005', participantName: 'Fahim Hasan', asset: '/uploads/certificates/default.png' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleVerify = async (cert, newStatus, overrideSkill) => {
    const cid = cert.certId || cert.id;
    const finalSkill = (overrideSkill || customSkills[cid] || cert.skill || 'Skill Certificate').trim();
    try {
      await api.verifyCertificate({ id: cert.id, certId: cid, status: newStatus, skill: finalSkill });
    } catch {}
    setCerts(prev => prev.map(c => ((c.id === cert.id || c.certId === cid) ? { ...c, status: newStatus, skill: finalSkill } : c)));
    showToast(`Certificate ${cid} ${newStatus === 'Accepted' ? 'approved as "' + finalSkill + '"' : 'rejected'}.`, newStatus === 'Accepted' ? 'success' : 'error');
  };

  const statusBadge = (status) => {
    if (status === 'Accepted') return <span className="badge badge-green">Verified</span>;
    if (status === 'Rejected') return <span className="badge badge-red">Rejected</span>;
    return <span className="badge badge-orange">Pending</span>;
  };

  const totalCerts = certs.length;
  const acceptedCerts = certs.filter(c => c.status === 'Accepted').length;
  const pendingCerts = certs.filter(c => c.status === 'Pending').length;
  const rejectedCerts = certs.filter(c => c.status === 'Rejected').length;

  return (
    <div className="page-container">
      {toast && (
        <div className={`ac-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <h2>Verify Certificates</h2>
        <p>Review participant-uploaded certificates, inspect photos, assign official Certificate Types, and verify or reject them</p>
      </div>

      {/* Stats Row */}
      <div className="vc-stats-bar">
        <div className="vc-stat-item">
          <div className="vc-stat-icon-box icon-purple">
            <Award size={18} />
          </div>
          <div>
            <span className="vc-stat-num">{totalCerts}</span>
            <span className="vc-stat-label">Total</span>
          </div>
        </div>
        <div className="vc-stat-item">
          <div className="vc-stat-icon-box icon-green">
            <CheckCircle size={18} />
          </div>
          <div>
            <span className="vc-stat-num">{acceptedCerts}</span>
            <span className="vc-stat-label">Verified</span>
          </div>
        </div>
        <div className="vc-stat-item">
          <div className="vc-stat-icon-box icon-orange">
            <Eye size={18} />
          </div>
          <div>
            <span className="vc-stat-num">{pendingCerts}</span>
            <span className="vc-stat-label">Pending</span>
          </div>
        </div>
        <div className="vc-stat-item">
          <div className="vc-stat-icon-box icon-red">
            <XCircle size={18} />
          </div>
          <div>
            <span className="vc-stat-num">{rejectedCerts}</span>
            <span className="vc-stat-label">Rejected</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: '60px' }}>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="vc-grid">
          {certs.map((cert, index) => {
            const certKey = cert.certId || cert.id || cert.certificate_id || `cert_${index}`;
            const cleanSkill = (cert.certificate_type || cert.skill || api.formatCleanCertTitle(cert.asset || 'Skill Certificate')).trim();
            const participantName = cert.participantName || (cert.first_name ? `${cert.first_name} ${cert.last_name || ''}` : `Participant ${cert.participant_id || cert.participantId}`);
            const participantId = cert.participant_id || cert.participantId || 'P001';
            const assetUrl = resolveCertAsset(cert.asset, cleanSkill);
            const currentEnteredSkill = customSkills[certKey] !== undefined ? customSkills[certKey] : cleanSkill;

            return (
              <div className="vc-cert-card" key={certKey}>
                <div className="vc-cert-header">
                  <div className="vc-cert-icon">
                    <Award size={20} />
                  </div>
                  {statusBadge(cert.status)}
                </div>

                {/* Participant Details: Name and ID */}
                <div className="vc-participant-section">
                  <div className="vc-participant-title-row">
                    <User size={15} className="vc-user-icon" />
                    <span className="vc-participant-fullname">{participantName}</span>
                  </div>
                  <div className="vc-participant-sub-row">
                    <span className="vc-pid-badge">ID: {participantId}</span>
                    <span className="vc-cert-id-tag">Cert: {cert.certId || cert.id}</span>
                  </div>
                  {cert.email && (
                    <div className="vc-participant-email" title={cert.email}>
                      {cert.email}
                    </div>
                  )}
                </div>

                {/* Uploaded Certificate Image Thumbnail */}
                <div 
                  className="vc-thumbnail-wrap" 
                  onClick={() => setPreviewCert({ 
                    ...cert, 
                    skill: currentEnteredSkill, 
                    participantName, 
                    participant_id: participantId, 
                    asset: assetUrl 
                  })}
                >
                  <img
                    src={assetUrl}
                    alt={currentEnteredSkill}
                    className="vc-card-thumbnail-img"
                    onError={(e) => { 
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentEnteredSkill)}&background=1e293b&color=8b5cf6&size=400`; 
                    }}
                  />
                  <div className="vc-thumbnail-overlay">
                    <Eye size={16} /> View Uploaded Photo
                  </div>
                </div>

                {/* Certificate Type / Title Input Field for Admin */}
                {cert.status === 'Pending' ? (
                  <div className="vc-cert-type-edit">
                    <label className="vc-type-label">
                      <Edit3 size={13} /> Certificate Type / Skill:
                    </label>
                    <input
                      type="text"
                      className="vc-type-input"
                      value={currentEnteredSkill}
                      onChange={(e) => setCustomSkills(prev => ({ ...prev, [certKey]: e.target.value }))}
                      placeholder="e.g. Full Stack Web Development, Python..."
                    />
                  </div>
                ) : (
                  <div className="vc-verified-skill-box">
                    <span className="vc-verified-tag"><Tag size={13} /> Official Type:</span>
                    <span className="vc-verified-name">{cert.skill}</span>
                  </div>
                )}

                <button 
                  className="vc-preview-btn" 
                  onClick={() => setPreviewCert({ 
                    ...cert, 
                    skill: currentEnteredSkill, 
                    participantName, 
                    participant_id: participantId, 
                    asset: assetUrl 
                  })}
                >
                  <Eye size={14} /> View Certificate Photo &amp; Verify
                </button>

                {cert.status === 'Pending' && (
                  <div className="ac-actions">
                    <button className="btn-success" onClick={() => handleVerify(cert, 'Accepted', currentEnteredSkill)}>
                      <CheckCircle size={14} /> Accept
                    </button>
                    <button className="btn-danger" onClick={() => handleVerify(cert, 'Rejected')}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewCert && (
        <div className="modal-overlay" onClick={() => setPreviewCert(null)}>
          <div className="vc-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700 }}>
                  Certificate Verification
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>
                    {previewCert.participantName}
                  </span>
                  <span className="vc-pid-badge" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    ID: {previewCert.participant_id}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewCert(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Uploaded Full Size Photo Display */}
            <div className="vc-modal-img-container">
              <img
                src={previewCert.asset}
                alt={previewCert.skill}
                className="vc-cert-img"
                onError={e => { 
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(previewCert.skill)}&background=1e293b&color=8b5cf6&size=600`; 
                }}
              />
            </div>

            {/* Admin Certificate Type Input in Modal */}
            <div className="vc-modal-editor-box">
              <label className="vc-modal-editor-label">
                <Award size={15} color="#c084fc" /> <strong>Official Certificate Type / Skill Title:</strong>
              </label>
              <input
                type="text"
                className="vc-modal-editor-input"
                value={customSkills[previewCert.certId || previewCert.id] ?? previewCert.skill}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomSkills(prev => ({ ...prev, [previewCert.certId || previewCert.id]: val }));
                  setPreviewCert(prev => ({ ...prev, skill: val }));
                }}
                placeholder="Enter official certificate title (e.g. Python for Data Science)"
              />
              <p className="vc-modal-hint">
                Inspect the certificate image above and write the official Certificate Type. This name will appear directly in the student's profile certificate list.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <a
                href={previewCert.asset}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <Eye size={14} /> Open Full Size In New Tab
              </a>

              <div style={{ display: 'flex', gap: '10px' }}>
                {previewCert.status === 'Pending' ? (
                  <>
                    <button className="btn-success" onClick={() => { 
                      const finalSkill = (customSkills[previewCert.certId || previewCert.id] || previewCert.skill || 'Skill Certificate').trim();
                      handleVerify(previewCert, 'Accepted', finalSkill); 
                      setPreviewCert(null); 
                    }}>
                      <CheckCircle size={14} /> Accept &amp; Reward 100 Credits
                    </button>
                    <button className="btn-danger" onClick={() => { handleVerify(previewCert, 'Rejected'); setPreviewCert(null); }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                ) : (
                  <button className="btn-success" onClick={() => {
                    const finalSkill = (customSkills[previewCert.certId || previewCert.id] || previewCert.skill || 'Skill Certificate').trim();
                    handleVerify(previewCert, 'Accepted', finalSkill);
                    setPreviewCert(null);
                  }}>
                    <CheckCircle size={14} /> Update Skill Name in DB
                  </button>
                )}
                <button className="btn-ghost" onClick={() => setPreviewCert(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyCert;
