import React, { useState } from 'react';
import { FileText, Search, Trash2, UserX, Star } from 'lucide-react';
import './CourseReport.css';

const CourseReport = () => {
  // Mock data with courseRating and instructorAvgRating
  const [reports] = useState([
    { id: '01', courseName: 'C Programming', instructorName: 'Taukir Ahmed', courseRating: 4.8, instructorAvgRating: 4.7 },
    { id: '02', courseName: 'Python for Beginners', instructorName: 'Nusrat Jahan', courseRating: 4.9, instructorAvgRating: 4.9 },
    { id: '03', courseName: 'Data Structures in C', instructorName: 'Sabbir Rahman', courseRating: 4.2, instructorAvgRating: 4.5 },
    { id: '04', courseName: 'Web Development Basics', instructorName: 'Farhana Islam', courseRating: 4.5, instructorAvgRating: 4.6 },
    { id: '05', courseName: 'Java Programming', instructorName: 'Mehedi Hasan', courseRating: 3.8, instructorAvgRating: 4.1 },
    { id: '06', courseName: 'Database Management', instructorName: 'Rifat Mahmud', courseRating: 4.1, instructorAvgRating: 3.9 }, 
    { id: '07', courseName: 'JavaScript Essentials', instructorName: 'Tanjila Akter', courseRating: 4.7, instructorAvgRating: 4.8 },
    { id: '08', courseName: 'Object Oriented Programming', instructorName: 'Imran Hossain', courseRating: 4.4, instructorAvgRating: 4.6 },
    { id: '09', courseName: 'Digital Marketing Basics', instructorName: 'Jannatul Ferdous', courseRating: 3.5, instructorAvgRating: 3.8 }, 
    { id: '10', courseName: 'Linux Fundamentals', instructorName: 'Arifur Rahman', courseRating: 4.6, instructorAvgRating: 4.5 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  // 1. First, filter based on the search bar
  const filteredReports = reports.filter(rep => 
    rep.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rep.instructorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. Next, sort the filtered results (Lowest to Highest)
  const sortedReports = [...filteredReports].sort((a, b) => {
    // Primary Sort: Course Rating (Lowest First)
    if (a.courseRating !== b.courseRating) {
      return a.courseRating - b.courseRating; 
    }
    // Secondary Sort (if Course Ratings are equal): Instructor Avg Rating (Lowest First)
    return a.instructorAvgRating - b.instructorAvgRating;
  });

  const handleDeleteCourse = (id) => {
    alert(`Deleting course with ID: ${id}`);
  };

  const handleDeleteInstructor = (id, instructorName) => {
    alert(`Removing instructor ${instructorName} for report ID: ${id}`);
  };

  return (
    <div className="cr-container">
      
      {/* Header Section */}
      <div className="cr-header">
        <div className="cr-header-icon">
          <FileText size={28} />
        </div>
        <div className="cr-header-text">
          <h2>Course Report List</h2>
          <p>View and manage course reports submitted by instructors</p>
        </div>
      </div>

      {/* Search Bar Section */}
      <div className="cr-search-wrapper">
        <div className="cr-search-bar">
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search by course name or instructor name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="cr-table-wrapper">
        <div className="cr-table-inner">
          
          <div className="cr-table-row cr-table-header">
            <div className="cr-col">#</div>
            <div className="cr-col">Course Name</div>
            <div className="cr-col">Instructor Name</div>
            <div className="cr-col" style={{ textAlign: 'center' }}>Course Acceptance</div>
            <div className="cr-col" style={{ textAlign: 'center' }}>Instructor Acceptance</div>
            <div className="cr-col">Activities</div>
          </div>

          {sortedReports.length > 0 ? (
            // Added 'index' to perfectly serialize the row numbers
            sortedReports.map((report, index) => {
              // Rule: If Instructor's avg rating is >= 4.5, disable the Delete Instructor button
              const isInstructorDeletable = report.instructorAvgRating < 4.5;
              
              // Format index to always be two digits (01, 02, etc.)
              const serialIndex = String(index + 1).padStart(2, '0');

              return (
                <div className="cr-table-row" key={report.id}>
                  {/* Now displaying the serial index instead of the raw ID */}
                  <div className="cr-col cr-col-id">{serialIndex}</div>
                  <div className="cr-col cr-col-name">{report.courseName}</div>
                  <div className="cr-col">{report.instructorName}</div>
                  
                  {/* Course Acceptance (Rating) */}
                  <div className="cr-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#e2e8f0', fontWeight: '500' }}>
                    <Star size={16} color="#fbbf24" fill="#fbbf24" /> 
                    {report.courseRating.toFixed(1)}
                  </div>

                  {/* Instructor Acceptance (Avg Rating) */}
                  <div className="cr-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#e2e8f0', fontWeight: '500' }}>
                    <Star size={16} color="#fbbf24" fill="#fbbf24" /> 
                    {report.instructorAvgRating.toFixed(1)}
                  </div>

                  {/* Activities Buttons */}
                  <div className="cr-col cr-actions">
                    <button 
                      className="cr-btn cr-btn-delete-course"
                      onClick={() => handleDeleteCourse(report.id)}
                    >
                      <Trash2 size={15} /> Delete Course
                    </button>

                    <button 
                      className="cr-btn cr-btn-delete-instructor"
                      onClick={() => handleDeleteInstructor(report.id, report.instructorName)}
                      disabled={!isInstructorDeletable}
                    >
                      <UserX size={15} /> Delete Instructor
                    </button>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="cr-empty">
              No reports found matching your search.
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default CourseReport;