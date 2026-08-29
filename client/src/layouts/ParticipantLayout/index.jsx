import React from 'react';
import { Outlet } from 'react-router-dom';
import ParticipantNav from './ParticipantNav';
import './ParticipantLayout.css'; // We will create/update this next

const ParticipantLayout = () => {
  return (
    <div className="participant-layout-container">
      
      {/* The Fixed Sidebar on the Left */}
      <ParticipantNav />
      
      {/* The Scrollable Main Content on the Right */}
      <div className="participant-main-content">
        <Outlet /> 
      </div>
      
    </div>
  );
};

export default ParticipantLayout;