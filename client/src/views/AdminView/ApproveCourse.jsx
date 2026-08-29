import React, { useState } from 'react';
import { ShieldCheck, Plus, Search, CheckCircle, XCircle, X } from 'lucide-react';
import './ApproveCourse.css';

const ApproveCourse = () => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Available skills for the selectable dropdown (Admin action)
  const availableSkills = [
    'C Language', 'Python', 'Data Structures', 'HTML, CSS', 
    'Java', 'SQL', 'JavaScript', 'OOP Concepts', 
    'Digital Marketing', 'Linux'
  ];

  // Mock Data
  const [courses, setCourses] = useState([
    { id: '01', courseName: 'C Programming', instructorName: 'Taukir Ahmed', level: 'Beginner', skills: ['C Programming', 'Problem Solving'], selectedSkill: '' },
    { id: '02', courseName: 'Python for Beginners', instructorName: 'Nusrat Jahan', level: 'Beginner', skills: ['Python Basics', 'Django'], selectedSkill: '' },
    { id: '03', courseName: 'Data Structures in C', instructorName: 'Sabbir Rahman', level: 'Intermediate', skills: ['Data Structures', 'Algorithms'], selectedSkill: '' },
    { id: '04', courseName: 'Web Development Basics', instructorName: 'Farhana Islam', level: 'Beginner', skills: ['HTML & CSS', 'JavaScript'], selectedSkill: '' },
    { id: '05', courseName: 'Java Programming', instructorName: 'Mehedi Hasan', level: 'Intermediate', skills: ['Java', 'OOP Concepts'], selectedSkill: '' },
    { id: '06', courseName: 'Database Management', instructorName: 'Rifat Mahmud', level: 'Intermediate', skills: ['SQL', 'Database Design'], selectedSkill: '' },
    { id: '07', courseName: 'JavaScript Essentials', instructorName: 'Tanjila Akter', level: 'Beginner', skills: ['JavaScript', 'React'], selectedSkill: '' },
    { id: '08', courseName: 'Object Oriented Programming', instructorName: 'Imran Hossain', level: 'Intermediate', skills: ['C++', 'System Design'], selectedSkill: '' },
    { id: '09', courseName: 'Digital Marketing Basics', instructorName: 'Jannatul Ferdous', level: 'Beginner', skills: ['SEO', 'Content Marketing'], selectedSkill: '' },
    { id: '10', courseName: 'Linux Fundamentals', instructorName: 'Arifur Rahman', level: 'Beginner', skills: ['Linux OS', 'Bash Scripting'], selectedSkill: '' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  // Handle Admin Skill Selection
  const handleSkillChange = (courseId, newSkill) => {
    setCourses(courses.map(course => 
      course.id === courseId ? { ...course, selectedSkill: newSkill } : course
    ));
  };

  // Handle Approve
  const handleApprove = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    alert(`Approved ${course.courseName} with skill: ${course.selectedSkill}`);
  };

  // Handle Reject
  const handleReject = (courseId) => {
    alert(`Rejected course ID: ${courseId}`);
  };

  // Filter Logic
  const filteredCourses = courses.filter(course => 
    course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.instructorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ac-container">
      
      {/* Header Section */}
      <div className="ac-header-wrapper">
        <div className="ac-header-left">
          <div className="ac-header-icon">
            <ShieldCheck size={28} />
          </div>
          <div className="ac-header-text">
            <h2>Approve Course</h2>
            <p>Review and approve courses submitted by instructors</p>
          </div>
        </div>
        {/* Trigger Modal Open */}
        <button className="ac-add-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Add Skill
        </button>
      </div>

      {/* Search Bar Section */}
      <div className="ac-search-wrapper">
        <div className="ac-search-bar">
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
      <div className="ac-table-wrapper">
        <div className="ac-table-inner">
          
          <div className="ac-table-row ac-table-header">
            <div className="ac-col">#</div>
            <div className="ac-col">Course Name</div>
            <div className="ac-col">Instructor Name</div>
            <div className="ac-col">Course Level</div>
            <div className="ac-col">Certificate List</div>
            <div className="ac-col">Select Skill Name</div>
            <div className="ac-col">Actions</div>
          </div>

          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => {
              const isApproveDisabled = course.selectedSkill === '';

              return (
                <div className="ac-table-row" key={course.id}>
                  <div className="ac-col ac-col-id">{course.id}</div>
                  <div className="ac-col ac-col-name">{course.courseName}</div>
                  <div className="ac-col">{course.instructorName}</div>
                  
                  <div className="ac-col">
                    <span className="ac-level-badge">{course.level}</span>
                  </div>
                  
                  <div className="ac-col">
                    <select className="ac-select" value="default" onChange={() => {}}>
                      <option value="default">View Skills</option>
                      {course.skills.map((skill, index) => (
                        <option key={index} value={skill} disabled>
                          {skill}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ac-col">
                    <select 
                      className="ac-select"
                      value={course.selectedSkill}
                      onChange={(e) => handleSkillChange(course.id, e.target.value)}
                    >
                      <option value="" disabled>Select a skill...</option>
                      {availableSkills.map((skill, index) => (
                        <option key={index} value={skill}>
                          {skill}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ac-col ac-actions">
                    <button 
                      className="ac-btn ac-btn-approve"
                      onClick={() => handleApprove(course.id)}
                      disabled={isApproveDisabled}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>

                    <button 
                      className="ac-btn ac-btn-reject"
                      onClick={() => handleReject(course.id)}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="ac-empty">
              No courses found matching your search.
            </div>
          )}

        </div>
      </div>

      {/* --- ADD SKILL MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="ac-modal-overlay">
          <div className="ac-modal-content">
            
            <button className="ac-modal-close" onClick={() => setIsModalOpen(false)}>
              <X size={24} />
            </button>

            <h3 className="ac-modal-title">Update Skill List</h3>
            <p className="ac-modal-subtitle">Add or update a skill and set its difficulty level.</p>

            <div className="ac-form-group">
              <label>Skill Name <span className="ac-required">*</span></label>
              <input 
                type="text" 
                className="ac-modal-input" 
                placeholder="Enter skill name" 
              />
            </div>

            <div className="ac-form-group">
              <label>Difficulty Level <span className="ac-required">*</span></label>
              <select className="ac-modal-select-field" defaultValue="">
                <option value="" disabled className="ac-placeholder-option">--Select Level--</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="challenging">Challenging</option>
                <option value="difficult">Difficult</option>
              </select>
            </div>

            <div className="ac-modal-actions">
              <button 
                className="ac-btn-cancel" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="ac-btn-ok"
                onClick={() => {
                  alert('Skill updated successfully!');
                  setIsModalOpen(false);
                }}
              >
                OK
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ApproveCourse;