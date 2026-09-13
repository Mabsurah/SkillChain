const { executeOracle, getDatabaseStatus } = require("../config/database");

// In-Memory Database Store mirroring the Oracle Dummy Data for fallback
const mockStore = {
  users: [
    { email: "admin1@gmail.com", password: "Admin@123", role: "admin" },
    { email: "admin2@gmail.com", password: "Admin@456", role: "admin" },
    { email: "admin3@gmail.com", password: "Admin@789", role: "admin" },
    { email: "admin4@gmail.com", password: "Admin@321", role: "admin" },
    { email: "admin5@gmail.com", password: "Admin@654", role: "admin" },
    { email: "rahim@gmail.com", password: "Rahim@123", role: "participant" },
    { email: "sadia@gmail.com", password: "Sadia@123", role: "participant" },
    { email: "tanvir@gmail.com", password: "Tanvir@123", role: "participant" },
    { email: "nusrat@gmail.com", password: "Nusrat@123", role: "participant" },
    { email: "fahim@gmail.com", password: "Fahim@123", role: "participant" },
    { email: "student_4852@gmail.com", password: "Password@123", role: "participant" },
    { email: "fatima@gmail.com", password: "Fatima@123", role: "participant" },
    { email: "rahmankaif27@gmail.com", password: "kaif", role: "participant" },
    { email: "orbit5@gmail.com", password: "oo", role: "participant" }
  ],
  participants: [
    { participant_id: "P001", email: "rahim@gmail.com", first_name: "Rahim", last_name: "Ahmed", credit: 900.0, status: "Approved", average_rating: 4.5, address_house: "12", address_road: "Mirpur Road", address_area: "Mirpur", address_city: "Dhaka", address_district: "Dhaka", address_division: "Dhaka", date_of_birth: "2003-05-15", phone: "+8801711111111", alt_phone: "" },
    { participant_id: "P002", email: "sadia@gmail.com", first_name: "Sadia", last_name: "Islam", credit: 350.0, status: "Approved", average_rating: 4.8, address_house: "25", address_road: "Dhanmondi Road", address_area: "Dhanmondi", address_city: "Dhaka", address_district: "Dhaka", address_division: "Dhaka", date_of_birth: "2002-08-21", phone: "+8801722222222", alt_phone: "" },
    { participant_id: "P003", email: "tanvir@gmail.com", first_name: "Tanvir", last_name: "Hossain", credit: 2000.0, status: "Approved", average_rating: 4.9, address_house: "18", address_road: "Zindabazar Road", address_area: "Zindabazar", address_city: "Sylhet", address_district: "Sylhet", address_division: "Sylhet", date_of_birth: "2004-02-10", phone: "+8801733333333", alt_phone: "" },
    { participant_id: "P004", email: "nusrat@gmail.com", first_name: "Nusrat", last_name: "Jahan", credit: 250.0, status: "Approved", average_rating: 4.2, address_house: "7", address_road: "College Road", address_area: "Uttara", address_city: "Dhaka", address_district: "Dhaka", address_division: "Dhaka", date_of_birth: "2003-11-05", phone: "+8801744444444", alt_phone: "" },
    { participant_id: "P005", email: "fahim@gmail.com", first_name: "Fahim", last_name: "Hasan", credit: 900.0, status: "Approved", average_rating: 4.7, address_house: "31", address_road: "Station Road", address_area: "Kotwali", address_city: "Chattogram", address_district: "Chattogram", address_division: "Chattogram", date_of_birth: "2001-12-17", phone: "+8801755555555", alt_phone: "" },
    { participant_id: "P006", email: "student_4852@gmail.com", first_name: "Tariq Al", last_name: "Mahmud Updated", credit: 700.0, status: "Pending", average_rating: 0.0, address_house: "10", address_road: "Kakrail Road", address_area: "Kakrail", address_city: "Dhaka", address_district: "Dhaka", address_division: "Dhaka", date_of_birth: "2000-01-01", phone: "+8801766666666", alt_phone: "" },
    { participant_id: "P007", email: "rahmankaif27@gmail.com", first_name: "Kaif", last_name: "Rahman", credit: 500.0, status: "Approved", average_rating: 4.6, address_house: "14", address_road: "Banani Road", address_area: "Banani", address_city: "Dhaka", address_district: "Dhaka", address_division: "Dhaka", date_of_birth: "2001-04-12", phone: "+8801777777777", alt_phone: "" },
    { participant_id: "P008", email: "fatima@gmail.com", first_name: "Fatima Noor", last_name: "Zahra", credit: 400.0, status: "Pending", average_rating: 4.3, address_house: "8", address_road: "Gulshan Avenue", address_area: "Gulshan", address_city: "Dhaka", address_district: "Dhaka", address_division: "Dhaka", date_of_birth: "2002-09-18", phone: "+8801788888888", alt_phone: "" },
    { participant_id: "P009", email: "orbit5@gmail.com", first_name: "Tssnuva", last_name: "Orbit", credit: 150.0, status: "Pending", average_rating: 0.0, address_house: "5", address_road: "Dhanmondi 27", address_area: "Dhanmondi", address_city: "Dhaka", address_district: "Dhaka", address_division: "Dhaka", date_of_birth: "2003-03-25", phone: "+8801799999999", alt_phone: "" }
  ],
  skills: [
    { skill_id: "S001", admin_id: "A001", skill_name: "C++ Programming", skill_tier: "Advanced" },
    { skill_id: "S002", admin_id: "A002", skill_name: "Web Development", skill_tier: "Intermediate" },
    { skill_id: "S003", admin_id: "A003", skill_name: "Python Programming", skill_tier: "Advanced" },
    { skill_id: "S004", admin_id: "A004", skill_name: "Database Management", skill_tier: "Intermediate" },
    { skill_id: "S005", admin_id: "A005", skill_name: "Machine Learning", skill_tier: "Advanced" }
  ],
  courses: [
    {
      course_id: "C001",
      course_title: "Advanced C++ Programming",
      course_level: "Advanced",
      price: 1200.0,
      participant_id: "P001",
      skill_id: "S001",
      progress_id: "PR001",
      status: "Approved",
      total_classes: 5,
      lessons: [
        { id: "CT001", asset_id: "AS001", content_id: "CT001", course_id: "C001", title: "Pointer Arithmetic & Dynamic Memory Management", videoUrl: "https://www.youtube.com/embed/WDX1gLtCIlc", duration: "45 mins" },
        { id: "CT002", asset_id: "AS002", content_id: "CT002", course_id: "C001", title: "Object-Oriented Design, Polymorphism & Virtual Functions", videoUrl: "https://www.youtube.com/embed/wEWHq8FzdMw", duration: "50 mins" },
        { id: "CT003", asset_id: "AS003", content_id: "CT003", course_id: "C001", title: "Modern C++ Templates & Standard Template Library (STL)", videoUrl: "https://www.youtube.com/embed/vLnPwxZdW4Y", duration: "55 mins" },
        { id: "CT004", asset_id: "AS004", content_id: "CT004", course_id: "C001", title: "Multithreading, Concurrency & Memory Model", videoUrl: "https://www.youtube.com/embed/7S_tz1z_5bA", duration: "40 mins" },
        { id: "CT005", asset_id: "AS005", content_id: "CT005", course_id: "C001", title: "High-Performance Low-Latency Architecture Capstone", videoUrl: "https://www.youtube.com/embed/8jLOx1hD3_o", duration: "60 mins" }
      ]
    },
    {
      course_id: "C002",
      course_title: "Full Stack Web Development",
      course_level: "Intermediate",
      price: 1500.0,
      participant_id: "P002",
      skill_id: "S002",
      progress_id: "PR002",
      status: "Approved",
      total_classes: 5,
      lessons: [
        { id: "CT006", asset_id: "AS006", content_id: "CT006", course_id: "C002", title: "Responsive Frontend Engineering with React & Hooks", videoUrl: "https://www.youtube.com/embed/WDX1gLtCIlc", duration: "45 mins" },
        { id: "CT007", asset_id: "AS007", content_id: "CT007", course_id: "C002", title: "RESTful API Design & Express Middleware Architecture", videoUrl: "https://www.youtube.com/embed/wEWHq8FzdMw", duration: "50 mins" },
        { id: "CT008", asset_id: "AS008", content_id: "CT008", course_id: "C002", title: "Database Integration & Transaction Management", videoUrl: "https://www.youtube.com/embed/vLnPwxZdW4Y", duration: "40 mins" },
        { id: "CT009", asset_id: "AS009", content_id: "CT009", course_id: "C002", title: "Authentication, JWT & Role-Based Access Control", videoUrl: "https://www.youtube.com/embed/7S_tz1z_5bA", duration: "35 mins" },
        { id: "CT010", asset_id: "AS010", content_id: "CT010", course_id: "C002", title: "Full Stack Deployment, Docker & Production CI/CD", videoUrl: "https://www.youtube.com/embed/8jLOx1hD3_o", duration: "55 mins" }
      ]
    },
    {
      course_id: "C003",
      course_title: "Python for Data Science",
      course_level: "Advanced",
      price: 1300.0,
      participant_id: "P003",
      skill_id: "S003",
      progress_id: "PR003",
      status: "Approved",
      total_classes: 5,
      lessons: [
        { id: "CT011", asset_id: "AS011", content_id: "CT011", course_id: "C003", title: "High-Performance Vectorized Computations with NumPy", videoUrl: "https://www.youtube.com/embed/WDX1gLtCIlc", duration: "40 mins" },
        { id: "CT012", asset_id: "AS012", content_id: "CT012", course_id: "C003", title: "Data Wrangling, Cleaning & Transformation with Pandas", videoUrl: "https://www.youtube.com/embed/wEWHq8FzdMw", duration: "50 mins" },
        { id: "CT013", asset_id: "AS013", content_id: "CT013", course_id: "C003", title: "Exploratory Data Analysis & Advanced Data Visualization", videoUrl: "https://www.youtube.com/embed/vLnPwxZdW4Y", duration: "45 mins" },
        { id: "CT014", asset_id: "AS014", content_id: "CT014", course_id: "C003", title: "Statistical Hypothesis Testing & Probability Distributions", videoUrl: "https://www.youtube.com/embed/7S_tz1z_5bA", duration: "50 mins" },
        { id: "CT015", asset_id: "AS015", content_id: "CT015", course_id: "C003", title: "Predictive Analytics & Model Training Pipelines", videoUrl: "https://www.youtube.com/embed/8jLOx1hD3_o", duration: "60 mins" }
      ]
    },
    {
      course_id: "C004",
      course_title: "Oracle Database Management",
      course_level: "Intermediate",
      price: 1000.0,
      participant_id: "P004",
      skill_id: "S004",
      progress_id: "PR004",
      status: "Approved",
      total_classes: 5,
      lessons: [
        { id: "CT016", asset_id: "AS016", content_id: "CT016", course_id: "C004", title: "Relational Schema Design & Table Normalization", videoUrl: "https://www.youtube.com/embed/WDX1gLtCIlc", duration: "45 mins" },
        { id: "CT017", asset_id: "AS017", content_id: "CT017", course_id: "C004", title: "Complex SQL Joins, Subqueries & Aggregations", videoUrl: "https://www.youtube.com/embed/wEWHq8FzdMw", duration: "50 mins" },
        { id: "CT018", asset_id: "AS018", content_id: "CT018", course_id: "C004", title: "PL/SQL Stored Procedures, Functions & Triggers", videoUrl: "https://www.youtube.com/embed/vLnPwxZdW4Y", duration: "60 mins" },
        { id: "CT019", asset_id: "AS019", content_id: "CT019", course_id: "C004", title: "Transaction Isolation, ACID Properties & Concurrency", videoUrl: "https://www.youtube.com/embed/7S_tz1z_5bA", duration: "40 mins" },
        { id: "CT020", asset_id: "AS020", content_id: "CT020", course_id: "C004", title: "B-Tree Indexing, Execution Plans & Performance Tuning", videoUrl: "https://www.youtube.com/embed/8jLOx1hD3_o", duration: "55 mins" }
      ]
    },
    {
      course_id: "C005",
      course_title: "Introduction to Machine Learning",
      course_level: "Advanced",
      price: 1800.0,
      participant_id: "P005",
      skill_id: "S005",
      progress_id: "PR005",
      status: "Approved",
      total_classes: 5,
      lessons: [
        { id: "CT021", asset_id: "AS021", content_id: "CT021", course_id: "C005", title: "Supervised Learning, Cost Functions & Gradient Descent", videoUrl: "https://www.youtube.com/embed/WDX1gLtCIlc", duration: "50 mins" },
        { id: "CT022", asset_id: "AS022", content_id: "CT022", course_id: "C005", title: "Logistic Regression, Decision Trees & Ensemble Methods", videoUrl: "https://www.youtube.com/embed/wEWHq8FzdMw", duration: "55 mins" },
        { id: "CT023", asset_id: "AS023", content_id: "CT023", course_id: "C005", title: "Unsupervised Clustering with K-Means & Dimensionality Reduction", videoUrl: "https://www.youtube.com/embed/vLnPwxZdW4Y", duration: "45 mins" },
        { id: "CT024", asset_id: "AS024", content_id: "CT024", course_id: "C005", title: "Deep Neural Networks, Activation Functions & Backpropagation", videoUrl: "https://www.youtube.com/embed/7S_tz1z_5bA", duration: "60 mins" },
        { id: "CT025", asset_id: "AS025", content_id: "CT025", course_id: "C005", title: "Model Evaluation, Cross-Validation & Hyperparameter Tuning", videoUrl: "https://www.youtube.com/embed/8jLOx1hD3_o", duration: "50 mins" }
      ]
    }
  ],
  certificates: [
    { id: 1, certId: "CERT001", skill: "C++ Programming", status: "Accepted", participant_id: "P001", asset: "https://skillchain.com/certificates/CERT001" },
    { id: 2, certId: "CERT002", skill: "Web Development", status: "Accepted", participant_id: "P002", asset: "https://skillchain.com/certificates/CERT002" },
    { id: 3, certId: "CERT003", skill: "Python Programming", status: "Accepted", participant_id: "P003", asset: "https://skillchain.com/certificates/CERT003" },
    { id: 4, certId: "CERT004", skill: "Database Management", status: "Pending", participant_id: "P004", asset: "https://skillchain.com/certificates/CERT004" },
    { id: 5, certId: "CERT005", skill: "Machine Learning", status: "Accepted", participant_id: "P005", asset: "https://skillchain.com/certificates/CERT005" }
  ],
  enrolls: [
    { participant_id: "P001", course_id: "C001" },
    { participant_id: "P002", course_id: "C002" },
    { participant_id: "P003", course_id: "C003" },
    { participant_id: "P004", course_id: "C004" },
    { participant_id: "P005", course_id: "C005" }
  ],
  feedbacks: [
    { feedback_id: "F001", comment_text: "Excellent course content and examples.", rating: 4.8, course_id: "C001", instructor_name: "Rahim Ahmed" },
    { feedback_id: "F002", comment_text: "Very useful but some topics were difficult.", rating: 4.2, course_id: "C002", instructor_name: "Sadia Islam" },
    { feedback_id: "F003", comment_text: "Great explanation and practical exercises.", rating: 4.9, course_id: "C003", instructor_name: "Tanvir Hossain" },
    { feedback_id: "F004", comment_text: "Good database examples.", rating: 4.0, course_id: "C004", instructor_name: "Nusrat Jahan" },
    { feedback_id: "F005", comment_text: "Very comprehensive course.", rating: 4.7, course_id: "C005", instructor_name: "Fahim Hasan" }
  ],
  notifications: [
    { id: 1, type: "success", tag: "Congratulations!", message: "Your contents are approved as a course in this platform. Keep contributing, Champ!", time: "Just now", isUnread: true },
    { id: 2, type: "warning", tag: "Attention!", message: "You have achieved 88% marks in the C++ Programming course. Keep improving!", time: "10 minutes ago", isUnread: true },
    { id: 3, type: "info", tag: "Certificate Verified", message: "Your Oracle Database certificate has been verified by the administrator.", time: "1 hour ago", isUnread: false }
  ]
};

// ============================================================
// 1. PL/SQL STORED FUNCTION EXECUTION
// ============================================================
async function runFunctionQuery(functionName, params = {}) {
  const startTime = Date.now();
  let sqlText = "";

  if (functionName === "GET_PARTICIPANT_CREDIT_TIER") {
    const pid = params.participant_id || "P003";
    sqlText = `SELECT get_participant_credit_tier('${pid}') AS credit_tier, participant_id, first_name, last_name, credit FROM participant WHERE participant_id = '${pid}'`;

    try {
      const oracleRes = await executeOracle(sqlText);
      if (oracleRes.data && oracleRes.data.length > 0) {
        return {
          queryType: "PL/SQL Function",
          functionName,
          sql: sqlText,
          executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
          data: oracleRes.data,
          source: "ORACLE_LIVE"
        };
      }
    } catch (e) {
      console.warn("Oracle function execution fallback:", e.message);
    }

    // Fallback simulation
    const p = mockStore.participants.find(item => item.participant_id === pid) || mockStore.participants[0];
    let tier = "BRONZE NEWBIE (1x Standard)";
    if (p.credit >= 800) tier = "PLATINUM ELITE (3x Multiplier)";
    else if (p.credit >= 500) tier = "GOLD PRO (2x Multiplier)";
    else if (p.credit >= 300) tier = "SILVER SCHOLAR (1.5x Multiplier)";

    return {
      queryType: "PL/SQL Function",
      functionName,
      sql: sqlText,
      executionTimeMs: Date.now() - startTime,
      data: [{
        CREDIT_TIER: tier,
        PARTICIPANT_ID: p.participant_id,
        FIRST_NAME: p.first_name,
        LAST_NAME: p.last_name,
        CREDIT: p.credit
      }],
      source: "SIMULATION_ENGINE"
    };
  } else {
    // CALCULATE_COURSE_DISCOUNT
    const cid = params.course_id || "C001";
    const discount = params.discount_pct !== undefined ? params.discount_pct : 15;
    sqlText = `SELECT course_id, course_title, price AS original_price, calculate_course_discount(course_id, ${discount}) AS discounted_price FROM course WHERE course_id = '${cid}'`;

    try {
      const oracleRes = await executeOracle(sqlText);
      if (oracleRes.data && oracleRes.data.length > 0) {
        return {
          queryType: "PL/SQL Function",
          functionName: "CALCULATE_COURSE_DISCOUNT",
          sql: sqlText,
          executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
          data: oracleRes.data,
          source: "ORACLE_LIVE"
        };
      }
    } catch (e) {
      console.warn("Oracle calculate_course_discount fallback:", e.message);
    }

    const c = mockStore.courses.find(item => item.course_id === cid) || mockStore.courses[0];
    const discPrice = (c.price * (1 - discount / 100)).toFixed(2);

    return {
      queryType: "PL/SQL Function",
      functionName: "CALCULATE_COURSE_DISCOUNT",
      sql: sqlText,
      executionTimeMs: Date.now() - startTime,
      data: [{
        COURSE_ID: c.course_id,
        COURSE_TITLE: c.course_title,
        ORIGINAL_PRICE: c.price,
        DISCOUNTED_PRICE: parseFloat(discPrice)
      }],
      source: "SIMULATION_ENGINE"
    };
  }
}

// ============================================================
// 2. SUBQUERY EXECUTION (Nested, Correlated, Set Membership)
// ============================================================
async function runSubquery(subqueryType) {
  const startTime = Date.now();
  let sqlText = "";

  if (subqueryType === "SCALAR_COMPARISON") {
    sqlText = `SELECT participant_id, first_name || ' ' || last_name AS full_name, credit, status
FROM participant 
WHERE credit > (SELECT AVG(credit) FROM participant)
ORDER BY credit DESC`;
  } else if (subqueryType === "CORRELATED") {
    sqlText = `SELECT c.course_id, c.course_title, c.course_level, c.price, s.skill_name
FROM course c
JOIN skill s ON c.skill_id = s.skill_id
WHERE c.price >= (
    SELECT AVG(c2.price) 
    FROM course c2 
    WHERE c2.skill_id = c.skill_id
)`;
  } else {
    sqlText = `SELECT p.participant_id, p.first_name || ' ' || p.last_name AS student_name, p.email, p.average_rating
FROM participant p
WHERE p.participant_id IN (
    SELECT a.participant_id 
    FROM attempts a 
    WHERE a.score >= 90.0
)`;
  }

  try {
    const oracleRes = await executeOracle(sqlText);
    if (oracleRes.data) {
      return {
        queryType: "Subquery",
        subqueryType,
        sql: sqlText,
        executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
        data: oracleRes.data,
        source: "ORACLE_LIVE"
      };
    }
  } catch (e) {
    console.warn("Oracle subquery execution fallback:", e.message);
  }

  let result = [];
  if (subqueryType === "SCALAR_COMPARISON") {
    const avgCredit = mockStore.participants.reduce((acc, p) => acc + p.credit, 0) / mockStore.participants.length;
    result = mockStore.participants
      .filter(p => p.credit > avgCredit)
      .map(p => ({
        PARTICIPANT_ID: p.participant_id,
        FULL_NAME: `${p.first_name} ${p.last_name}`,
        CREDIT: p.credit,
        STATUS: p.status
      }));
  } else if (subqueryType === "CORRELATED") {
    result = mockStore.courses.map(c => {
      const skill = mockStore.skills.find(s => s.skill_id === c.skill_id);
      return {
        COURSE_ID: c.course_id,
        COURSE_TITLE: c.course_title,
        COURSE_LEVEL: c.course_level,
        PRICE: c.price,
        SKILL_NAME: skill ? skill.skill_name : "General"
      };
    });
  } else {
    result = [
      { PARTICIPANT_ID: "P003", STUDENT_NAME: "Tanvir Hossain", EMAIL: "tanvir@gmail.com", AVERAGE_RATING: 4.9 },
      { PARTICIPANT_ID: "P005", STUDENT_NAME: "Fahim Hasan", EMAIL: "fahim@gmail.com", AVERAGE_RATING: 4.7 }
    ];
  }

  return {
    queryType: "Subquery",
    subqueryType,
    sql: sqlText,
    executionTimeMs: Date.now() - startTime,
    data: result,
    source: "SIMULATION_ENGINE"
  };
}

// ============================================================
// 3. DATABASE VIEW EXECUTION
// ============================================================
async function runViewQuery(viewName = "v_course_analytics") {
  const startTime = Date.now();
  const sqlText = `SELECT * FROM ${viewName}`;

  try {
    const oracleRes = await executeOracle(sqlText);
    if (oracleRes.data) {
      return {
        queryType: "Oracle View",
        viewName,
        sql: sqlText,
        executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
        data: oracleRes.data,
        source: "ORACLE_LIVE"
      };
    }
  } catch (e) {
    console.warn("Oracle view execution fallback:", e.message);
  }

  let result = [];
  if (viewName === "v_course_analytics") {
    result = mockStore.courses.map(c => {
      const skill = mockStore.skills.find(s => s.skill_id === c.skill_id);
      const instructor = mockStore.participants.find(p => p.participant_id === c.participant_id);
      const feedback = mockStore.feedbacks.find(f => f.course_id === c.course_id);

      return {
        COURSE_ID: c.course_id,
        COURSE_TITLE: c.course_title,
        COURSE_LEVEL: c.course_level,
        PRICE: c.price,
        SKILL_NAME: skill ? skill.skill_name : "N/A",
        INSTRUCTOR_NAME: instructor ? `${instructor.first_name} ${instructor.last_name}` : "N/A",
        AVG_COURSE_RATING: feedback ? feedback.rating : 4.5,
        TOTAL_ENROLLED_STUDENTS: 1
      };
    });
  } else {
    result = mockStore.participants.map(p => ({
      PARTICIPANT_ID: p.participant_id,
      FULL_NAME: `${p.first_name} ${p.last_name}`,
      EMAIL: p.email,
      CREDIT: p.credit,
      ACCOUNT_STATUS: p.status,
      AVERAGE_RATING: p.average_rating,
      ENROLLED_COURSES_COUNT: mockStore.enrolls.filter(e => e.participant_id === p.participant_id).length,
      VERIFIED_CERTS_COUNT: mockStore.certificates.filter(cert => cert.participant_id === p.participant_id && cert.status === "Accepted").length
    }));
  }

  return {
    queryType: "Oracle View",
    viewName,
    sql: sqlText,
    executionTimeMs: Date.now() - startTime,
    data: result,
    source: "SIMULATION_ENGINE"
  };
}

// ============================================================
// 4. ABSTRACT DATATYPE (ADT) EXECUTION
// ============================================================
async function runAdtQuery(participantId = "P001") {
  const startTime = Date.now();
  const sqlText = `SELECT 
    p.participant_id, 
    p.first_name || ' ' || p.last_name AS full_name,
    t_participant_address(
        p.address_house, p.address_road, p.address_area, 
        p.address_city, p.address_district, p.address_division
    ).get_formatted_address() AS formatted_adt_address,
    t_participant_address(
        p.address_house, p.address_road, p.address_area, 
        p.address_city, p.address_district, p.address_division
    ).get_short_location() AS short_location
FROM participant p
WHERE p.participant_id = '${participantId}'`;

  try {
    const oracleRes = await executeOracle(sqlText);
    if (oracleRes.data && oracleRes.data.length > 0) {
      return {
        queryType: "Abstract Datatype (ADT)",
        typeName: "t_participant_address",
        sql: sqlText,
        executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
        data: oracleRes.data,
        source: "ORACLE_LIVE"
      };
    }
  } catch (e) {
    console.warn("Oracle ADT execution fallback:", e.message);
  }

  const p = mockStore.participants.find(item => item.participant_id === participantId) || mockStore.participants[0];
  return {
    queryType: "Abstract Datatype (ADT)",
    typeName: "t_participant_address",
    sql: sqlText,
    executionTimeMs: Date.now() - startTime,
    data: [{
      PARTICIPANT_ID: p.participant_id,
      FULL_NAME: `${p.first_name} ${p.last_name}`,
      FORMATTED_ADT_ADDRESS: `House #${p.address_house}, Road #${p.address_road}, ${p.address_area}, ${p.address_city}, ${p.address_district} (${p.address_division} Div.)`,
      SHORT_LOCATION: `${p.address_area}, ${p.address_city}`
    }],
    source: "SIMULATION_ENGINE"
  };
}

// ============================================================
// 5. PL/SQL STORED PROCEDURE / ANONYMOUS BLOCK
// ============================================================
async function runPlsqlBlock(pid = "P001", cid = "C004") {
  const startTime = Date.now();
  const sqlText = `DECLARE
    v_status VARCHAR2(50);
    v_msg    VARCHAR2(500);
BEGIN
    enroll_participant_proc(
        p_pid    => '${pid}',
        p_cid    => '${cid}',
        p_status => v_status,
        p_msg    => v_msg
    );
    DBMS_OUTPUT.PUT_LINE('STATUS:' || v_status);
    DBMS_OUTPUT.PUT_LINE('MSG:' || v_msg);
END;`;

  try {
    const oracleRes = await executeOracle(sqlText);
    if (oracleRes.output) {
      const statusMatch = oracleRes.output.match(/STATUS:(.*)/i);
      const msgMatch = oracleRes.output.match(/MSG:(.*)/i);
      const status = statusMatch ? statusMatch[1].trim() : "SUCCESS";
      const msg = msgMatch ? msgMatch[1].trim() : oracleRes.output;

      return {
        queryType: "PL/SQL Procedure / Anonymous Block",
        procedure: "enroll_participant_proc",
        sql: sqlText,
        executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
        bindResults: {
          V_STATUS: status,
          V_MSG: msg
        },
        source: "ORACLE_LIVE"
      };
    }
  } catch (e) {
    console.warn("Oracle PL/SQL procedure execution fallback:", e.message);
  }

  const p = mockStore.participants.find(item => item.participant_id === pid);
  const c = mockStore.courses.find(item => item.course_id === cid);
  let status = "SUCCESS";
  let message = "";

  if (!p || !c) {
    status = "NOT_FOUND";
    message = "Invalid Participant ID or Course ID in PL/SQL validation block.";
  } else {
    const isEnrolled = mockStore.enrolls.some(e => e.participant_id === pid && e.course_id === cid);
    const coursePrice = Number(c.price || c.charge || 0);
    const currentCredit = Number(p.credit || 0);

    if (isEnrolled) {
      status = "ALREADY_ENROLLED";
      message = `PL/SQL Notice: Participant ${p.first_name} is already enrolled in ${c.course_title}.`;
    } else if (currentCredit < coursePrice) {
      status = "INSUFFICIENT_CREDITS";
      message = `PL/SQL Notice: Insufficient credits! Current balance is ${currentCredit} Credits, but course requires ${coursePrice} Credits.`;
    } else {
      p.credit = currentCredit - coursePrice;
      mockStore.enrolls.push({ participant_id: pid, course_id: cid });
      message = `PL/SQL Success: Enrolled ${p.first_name} into ${c.course_title}. ${coursePrice} Credits deducted. Remaining balance: ${p.credit} Credits.`;
    }
  }

  return {
    queryType: "PL/SQL Procedure / Anonymous Block",
    procedure: "enroll_participant_proc",
    sql: sqlText,
    executionTimeMs: Date.now() - startTime,
    bindResults: {
      V_STATUS: status,
      V_MSG: message
    },
    source: "SIMULATION_ENGINE"
  };
}

// ============================================================
// 6. EXPLICIT CURSOR PROCEDURE
// ============================================================
async function runCursorProcedure(minPrice = 1000) {
  const startTime = Date.now();
  const sqlText = `DECLARE
    v_count   NUMBER;
    v_summary VARCHAR2(4000);
BEGIN
    generate_course_audit_cursor(
        p_min_price       => ${minPrice},
        p_processed_count => v_count,
        p_audit_summary   => v_summary
    );
    DBMS_OUTPUT.PUT_LINE('COUNT:' || v_count);
    DBMS_OUTPUT.PUT_LINE('SUMMARY:' || v_summary);
END;`;

  try {
    const oracleRes = await executeOracle(sqlText);
    if (oracleRes.output) {
      const cntMatch = oracleRes.output.match(/COUNT:(.*)/i);
      const sumMatch = oracleRes.output.match(/SUMMARY:(.*)/i);
      const count = cntMatch ? Number(cntMatch[1].trim()) : 0;
      const summary = sumMatch ? sumMatch[1].trim() : oracleRes.output;

      return {
        queryType: "Explicit Cursor",
        procedure: "generate_course_audit_cursor",
        sql: sqlText,
        executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
        cursorMetrics: {
          CURSOR_NAME: "c_course_audit",
          FETCHED_ROWS_COUNT: count,
          AUDIT_LOG: summary
        },
        source: "ORACLE_LIVE"
      };
    }
  } catch (e) {
    console.warn("Oracle Cursor procedure fallback:", e.message);
  }

  const filtered = mockStore.courses.filter(c => c.price >= minPrice);
  const totalValue = filtered.reduce((acc, c) => acc + c.price, 0);
  const details = filtered.map(c => `[${c.course_id}] ${c.course_title} (${c.price} Credits)`).join("; ");
  const summary = `Audit Cursor processed ${filtered.length} courses with total catalog valuation of ${totalValue.toLocaleString()} Credits. Detailed items: ${details}`;

  return {
    queryType: "Explicit Cursor",
    procedure: "generate_course_audit_cursor",
    sql: sqlText,
    executionTimeMs: Date.now() - startTime,
    cursorMetrics: {
      CURSOR_NAME: "c_course_audit",
      FETCHED_ROWS_COUNT: filtered.length,
      TOTAL_CATALOG_VALUE: `${totalValue.toLocaleString()} Credits`,
      AUDIT_LOG: summary
    },
    source: "SIMULATION_ENGINE"
  };
}

// ============================================================
// 7. EXCEPTION HANDLING (User-Defined & Built-In)
// ============================================================
async function runExceptionHandling(pid = "P001", amount = 100, triggerError = false) {
  const startTime = Date.now();
  const deductAmount = triggerError ? 50000 : (amount || 100);

  const sqlText = `DECLARE
    v_status VARCHAR2(50);
    v_msg    VARCHAR2(500);
BEGIN
    deduct_participant_credit(
        p_pid    => '${pid}',
        p_amount => ${deductAmount},
        p_status => v_status,
        p_msg    => v_msg
    );
    DBMS_OUTPUT.PUT_LINE('STATUS:' || v_status);
    DBMS_OUTPUT.PUT_LINE('MSG:' || v_msg);
END;`;

  try {
    const oracleRes = await executeOracle(sqlText);
    if (oracleRes.output) {
      const statusMatch = oracleRes.output.match(/STATUS:(.*)/i);
      const msgMatch = oracleRes.output.match(/MSG:(.*)/i);
      const status = statusMatch ? statusMatch[1].trim() : "SUCCESS";
      const msg = msgMatch ? msgMatch[1].trim() : oracleRes.output;

      let exceptionType = "NONE (Completed Cleanly)";
      if (status.includes("INSUFFICIENT_CREDIT")) exceptionType = "USER_DEFINED (insufficient_credit_ex)";
      else if (status.includes("ACCOUNT_FROZEN")) exceptionType = "USER_DEFINED (account_frozen_ex)";
      else if (status.includes("NO_DATA_FOUND")) exceptionType = "BUILT_IN (NO_DATA_FOUND)";

      return {
        queryType: "Exception Handling",
        procedure: "deduct_participant_credit",
        sql: sqlText,
        executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
        exceptionCaught: exceptionType,
        bindResults: {
          V_STATUS: status,
          V_MSG: msg
        },
        source: "ORACLE_LIVE"
      };
    }
  } catch (e) {
    console.warn("Oracle Exception procedure fallback:", e.message);
  }

  const p = mockStore.participants.find(item => item.participant_id === pid);
  let status = "SUCCESS";
  let message = "";
  let exceptionType = "NONE";

  if (triggerError || deductAmount > 10000) {
    status = "INSUFFICIENT_CREDIT_ERROR";
    exceptionType = "USER_DEFINED (insufficient_credit_ex)";
    message = `Oracle PL/SQL Exception Handled: Participant (${pid}) balance of ${p ? p.credit : 0} credits is insufficient for requested deduction of ${deductAmount} credits. Transaction safely rolled back.`;
  } else if (!p) {
    status = "NO_DATA_FOUND_ERROR";
    exceptionType = "BUILT_IN (NO_DATA_FOUND)";
    message = `Oracle PL/SQL Exception Handled [ORA-01403: no data found]: Participant ID "${pid}" does not exist in the database.`;
  } else if (p.status === "Rejected") {
    status = "ACCOUNT_FROZEN_ERROR";
    exceptionType = "USER_DEFINED (account_frozen_ex)";
    message = `Oracle PL/SQL Exception Handled: Account for ${pid} is marked as Rejected/Frozen. Transaction was rejected.`;
  } else {
    p.credit -= deductAmount;
    status = "SUCCESS";
    exceptionType = "NONE (Completed Cleanly)";
    message = `Transaction Committed: Successfully deducted ${deductAmount} credits. Remaining balance: ${p.credit} credits.`;
  }

  return {
    queryType: "Exception Handling",
    procedure: "deduct_participant_credit",
    sql: sqlText,
    executionTimeMs: Date.now() - startTime,
    exceptionCaught: exceptionType,
    bindResults: {
      V_STATUS: status,
      V_MSG: message
    },
    source: "SIMULATION_ENGINE"
  };
}

// ============================================================
// 8. CUSTOM SQL QUERY EXECUTION (FOR TEACHER DEMONSTRATIONS)
// ============================================================
async function runCustomSqlQuery(customSql) {
  const startTime = Date.now();
  const trimmed = (customSql || "").trim();

  if (!trimmed) {
    throw new Error("Please enter a valid SQL query.");
  }

  try {
    const oracleRes = await executeOracle(trimmed);
    return {
      queryType: "Custom SQL Query",
      sql: trimmed,
      executionTimeMs: oracleRes.executionTimeMs || (Date.now() - startTime),
      data: oracleRes.data || (oracleRes.output ? [{ OUTPUT: oracleRes.output }] : []),
      source: "ORACLE_LIVE",
      success: true
    };
  } catch (err) {
    return {
      queryType: "Custom SQL Query",
      sql: trimmed,
      executionTimeMs: Date.now() - startTime,
      error: true,
      message: err.message || "Failed to execute custom SQL query.",
      source: "ORACLE_LIVE"
    };
  }
}

module.exports = {
  mockStore,
  runFunctionQuery,
  runSubquery,
  runViewQuery,
  runAdtQuery,
  runPlsqlBlock,
  runCursorProcedure,
  runExceptionHandling,
  runCustomSqlQuery
};
