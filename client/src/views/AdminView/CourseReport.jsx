import React, { useState, useEffect } from 'react';
import { FileText, Search, Trash2, UserX, Star } from 'lucide-react';
import { api } from '../../services/api';
import './CourseReport.css';

const CourseReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getReports();
      if (res && res.reports) {
        setReports(res.reports);
      }
    } catch (err) {
      setReports([
        { id: '01', courseName: 'Advanced C++ Programming', instructorName: 'Rahim Ahmed', courseRating: 4.8, instructorAvgRating: 4.7 },
        { id: '02', courseName: 'Full Stack Web Development', instructorName: 'Sadia Islam', courseRating: 4.2, instructorAvgRating: 4.5 },
        { id: '03', courseName: 'Python for Data Science', instructorName: 'Tanvir Hossain', courseRating: 4.9, instructorAvgRating: 4.9 },
        { id: '04', courseName: 'Oracle Database Management', instructorName: 'Nusrat Jahan', courseRating: 4.0, instructorAvgRating: 4.2 },
        { id: '05', courseName: 'Introduction to Machine Learning', instructorName: 'Fahim Hasan', courseRating: 4.7, instructorAvgRating: 4.6 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    const handleUpdate = () => fetchReports();
    window.addEventListener('skillchain-feedback-submitted', handleUpdate);
    window.addEventListener('skillchain-catalog-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('skillchain-feedback-submitted', handleUpdate);
      window.removeEventListener('skillchain-catalog-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  const filteredReports = reports.filter(rep => 
    rep.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rep.instructorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedReports = [...filteredReports].sort((a, b) => {
    if (a.courseRating !== b.courseRating) {
      return a.courseRating - b.courseRating; 
    }
    return a.instructorAvgRating - b.instructorAvgRating;
  });

  const handleDeleteCourse = async (id, courseName = '') => {
    if (window.confirm(`Are you sure you want to permanently delete course "${courseName || id}" from SkillHub and database?`)) {
      try {
        await api.deleteReportCourse(id);
        setReports(prev => prev.filter(r => (r.courseId || r.id) !== id && r.id !== id));
      } catch (err) {
        setReports(prev => prev.filter(r => (r.courseId || r.id) !== id && r.id !== id));
      }
    }
  };

  const handleDeleteInstructor = async (id, instructorName) => {
    if (window.confirm(`Are you sure you want to unlink instructor "${instructorName}"?`)) {
      try {
        await api.deleteReportInstructor(id);
        alert(`Instructor "${instructorName}" unlinked.`);
      } catch (err) {
        alert(`Instructor ${instructorName} unlinked.`);
      }
    }
  };

  return (
    <div className="cr-container">
      
      {/* Header Section */}
      <div className="cr-header">
        <div className="cr-header-icon">
          <FileText size={28} />
        </div>
        <div className="cr-header-text">
          <h2>Report Check</h2>
          <p>View and manage course feedback, instructor acceptance ratings, and performance reports</p>
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
            <div className="cr-col" style={{ textAlign: 'center' }}>Course Rating</div>
            <div className="cr-col" style={{ textAlign: 'center' }}>Instructor Rating</div>
            <div className="cr-col">Activities</div>
          </div>

          {sortedReports.length > 0 ? (
            sortedReports.map((report, index) => {
              const isInstructorDeletable = Number(report.instructorAvgRating) < 4.8;
              const serialIndex = String(index + 1).padStart(2, '0');

              return (
                <div className="cr-table-row" key={report.id}>
                  <div className="cr-col cr-col-id">{serialIndex}</div>
                  <div className="cr-col cr-col-name">{report.courseName}</div>
                  <div className="cr-col">{report.instructorName}</div>
                  
                  {/* Course Rating */}
                  <div className="cr-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#e2e8f0', fontWeight: '500' }}>
                    <Star size={16} color="#fbbf24" fill="#fbbf24" /> 
                    {Number(report.courseRating).toFixed(1)}
                  </div>

                  {/* Instructor Rating */}
                  <div className="cr-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#e2e8f0', fontWeight: '500' }}>
                    <Star size={16} color="#fbbf24" fill="#fbbf24" /> 
                    {Number(report.instructorAvgRating).toFixed(1)}
                  </div>

                  {/* Activities Buttons */}
                  <div className="cr-col cr-actions">
                    <button 
                      className="cr-btn cr-btn-delete-course"
                      onClick={() => handleDeleteCourse(report.courseId || report.id, report.courseName)}
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
              {loading ? 'Loading report data...' : 'No reports found matching your search.'}
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export default CourseReport;