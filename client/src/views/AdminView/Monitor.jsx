import React, { useState } from 'react';
import { Users, Search, Filter, Check, X, RotateCcw } from 'lucide-react';
import './Monitor.css';

const Monitor = () => {
  const [users, setUsers] = useState([
    { 
      id: 'USR10001', 
      firstName: 'Toukir', lastName: 'Ahmed', 
      email: 'taukir.ahmed@example.com', 
      phone: '+8801711000000', altPhone: '+8801711000001', 
      dob: '15/08/1998', 
      houseNo: '10', roadNo: '32', area: 'Dhanmondi', city: 'Dhaka', district: 'Dhaka', division: 'Dhaka',
      status: 'Pending' 
    },
    { 
      id: 'USR10002', 
      firstName: 'Nusrat', lastName: 'Jahan', 
      email: 'nusrat.jahan@example.com', 
      phone: '+8801812000001', altPhone: '', 
      dob: '22/02/2000', 
      houseNo: '45', roadNo: '2', area: 'Mirpur', city: 'Dhaka', district: 'Dhaka', division: 'Dhaka',
      status: 'Pending' 
    },
    { 
      id: 'USR10003', 
      firstName: 'Sabbir', lastName: 'Rahman', 
      email: 'sabbir.rahman@example.com', 
      phone: '+8801913000002', altPhone: '+8801913000099', 
      dob: '05/01/1999', 
      houseNo: '12', roadNo: '7', area: 'Uttara', city: 'Dhaka', district: 'Dhaka', division: 'Dhaka',
      status: 'Accepted' 
    },
    { 
      id: 'USR10004', 
      firstName: 'Farhana', lastName: 'Islam', 
      email: 'farhana.islam@example.com', 
      phone: '+8801614000003', altPhone: '', 
      dob: '30/09/2001', 
      houseNo: '88', roadNo: '14', area: 'Agrabad', city: 'Chattogram', district: 'Chattogram', division: 'Chattogram',
      status: 'Rejected' 
    },
  ]);

  const [filterStatus, setFilterStatus] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setSelectedUserId(null); 
  };

  const handleAccept = () => {
    setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, status: 'Accepted' } : u));
    setSelectedUserId(null);
  };

  const handleReject = () => {
    setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, status: 'Rejected' } : u));
    setSelectedUserId(null);
  };

  const handleRestore = () => {
    setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, status: 'Pending' } : u));
    setSelectedUserId(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesStatus = filterStatus === 'All' || user.status === filterStatus;
    
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const allPhones = `${user.phone} ${user.altPhone}`.toLowerCase();
    const fullAddress = `h-${user.houseNo} r-${user.roadNo} ${user.area} ${user.city} ${user.district} ${user.division}`.toLowerCase();
    
    const matchesSearch = 
      fullName.includes(searchLower) || 
      user.id.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      allPhones.includes(searchLower) ||
      fullAddress.includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });

  const isSelectableView = filterStatus === 'Pending' || filterStatus === 'Rejected';

  return (
    <div className="monitor-container">
      
      {/* Header with Top-Right Action Buttons */}
      <div className="monitor-header-wrapper">
        <div className="monitor-header-left">
          <div className="monitor-header-icon">
            <Users size={28} />
          </div>
          <div className="monitor-header-text">
            <h2>Monitor Users</h2>
            <p>View and monitor all registered users based on their status</p>
          </div>
        </div>

        {/* Action Buttons: Displayed based on active filter, disabled until row is selected */}
        <div className="monitor-header-actions">
          {filterStatus === 'Pending' && (
            <>
              <button 
                className="monitor-action-btn monitor-btn-accept" 
                onClick={handleAccept}
                disabled={!selectedUserId}
              >
                <Check size={18} /> Accept
              </button>
              <button 
                className="monitor-action-btn monitor-btn-reject" 
                onClick={handleReject}
                disabled={!selectedUserId}
              >
                <X size={18} /> Reject
              </button>
            </>
          )}

          {filterStatus === 'Rejected' && (
            <button 
              className="monitor-action-btn monitor-btn-restore" 
              onClick={handleRestore}
              disabled={!selectedUserId}
            >
              <RotateCcw size={18} /> Restore as Pending
            </button>
          )}
        </div>
      </div>

      <div className="monitor-controls">
        <div className="monitor-search-bar">
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search anything (Name, Email, Phone, Area)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="monitor-dropdown">
          <Filter size={18} />
          <select value={filterStatus} onChange={handleFilterChange}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="monitor-table-wrapper">
        <div className="monitor-table-inner">
          
          <div className={`monitor-table-row monitor-table-header ${isSelectableView ? 'selectable-row' : ''}`}>
            {isSelectableView && <div className="monitor-col"></div>}
            <div className="monitor-col">User ID</div>
            <div className="monitor-col">Name</div>
            <div className="monitor-col">Email</div>
            <div className="monitor-col">Phone Numbers</div>
            <div className="monitor-col">Date of Birth</div>
            <div className="monitor-col">Full Address</div>
          </div>

          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const fullName = `${user.firstName} ${user.lastName}`;
              const phoneString = user.altPhone ? `${user.phone}, ${user.altPhone}` : user.phone;
              const addressString = `H-${user.houseNo}, R-${user.roadNo}, ${user.area}, ${user.city}, ${user.district}, ${user.division} Div.`;
              
              const isSelected = selectedUserId === user.id;

              return (
                <div 
                  key={user.id}
                  onClick={() => isSelectableView && setSelectedUserId(user.id)}
                  className={`monitor-table-row ${isSelectableView ? 'selectable-row' : ''} ${isSelected ? 'is-selected' : ''}`}
                >
                  
                  {isSelectableView && (
                    <div className="monitor-col">
                      <input 
                        type="radio" 
                        name="userSelection" 
                        className="monitor-radio"
                        checked={isSelected}
                        readOnly
                      />
                    </div>
                  )}

                  <div className="monitor-col highlight-text">{user.id}</div>
                  <div className="monitor-col highlight-text" title={fullName}>{fullName}</div>
                  <div className="monitor-col" title={user.email}>{user.email}</div>
                  <div className="monitor-col" title={phoneString}>{phoneString}</div>
                  <div className="monitor-col">{user.dob}</div>
                  <div className="monitor-col" title={`${addressString}, ${user.division} Division`}>{addressString}</div>
                </div>
              );
            })
          ) : (
            <div className="monitor-empty-state">
              No users found matching your search or status.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Monitor;