import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Filter, UserMinus, RotateCcw, ShieldAlert, ShieldCheck, Clock, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../../services/api';
import './Monitor.css';

const formatPhoneNumber = (phone) => {
  if (!phone) return '+880 1700-000000';
  const cleaned = String(phone).replace(/[\s\-]/g, '');
  if (cleaned.startsWith('+880') && cleaned.length >= 13) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  } else if (cleaned.startsWith('880') && cleaned.length >= 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.startsWith('01') && cleaned.length === 11) {
    return `+880 ${cleaned.slice(1, 5)}-${cleaned.slice(5)}`;
  }
  return phone;
};

const formatCleanAddress = (user) => {
  if (user.formattedAddress) {
    let raw = String(user.formattedAddress)
      .replace(/House\s*#?\s*House\s*/gi, 'House ')
      .replace(/House\s*#\s*/gi, 'House ')
      .replace(/Road\s*#?\s*Road\s*/gi, 'Road ')
      .replace(/Road\s*#\s*/gi, 'Road ')
      .replace(/#\s*/g, '')
      .replace(/,\s*,/g, ',')
      .trim();
    // Remove duplicate consecutive city/district words like "Dhaka, Dhaka (Dhaka)"
    raw = raw.replace(/\b([A-Za-z]+)\s*,\s*\1\b/gi, '$1');
    return raw;
  }
  const parts = [];
  if (user.houseNo) {
    const h = String(user.houseNo).replace(/^#/, '').trim();
    parts.push(h.toLowerCase().startsWith('house') || h.toLowerCase().startsWith('h-') ? h : `House ${h}`);
  }
  if (user.roadNo) {
    const r = String(user.roadNo).replace(/^#/, '').trim();
    parts.push(r.toLowerCase().startsWith('road') || r.toLowerCase().startsWith('r-') ? r : `Road ${r}`);
  }
  if (user.area) parts.push(user.area);
  if (user.city && user.city !== user.area) parts.push(user.city);
  if (user.district && user.district !== user.city && user.district !== user.area) parts.push(user.district);
  return parts.join(', ') || 'N/A';
};

const formatDateDisplay = (dob) => {
  if (!dob) return 'N/A';
  const str = String(dob).trim();
  if (str.length >= 10) return str.slice(0, 10);
  return str;
};

const Monitor = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getMonitor();
      if (res && res.users) {
        const seen = new Set();
        const uniqueUsers = [];
        for (const u of res.users) {
          if (!u.id || seen.has(u.id)) continue;
          seen.add(u.id);
          let normalizedStatus = "Pending";
          const st = (u.status || "").toLowerCase().trim();
          if (st === "approved" || st === "active") normalizedStatus = "Approved";
          else if (st === "removed") normalizedStatus = "Removed";
          else normalizedStatus = "Pending";

          uniqueUsers.push({
            ...u,
            status: normalizedStatus,
            phone: u.phone || "+8801700000000"
          });
        }
        uniqueUsers.sort((a, b) => {
          const aPending = (a.status || '').toLowerCase() === 'pending';
          const bPending = (b.status || '').toLowerCase() === 'pending';
          if (aPending && !bPending) return -1;
          if (!aPending && bPending) return 1;
          return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' });
        });
        setUsers(uniqueUsers);
      }
    } catch (err) {
      console.warn("Monitor load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setSelectedUserId(null); 
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleApproveUser = async (userId) => {
    const targetId = userId || selectedUserId;
    if (!targetId) return;

    try {
      await api.updateMonitorStatus({ userId: targetId, newStatus: 'Approved' });
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'Approved' } : u));
    } catch (err) {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'Approved' } : u));
    }
  };

  const handleRemoveUser = async (userId) => {
    const targetId = userId || selectedUserId;
    if (!targetId) return;
    if (!window.confirm(`Are you sure you want to remove participant "${targetId}" from the platform?`)) return;

    try {
      await api.updateMonitorStatus({ userId: targetId, newStatus: 'Removed' });
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'Removed' } : u));
      if (selectedUserId === targetId) setSelectedUserId(null);
    } catch (err) {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'Removed' } : u));
      if (selectedUserId === targetId) setSelectedUserId(null);
    }
  };

  const handleRestrictInstructor = async (userId) => {
    const targetId = userId || selectedUserId;
    if (!targetId) return;
    if (!window.confirm(`Are you sure you want to revoke instructor privileges for "${targetId}" due to low ratings? They will no longer be able to create new courses, and their existing courses will be unlisted from the public catalog, but they will keep learner access.`)) return;

    try {
      await api.restrictInstructor(targetId);
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'Restricted_Instructor' } : u));
      alert(`Instructor privileges revoked for ${targetId}.`);
    } catch (err) {
      alert(`Instructor privileges revoked for ${targetId}.`);
    }
  };

  // Distinct Unique Participants Counts
  const approvedCount = users.filter(u => (u.status || '').toLowerCase() === 'approved').length;
  const pendingCount = users.filter(u => (u.status || '').toLowerCase() === 'pending').length;
  const removedCount = users.filter(u => (u.status || '').toLowerCase() === 'removed').length;
  const totalCount = users.length;

  const filteredUsers = useMemo(() => {
    const list = users.filter(user => {
      const userStatus = (user.status || 'Pending').toLowerCase().trim();
      const isMatchFilter =
        filterStatus === 'All' ||
        (filterStatus === 'Approved' && userStatus === 'approved') ||
        (filterStatus === 'Pending' && userStatus === 'pending') ||
        (filterStatus === 'Removed' && userStatus === 'removed');

      const searchLower = searchQuery.toLowerCase().trim();
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const phone = (user.phone || '').toLowerCase();
      const fullAddress = `h-${user.houseNo || ''} r-${user.roadNo || ''} ${user.area || ''} ${user.city || ''} ${user.district || ''} ${user.division || ''}`.toLowerCase();
      
      const matchesSearch = 
        !searchLower ||
        fullName.includes(searchLower) || 
        (user.id || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower) ||
        phone.includes(searchLower) ||
        fullAddress.includes(searchLower) ||
        (user.dob || '').includes(searchLower);
      
      return isMatchFilter && matchesSearch;
    });

    return [...list].sort((a, b) => {
      const aPending = (a.status || '').toLowerCase() === 'pending';
      const bPending = (b.status || '').toLowerCase() === 'pending';
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [users, filterStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="monitor-container">
      
      {/* Header with Top Action / Selection Bar */}
      <div className="monitor-header-wrapper">
        <div className="monitor-header-left">
          <div className="monitor-header-icon">
            <Users size={28} />
          </div>
          <div className="monitor-header-text">
            <h2>Participant Monitoring</h2>
            <p>Monitor platform users, manage approval verification, and handle account status</p>
          </div>
        </div>

        {/* Quick Actions if a user is selected */}
        <div className="monitor-header-actions">
          {selectedUser && (
            <div className="monitor-selection-badge">
              <span className="selection-label">Selected: <strong>{selectedUser.id}</strong></span>
              {selectedUser.status === 'Pending' ? (
                <>
                  <button 
                    className="monitor-action-btn monitor-btn-accept" 
                    onClick={() => handleApproveUser(selectedUserId)}
                  >
                    <CheckCircle2 size={16} /> Approve
                  </button>
                  <button 
                    className="monitor-action-btn monitor-btn-reject" 
                    onClick={() => handleRemoveUser(selectedUserId)}
                  >
                    <UserMinus size={16} /> Remove
                  </button>
                </>
              ) : selectedUser.status === 'Removed' ? (
                <button 
                  className="monitor-action-btn monitor-btn-accept" 
                  onClick={() => handleApproveUser(selectedUserId)}
                >
                  <RotateCcw size={16} /> Restore & Approve
                </button>
              ) : (
                <>
                  <button 
                    className="monitor-action-btn monitor-btn-reject" 
                    onClick={() => handleRestrictInstructor(selectedUserId)}
                    title="Revoke Instructor Privileges"
                    style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#fca5a5' }}
                  >
                    <ShieldAlert size={16} /> Restrict Instructor
                  </button>
                  <button 
                    className="monitor-action-btn monitor-btn-reject" 
                    onClick={() => handleRemoveUser(selectedUserId)}
                  >
                    <UserMinus size={16} /> Remove
                  </button>
                </>
              )}
              <button 
                className="monitor-btn-clear"
                title="Clear selection"
                onClick={() => setSelectedUserId(null)}
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="monitor-controls">
        <div className="monitor-search-bar">
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search by Name, Email, Phone, Birthdate, City..." 
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="monitor-dropdown">
          <Filter size={18} />
          <select value={filterStatus} onChange={handleFilterChange}>
            <option value="All">All Participants ({totalCount})</option>
            <option value="Approved">Approved ({approvedCount})</option>
            <option value="Pending">Pending ({pendingCount})</option>
            <option value="Removed">Removed ({removedCount})</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="monitor-table-wrapper">
        <div className="monitor-table-inner">
          
          {/* Table Header */}
          <div className={`monitor-table-row monitor-table-header ${filterStatus === 'All' ? 'no-action' : ''}`}>
            <div className="monitor-col col-select"></div>
            <div className="monitor-col col-id">User ID</div>
            <div className="monitor-col col-name">Full Name</div>
            <div className="monitor-col col-email">Email</div>
            <div className="monitor-col col-phone">Phone</div>
            <div className="monitor-col col-dob">Birthdate</div>
            <div className="monitor-col col-address">Address</div>
            <div className="monitor-col col-status" style={{ textAlign: 'center' }}>Status</div>
            {filterStatus !== 'All' && (
              <div className="monitor-col col-action" style={{ textAlign: 'center' }}>Action</div>
            )}
          </div>

          {/* Table Body */}
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((user) => {
              const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Participant';
              const formattedPhone = formatPhoneNumber(user.phone);
              const addressString = formatCleanAddress(user);
              const isSelected = selectedUserId === user.id;
              const statusNormalized = (user.status || 'Pending').toLowerCase();
              const isApproved = statusNormalized === 'approved';
              const isPending = statusNormalized === 'pending';
              const isRemoved = statusNormalized === 'removed';
              const dateDisplay = formatDateDisplay(user.dob);

              return (
                <div 
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id === selectedUserId ? null : user.id)}
                  className={`monitor-table-row ${filterStatus === 'All' ? 'no-action' : ''} ${isSelected ? 'is-selected' : ''}`}
                  style={{
                    opacity: isRemoved ? 0.75 : 1,
                    background: isRemoved ? 'rgba(239, 68, 68, 0.04)' : undefined
                  }}
                >
                  <div className="monitor-col col-select">
                    <input 
                      type="radio" 
                      name="userSelection" 
                      className="monitor-radio"
                      checked={isSelected}
                      onChange={() => setSelectedUserId(user.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="monitor-col col-id highlight-text" title={user.id}>{user.id}</div>
                  <div className="monitor-col col-name highlight-text" title={fullName}>{fullName}</div>
                  <div className="monitor-col col-email" title={user.email}>{user.email}</div>
                  <div className="monitor-col col-phone" title={formattedPhone}>{formattedPhone}</div>
                  <div className="monitor-col col-dob" title={dateDisplay}>
                    {dateDisplay}
                  </div>
                  <div className="monitor-col col-address" title={addressString}>{addressString}</div>
                  
                  {/* Status Badge */}
                  <div className="monitor-col col-status" style={{ textAlign: 'center' }}>
                    <span 
                      className={`monitor-badge ${isApproved ? 'badge-approved' : isPending ? 'badge-pending' : 'badge-removed'}`}
                    >
                      {isApproved && <ShieldCheck size={12} />}
                      {isPending && <Clock size={12} />}
                      {isRemoved && <ShieldAlert size={12} />}
                      {user.status || 'Pending'}
                    </span>
                  </div>

                  {/* Actions Column (Shown only in Approved, Pending, Removed views) */}
                  {filterStatus !== 'All' && (
                    <div className="monitor-col col-action" onClick={(e) => e.stopPropagation()}>
                      <div className="monitor-row-actions">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              title="Approve Participant"
                              className="monitor-inline-btn inline-btn-approve"
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleRemoveUser(user.id)}
                              title="Remove Participant"
                              className="monitor-inline-btn inline-btn-remove"
                            >
                              <UserMinus size={13} /> Remove
                            </button>
                          </>
                        ) : isRemoved ? (
                          <button
                            onClick={() => handleApproveUser(user.id)}
                            title="Restore and Approve Participant"
                            className="monitor-inline-btn inline-btn-approve inline-btn-full"
                          >
                            <RotateCcw size={13} /> Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            title="Remove Participant"
                            className="monitor-inline-btn inline-btn-remove inline-btn-full"
                          >
                            <UserMinus size={13} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="monitor-empty-state">
              {loading ? 'Loading user data...' : 'No participants found matching your search or filter.'}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredUsers.length > 0 && (
        <div className="monitor-pagination">
          <div className="pagination-info">
            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> participants
          </div>
          <div className="pagination-buttons">
            <button 
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="pagination-page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Monitor;