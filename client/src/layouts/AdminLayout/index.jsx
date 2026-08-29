import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminNav from './AdminNav';
import './AdminLayout.css'; // This connects the layout styling!

const AdminLayout = () => {
  return (
    <div className="admin-layout-container">
      <AdminNav />
      <div className="admin-main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;