import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import ParticipantLayout from '../layouts/ParticipantLayout';

// Auth
import Login from '../views/Auth/Login';
import Register from '../views/Auth/Register';

// Admin Views
import ApproveCourse from "../views/AdminView/ApproveCourse";
import VerifyCert from '../views/AdminView/VerifyCert';
import CourseReport from "../views/AdminView/CourseReport";
import Monitor from '../views/AdminView/Monitor';
import AdminSkillHub from '../views/AdminView/SkillHub';
import AdminLessonList from '../views/AdminView/LessonList';
// 1. IMPORT ADMIN DASHBOARD HERE:
import AdminDashboard from '../views/AdminView/Dashboard'; 

// Participant Views
import Dashboard from '../views/ParticipantView/Dashboard';
import ParticipantSkillHub from '../views/ParticipantView/SkillHub';
import MyCourses from '../views/ParticipantView/MyCourses';
import Track from '../views/ParticipantView/Track';
import Exam from '../views/ParticipantView/Exam';
import PeerReview from '../views/ParticipantView/PeerReview';
import Contribution from '../views/ParticipantView/Contribution';
import Notifications from '../views/ParticipantView/Notifications';
import Profile from '../views/ParticipantView/Profile';
import ContentList from '../views/ParticipantView/ContentList'; 
import ReviewContent from '../views/ParticipantView/ReviewContent';
import ParticipantLessonList from '../views/ParticipantView/LessonList'; 

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ========================================= */}
      {/* ADMIN ROUTES */}
      {/* ========================================= */}
      <Route path="/admin" element={<AdminLayout />}>
        
        {/* 2. ADD THE DEFAULT REDIRECT AND DASHBOARD ROUTE HERE */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />

        <Route path="approve-course" element={<ApproveCourse />} />
        <Route path="verify-cert" element={<VerifyCert />} />
        <Route path="feedback" element={<CourseReport />} /> 
        <Route path="monitor" element={<Monitor />} />
        <Route path="skillhub" element={<AdminSkillHub />} />
        <Route path="lesson-list" element={<AdminLessonList />} />
      </Route>

      {/* ========================================= */}
      {/* PARTICIPANT ROUTES */}
      {/* ========================================= */}
      <Route path="/participant" element={<ParticipantLayout />}>
        {/* Make sure participant also has a default redirect if you want! */}
        <Route index element={<Navigate to="dashboard" replace />} />
        
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="skillhub" element={<ParticipantSkillHub />} />
        <Route path="my-courses" element={<MyCourses />} />
        <Route path="lesson-list" element={<ParticipantLessonList />} /> 
        <Route path="track" element={<Track />} />
        <Route path="exam" element={<Exam />} />
        <Route path="peer-review" element={<PeerReview />} />
        <Route path="review-content" element={<ReviewContent />} />
        <Route path="contribution" element={<Contribution />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="content-list" element={<ContentList />} /> 
      </Route>
    </Routes>
  );
};

export default AppRoutes;