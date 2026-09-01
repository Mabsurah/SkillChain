import React, { useState, useEffect } from 'react';
import { FileText, Search, Trash2, UserX, Star } from 'lucide-react';
import './CourseReport.css';

const CourseReport = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Database theke (VIEW use kore) data fetch kora
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/reports');
        const data = await response.json();
        
        // Oracle theke asha uppercase data map kora
        const formattedData = data.map(rep => ({
          id: rep.COURSE_ID,
          courseName: rep.COURSE_NAME || '',
          instructorName: rep.INSTRUCTOR_NAME || '',
          courseRating: Number(rep.COURSE_RATING) || 0,
          instructorAvgRating: Number(rep.INSTRUCTOR_AVG_RATING) || 0
        }));

        setReports(formattedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

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
    // Secondary Sort: Instructor Avg Rating (Lowest First)
    return a.instructorAvgRating - b.instructorAvgRating;
  });

  const handleDeleteCourse = (id) => {
    alert(`Deleting course with ID: ${id}`);
    // Future-e ekhane DELETE API call hobe
  };

  const handleDeleteInstructor = (id, instructorName) => {
    alert(`Removing instructor ${instructorName} for course ID: ${id}`);
    // Future-e ekhane DELETE/UPDATE API call hobe
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

          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
               Loading real course reports from Oracle 11g...
            </div>
          ) : sortedReports.length > 0 ? (
            sortedReports.map((report, index) => {
              // Rule: If Instructor's avg rating is >= 4.5, disable the Delete Instructor button
              const isInstructorDeletable = report.instructorAvgRating < 4.5;
              const serialIndex = String(index + 1).padStart(2, '0');

              return (
                <div className="cr-table-row" key={report.id}>
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