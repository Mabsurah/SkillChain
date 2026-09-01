import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, CheckCircle, XCircle, X } from 'lucide-react';
import './ApproveCourse.css';

const ApproveCourse = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Skills and Courses from Oracle DB
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Skills
        const skillRes = await fetch('http://localhost:5000/api/skills');
        const skillData = await skillRes.json();
        setAvailableSkills(skillData.map(s => s.SKILL_NAME));

        // Fetch Approval List
        const courseRes = await fetch('http://localhost:5000/api/admin/approval-list');
        const courseData = await courseRes.json();
        
        const formattedCourses = courseData.map(c => ({
          id: c.COURSE_ID,
          courseName: c.COURSE_TITLE,
          instructorName: c.INSTRUCTOR_NAME,
          level: c.COURSE_LEVEL,
          skills: [c.CURRENT_SKILL], // Database theke current skill
          selectedSkill: '' 
        }));

        setCourses(formattedCourses);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle Admin Skill Selection
  const handleSkillChange = (courseId, newSkill) => {
    setCourses(courses.map(course => 
      course.id === courseId ? { ...course, selectedSkill: newSkill } : course
    ));
  };

  // Handle Approve (Triggers ADT backend logic)
  const handleApprove = async (courseId) => {
    const course = courses.find(c => c.id === courseId);
    
    try {
      const response = await fetch('http://localhost:5000/api/admin/approve-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          courseName: course.courseName,
          courseLevel: course.level,
          skillName: course.selectedSkill
        })
      });
      
      const result = await response.json();
      if(result.success) {
        alert(result.message); // ADT theke asha message dekhabe
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to approve course.");
    }
  };

  const handleReject = (courseId) => {
    alert(`Rejected course ID: ${courseId}`);
  };

  const filteredCourses = courses.filter(course => 
    course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.instructorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ac-container">
      
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
        <button className="ac-add-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Add Skill
        </button>
      </div>

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

          {isLoading ? (
             <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
               Loading real data from Oracle Database...
             </div>
          ) : filteredCourses.length > 0 ? (
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
              <input type="text" className="ac-modal-input" placeholder="Enter skill name" />
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
              <button className="ac-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="ac-btn-ok" onClick={() => { alert('Skill updated successfully!'); setIsModalOpen(false); }}>OK</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ApproveCourse;