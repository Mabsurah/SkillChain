import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Check, X, RotateCcw } from 'lucide-react';
import './Monitor.css';

const Monitor = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state add kora holo

  const [filterStatus, setFilterStatus] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Database theke Data Fetch Kora
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/monitor');
        const data = await response.json();
        
        // Oracle-er data ke tomar frontend format-e map kora
        const formattedData = data.map(u => ({
          id: u.PARTICIPANT_ID,
          firstName: u.FIRST_NAME || '',
          lastName: u.LAST_NAME || '',
          email: u.EMAIL,
          phone: u.PHONE_NUMBERS || 'N/A', 
          altPhone: '', // Backend theke sob phone comma diye eksathe ashbe
          dob: u.DOB || 'N/A',
          houseNo: u.ADDRESS_HOUSE || '',
          roadNo: u.ADDRESS_ROAD || '',
          area: u.ADDRESS_AREA || '',
          city: u.ADDRESS_CITY || '',
          district: u.ADDRESS_DISTRICT || '',
          division: u.ADDRESS_DIVISION || '',
          status: u.MONITOR_STATUS // Pending, Verified, Rejected
        }));

        setUsers(formattedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching monitor users:", error);
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setSelectedUserId(null); 
  };

  // Nicher action gulo ekhon local state update korche. Future-e ekhane PUT/POST API hobe.
  const handleAccept = () => {
    setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, status: 'Verified' } : u));
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
    const allPhones = user.phone.toLowerCase();
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

        {/* Action Buttons */}
        <div className="monitor-header-actions">
          {filterStatus === 'Pending' && (
            <>
              <button 
                className="monitor-action-btn monitor-btn-accept" 
                onClick={handleAccept}
                disabled={!selectedUserId}
              >
                <Check size={18} /> Verify
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
            <option value="Verified">Verified</option>
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

          {isLoading ? (
             <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
               Loading real data from Oracle 11g Database...
             </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const fullName = `${user.firstName} ${user.lastName}`;
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
                  <div className="monitor-col" title={user.phone}>{user.phone}</div>
                  <div className="monitor-col">{user.dob}</div>
                  <div className="monitor-col" title={`${addressString}`}>{addressString}</div>
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