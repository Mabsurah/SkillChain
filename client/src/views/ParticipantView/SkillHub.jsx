import React, { useState } from 'react';

import { Search } from 'lucide-react';

import './SkillHub.css';

import CourseDetailsModal from './CourseDetailsModal';



const SkillHub = () => {

  // 1. State for Search

  const [searchQuery, setSearchQuery] = useState('');

 

  // 2. State for Modal

  const [isModalOpen, setIsModalOpen] = useState(false);



  // Mock Database Array with "level" added

  const availableCourses = [

    {

      id: 1,

      title: 'C Programming Course',

      level: 'Beginner',

      totalClasses: 10,

      charge: 100,

    },

    {

      id: 2,

      title: 'Python Programming Course',

      level: 'Beginner',

      totalClasses: 8,

      charge: 80,

    },

    {

      id: 3,

      title: 'JavaScript Essentials',

      level: 'Intermediate',

      totalClasses: 12,

      charge: 120,

    },

    {

      id: 4,

      title: 'Database Management System',

      level: 'Intermediate',

      totalClasses: 15,

      charge: 150,

    },

    {

      id: 5,

      title: 'Web Development Basics',

      level: 'Beginner',

      totalClasses: 9,

      charge: 90,

    },

    {

      id: 6,

      title: 'Data Structures & Algorithms',

      level: 'Expert',

      totalClasses: 14,

      charge: 140,

    }

  ];



  // Filter courses dynamically based on the search query

  const filteredCourses = availableCourses.filter(course =>

    course.title.toLowerCase().includes(searchQuery.toLowerCase())

  );



  return (

    <div className="skillhub-page-container">

     

      {/* Header */}

      <div className="sh-header-section">

        <h2>SkillHub</h2>

        <p>Explore classes and enroll to start learning from experts.</p>

      </div>



      {/* Search Bar */}

      <div className="sh-search-wrapper">

        <Search size={20} className="sh-search-icon" />

        <input

          type="text"

          className="sh-search-input"

          placeholder="Search for a course..."

          value={searchQuery}

          onChange={(e) => setSearchQuery(e.target.value)}

        />

      </div>



      {/* Grid of Course Cards */}

      <div className="sh-grid">

       

        {filteredCourses.length > 0 ? (

          filteredCourses.map((course) => (

            <div className="sh-card" key={course.id}>

             

              <h3 className="sh-course-title">{course.title}</h3>

             

              {/* Level Badge placed directly below the title */}

              <div className="sh-level-badge">

                {course.level}

              </div>

             

              <div className="sh-divider"></div>

             

              {/* Wrapper to align Total Class and Details button horizontally */}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexGrow: 1 }}>

               

                <div className="sh-class-count" style={{ marginBottom: 0, flexGrow: 0 }}>

                  Total Class : {course.totalClasses}

                </div>



                {/* Triggers the modal to open */}

                <button

                  className="sh-details-btn"

                  onClick={() => setIsModalOpen(true)}

                >

                  Details

                </button>

               

              </div>



              <div className="sh-card-actions">

                <div className="sh-charge-box">

                  Charge : {course.charge}

                </div>

                <button className="sh-enroll-btn" onClick={() => alert(`Enrolling in ${course.title}...`)}>

                  Enroll Now

                </button>

              </div>

             

            </div>

          ))

        ) : (

          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: '1.1rem' }}>

            No courses found matching "{searchQuery}"

          </div>

        )}



      </div>



      {/* The Modal Component - Placed outside the grid */}

      <CourseDetailsModal

        isOpen={isModalOpen}

        onClose={() => setIsModalOpen(false)}

      />



    </div>

  );

};



export default SkillHub;