const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { getDatabaseStatus, executeOracle } = require("../config/database");
const {
  mockStore,
  runFunctionQuery,
  runSubquery,
  runViewQuery,
  runAdtQuery,
  runPlsqlBlock,
  runCursorProcedure,
  runExceptionHandling,
  runCustomSqlQuery
} = require("../services/queryService");

// ==========================================
// HELPER: Try Oracle first, fallback to mock
// ==========================================
async function tryOracleOrMock(oracleFn, mockFn) {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const result = await oracleFn();
      if (result && !result.isSimulated) return result;
    }
  } catch (e) {
    console.warn("[Fallback] Using mock data:", e.message);
  }
  return mockFn();
}

// ==========================================
// HEALTH & DATABASE STATUS
// ==========================================
router.get("/health", (req, res) => {
  const dbStatus = getDatabaseStatus();
  res.json({
    status: "online",
    message: "SkillChain Backend API is running smoothly",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// AUTHENTICATION
// ==========================================
router.post("/auth/login", async (req, res) => {
  const email = (req.body.email || "").trim();
  const password = (req.body.password || "").trim();

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Please enter both email and password." });
  }

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      // Strictly verify email and password against Oracle USERS table
      const result = await executeOracle(
        `SELECT u.email, u.password, 
                CASE WHEN a.admin_id IS NOT NULL THEN 'admin' ELSE 'participant' END as role,
                p.participant_id, p.first_name, p.last_name, p.credit, p.status
         FROM users u
         LEFT JOIN admin a ON LOWER(TRIM(u.email)) = LOWER(TRIM(a.email))
         LEFT JOIN participant p ON LOWER(TRIM(u.email)) = LOWER(TRIM(p.email))
         WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(:email)) AND TRIM(u.password) = TRIM(:password)`,
        { email, password }
      );

      if (result.data && result.data.length > 0) {
        const user = result.data[0];
        const userRole = (user.ROLE || "").toLowerCase() === "admin" ? "admin" : "participant";
        const fullName = (user.FIRST_NAME || user.LAST_NAME) ? `${user.FIRST_NAME || ''} ${user.LAST_NAME || ''}`.trim() : (userRole === "admin" ? "Platform Admin" : "Learner");
        return res.json({
          success: true,
          role: userRole,
          user: {
            email: user.EMAIL || email,
            name: fullName,
            role: userRole,
            participantId: user.PARTICIPANT_ID || (userRole === "admin" ? "A001" : "P001"),
            credit: (user.CREDIT !== undefined && user.CREDIT !== "") ? Number(user.CREDIT) : 0,
            status: user.STATUS || ""
          },
          token: `jwt_${userRole}_token_${Date.now()}`
        });
      } else {
        // If query returned 0 rows, verify if the email exists in Oracle USERS
        const checkUser = await executeOracle(
          `SELECT email FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(:email))`,
          { email }
        );
        if (checkUser.data && checkUser.data.length > 0) {
          return res.json({ success: false, message: "Incorrect password." });
        }
      }
    }
  } catch (e) {
    console.warn("[Login] Oracle DB authentication error:", e.message);
    return res.status(500).json({ success: false, message: "Database connection error during login." });
  }

  return res.json({
    success: false,
    message: "Invalid email or password."
  });
});

function parseDateToOracle(dobStr) {
  if (!dobStr) return "SYSDATE";
  const str = String(dobStr).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `TO_DATE('${year}-${month}-${day}', 'YYYY-MM-DD')`;
  }
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `TO_DATE('${year}-${month}-${day}', 'YYYY-MM-DD')`;
  }
  return "SYSDATE";
}

router.post("/auth/register", async (req, res) => {
  const {
    email, password, firstName, lastName, phone, altPhone, dob,
    division, district, city, area, road, house, role, certificateName, imageBase64
  } = req.body;

  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({ success: false, message: "Email and password are required for registration." });
  }

  // Default participant ID calculation
  const nextNum = mockStore.participants.length + 1;
  let newPid = "P" + String(nextNum).padStart(3, "0");

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      // 1. Check if user already exists in Oracle USERS
      const existing = await executeOracle(
        `SELECT email FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(:email))`,
        { email: cleanEmail }
      );
      if (existing.data && existing.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: "An account with this email address already exists. Please log in or use another email."
        });
      }

      // 2. Fetch admin ID for foreign key constraint (default to A001)
      const adminCheck = await executeOracle(`SELECT admin_id FROM admin WHERE ROWNUM = 1`);
      const adminId = (adminCheck.data && adminCheck.data[0] && adminCheck.data[0].ADMIN_ID) ? adminCheck.data[0].ADMIN_ID : 'A001';

      // 3. Generate Next Participant ID using Oracle Sequence seq_participant_id (with safe fallback)
      try {
        const seqRes = await executeOracle(`SELECT 'P' || LPAD(seq_participant_id.NEXTVAL, 3, '0') AS next_id FROM dual`);
        if (seqRes.data && seqRes.data[0] && seqRes.data[0].NEXT_ID) {
          newPid = seqRes.data[0].NEXT_ID;
        } else {
          const maxRes = await executeOracle(`SELECT NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(participant_id, '[0-9]+'))), 0) + 1 AS next_id FROM participant`);
          newPid = "P" + String(maxRes.data[0].NEXT_ID).padStart(3, "0");
        }
      } catch (seqErr) {
        const maxRes = await executeOracle(`SELECT NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(participant_id, '[0-9]+'))), 0) + 1 AS next_id FROM participant`);
        newPid = "P" + String(maxRes.data[0].NEXT_ID).padStart(3, "0");
      }

      // 4. Insert into Oracle USERS table
      await executeOracle(
        `INSERT INTO users (email, password) VALUES (:email, :password)`,
        { email: cleanEmail, password: cleanPassword }
      );

      // 5. Insert into Oracle PARTICIPANT table
      const dobSql = parseDateToOracle(dob);
      await executeOracle(
        `INSERT INTO participant (participant_id, email, admin_id, first_name, last_name, credit, status, average_rating, address_house, address_road, address_area, address_city, address_district, address_division, date_of_birth)
         VALUES (:pid, :email, :adminId, :fn, :ln, 150.00, 'Newbie', 0.00, :house, :road, :area, :city, :district, :division, ${dobSql})`,
        {
          pid: newPid,
          email: cleanEmail,
          adminId: adminId,
          fn: (firstName || "New").trim(),
          ln: (lastName || "User").trim(),
          house: (house || "1").trim(),
          road: (road || "1").trim(),
          area: (area || "Area").trim(),
          city: (city || "City").trim(),
          district: (district || "District").trim(),
          division: (division || "Division").trim()
        }
      );

      // 6. Insert into Oracle PARTICIPANT_PHONE table
      if (phone && String(phone).trim()) {
        try {
          await executeOracle(
            `INSERT INTO participant_phone (participant_id, phone_number) VALUES (:pid, :phone)`,
            { pid: newPid, phone: String(phone).trim() }
          );
        } catch (pe) {}
      }
      if (altPhone && String(altPhone).trim()) {
        try {
          await executeOracle(
            `INSERT INTO participant_phone (participant_id, phone_number) VALUES (:pid, :altPhone)`,
            { pid: newPid, altPhone: String(altPhone).trim() }
          );
        } catch (e) {}
      }

      // 7. Insert certificate if uploaded during registration
      if ((certificateName && String(certificateName).trim()) || (imageBase64 && String(imageBase64).trim())) {
        try {
          const maxCert = await executeOracle(`SELECT NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(certificate_id, '[0-9]+'))), 0) + 1 AS next_id FROM certificate`);
          const certNum = (maxCert.data && maxCert.data[0]) ? Number(maxCert.data[0].NEXT_ID) : 1;
          const newCertId = "CERT" + String(certNum).padStart(3, "0");
          const rawName = String(certificateName || "Skill Certificate").trim();
          let certAssetStr = `/uploads/certificates/default_${newPid}.png`;

          if (imageBase64 && imageBase64.includes("base64,")) {
            try {
              const match = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
              const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'png';
              const base64Data = match ? match[2] : imageBase64;
              const cleanTitle = rawName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
              const fileName = `cert_${newPid}_${cleanTitle}_${Date.now()}.${ext}`;
              const filePath = path.join(__dirname, "..", "uploads", "certificates", fileName);
              fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
              certAssetStr = `/uploads/certificates/${fileName}`;
            } catch (err) {
              console.warn("[Register Save Image] Error:", err.message);
            }
          } else if (certificateName) {
            certAssetStr = rawName;
          }

          const cleanType = cleanCertificateSkillTitle(rawName, "General Skill Certificate");

          await executeOracle(
            `INSERT INTO certificate (certificate_id, certificate_type, certificate_asset, admin_id, participant_id, issue_date)
             VALUES (:cid, :ctype, :asset, :adminId, :pid, SYSDATE)`,
            { cid: newCertId, ctype: cleanType, asset: certAssetStr, adminId, pid: newPid }
          );
          await executeOracle(
            `INSERT INTO verify (admin_id, certificate_id, verified_at, verification_status)
             VALUES (:adminId, :cid, SYSDATE, 'Pending')`,
            { adminId, cid: newCertId }
          );
        } catch (certErr) {
          console.warn("[Register Cert Upload Note]:", certErr.message);
        }
      }

      // 8. Insert record into Oracle MONITOR table (Pending status)
      try {
        await executeOracle(
          `INSERT INTO monitor (participant_id, admin_id, monitor_status, monitored_at)
           VALUES (:pid, :adminId, 'Pending', SYSDATE)`,
          { pid: newPid, adminId }
        );
      } catch (mErr) {
        console.warn("[Register Monitor Table note]:", mErr.message);
      }

      // 9. Insert Welcome notification
      try {
        await executeOracle(
          `INSERT INTO notification (notification_id, message, type, generated_at)
           VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Welcome', SYSDATE)`,
          { msg: `[Participant: ${newPid}] Welcome to SkillChain! Your account has been registered in the database with 150 starting Credits.` }
        );
      } catch (ne) {}
    }
  } catch (err) {
    console.warn("[Registration Oracle Note, falling back to mock]:", err.message);
  }

  // Keep in-memory mock store synchronized
  if (!mockStore.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    mockStore.users.push({ email: cleanEmail, password: cleanPassword, role: role || "participant" });
  }

  const existingMockIdx = mockStore.participants.findIndex(p => p.email.toLowerCase() === cleanEmail || p.participant_id === newPid);
  const newPart = {
    participant_id: newPid,
    id: newPid,
    email: cleanEmail,
    first_name: firstName || "New",
    last_name: lastName || "User",
    credit: 150.0,
    status: "Pending",
    average_rating: 0.0,
    address_house: house || "1",
    address_road: road || "1",
    area: area || "Area",
    address_area: area || "Area",
    city: city || "City",
    address_city: city || "City",
    district: district || "District",
    address_district: district || "District",
    division: division || "Division",
    address_division: division || "Division",
    phone: phone || "+8801700000000",
    alt_phone: altPhone || ""
  };

  if (existingMockIdx >= 0) {
    mockStore.participants[existingMockIdx] = newPart;
  } else {
    mockStore.participants.push(newPart);
  }

  return res.json({
    success: true,
    message: "Account registered successfully with status Pending!",
    participantId: newPid
  });
});

// ==========================================
// ==========================================
// COURSES & APPROVALS
// ==========================================
router.get("/courses", async (req, res) => {
  const reqStatus = (req.query.status || "").toLowerCase();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      if (reqStatus === "pending") {
        // Fetch all pending course proposals from Oracle CONTENT table
        const pendingRes = await executeOracle(
          `SELECT ct.content_id as id, ct.content_id as course_id, ct.content_title as title, ct.content_title as course_title,
                  ct.content_url, NVL(ct.content_duration, 45) as duration, ct.participant_id, 'Pending' as status,
                  p.first_name || ' ' || p.last_name as instructor_name, p.email as instructor_email
           FROM content ct
           LEFT JOIN participant p ON ct.participant_id = p.participant_id
           WHERE ct.content_status = 'Pending'
           ORDER BY ct.content_id DESC`
        );

        const pendingList = (pendingRes.data || []).map(c => {
          let level = "Intermediate";
          let lessons = [
            { title: `${c.TITLE || c.COURSE_TITLE} - Introduction`, url: "https://skillchain.com/lessons/intro", duration: 45 }
          ];

          if (c.CONTENT_URL && typeof c.CONTENT_URL === 'string' && c.CONTENT_URL.startsWith("{")) {
            try {
              const parsed = JSON.parse(c.CONTENT_URL);
              if (parsed.level) level = parsed.level;
              if (Array.isArray(parsed.lessons) && parsed.lessons.length > 0) {
                lessons = parsed.lessons;
              }
            } catch (e) {}
          }

          return {
            id: c.ID || c.COURSE_ID,
            course_id: c.COURSE_ID || c.ID,
            title: c.TITLE || c.COURSE_TITLE,
            course_title: c.COURSE_TITLE || c.TITLE,
            level: level,
            course_level: level,
            charge: 500,
            price: 500,
            status: "Pending",
            participant_id: c.PARTICIPANT_ID,
            instructorName: (c.INSTRUCTOR_NAME && c.INSTRUCTOR_NAME.trim()) ? c.INSTRUCTOR_NAME.trim() : "Contributor",
            instructorEmail: c.INSTRUCTOR_EMAIL || "contributor@gmail.com",
            totalClasses: lessons.length,
            total_classes: lessons.length,
            lessons: lessons
          };
        });

        return res.json({ success: true, count: pendingList.length, courses: pendingList });
      }

      // Default: Return all Approved courses in Oracle DB COURSE table
      const result = await executeOracle(
        `SELECT c.course_id, c.course_title, c.course_level, c.price, c.participant_id, c.skill_id, 'Approved' AS status,
                s.skill_name, p.first_name || ' ' || p.last_name as instructor_name, p.email as instructor_email,
                NVL(pr.total_lesson, 10) as total_classes
         FROM course c
         LEFT JOIN skill s ON c.skill_id = s.skill_id
         LEFT JOIN participant p ON c.participant_id = p.participant_id
         LEFT JOIN progress pr ON c.progress_id = pr.progress_id
         ORDER BY c.course_id DESC`
      );
      if (result.data && result.data.length > 0) {
        const courses = result.data.map(c => ({
          ...c,
          id: c.COURSE_ID,
          course_id: c.COURSE_ID,
          title: c.COURSE_TITLE,
          course_title: c.COURSE_TITLE,
          level: c.COURSE_LEVEL || "Intermediate",
          course_level: c.COURSE_LEVEL || "Intermediate",
          charge: c.PRICE,
          price: c.PRICE,
          status: "Approved",
          skillName: c.SKILL_NAME || "General",
          skill_name: c.SKILL_NAME || "General",
          instructorName: (c.INSTRUCTOR_NAME && c.INSTRUCTOR_NAME.trim()) ? c.INSTRUCTOR_NAME.trim() : "Instructor",
          instructorEmail: c.INSTRUCTOR_EMAIL || "instructor@gmail.com",
          totalClasses: c.TOTAL_CLASSES || 10,
          total_classes: c.TOTAL_CLASSES || 10
        }));
        return res.json({ success: true, count: courses.length, courses });
      }
    }
  } catch (e) {
    console.warn("[Courses] Fallback to mock:", e.message);
  }

  // Fallback mode for mock store
  if (reqStatus === "pending") {
    const rawPending = [
      ...((mockStore.pendingCourses || []).filter(c => (c.status === "Pending" || !c.status) && c.status !== "Approved"))
    ];
    // Deduplicate by course_id/id
    const seen = new Set();
    const pendingList = [];
    for (const c of rawPending) {
      const cid = c.course_id || c.id;
      if (cid && !seen.has(cid)) {
        seen.add(cid);
        const skill = mockStore.skills.find(s => s.skill_id === c.skill_id);
        const instructor = mockStore.participants.find(p => p.participant_id === c.participant_id || p.email === c.participant_id || p.email === c.instructorEmail);
        pendingList.push({
          ...c,
          id: cid,
          course_id: cid,
          title: c.title || c.course_title,
          course_title: c.course_title || c.title,
          level: c.level || c.course_level || "Intermediate",
          course_level: c.course_level || c.level || "Intermediate",
          totalClasses: c.totalClasses || c.total_classes || (c.lessons ? c.lessons.length : 10),
          total_classes: c.total_classes || c.totalClasses || (c.lessons ? c.lessons.length : 10),
          charge: c.charge || c.price || 500,
          price: c.price || c.charge || 500,
          status: "Pending",
          skillName: skill ? skill.skill_name : (c.skillName || "General"),
          instructorName: c.instructorName || (instructor ? `${instructor.first_name} ${instructor.last_name}` : "Instructor"),
          instructorEmail: instructor ? instructor.email : (c.instructorEmail || "contributor@gmail.com"),
          lessons: c.lessons || [{ title: `${c.title || c.course_title} - Introduction`, url: "https://skillchain.com/lessons/intro", duration: 45 }]
        });
      }
    }
    return res.json({ success: true, count: pendingList.length, courses: pendingList });
  }

  // Default: Return strictly Approved courses for SkillHub catalog
  const approvedCourses = mockStore.courses
    .filter(c => c.status === "Approved" || c.status === "Active" || (!c.status && c.status !== "Pending" && c.status !== "Rejected"))
    .map(course => {
      const skill = mockStore.skills.find(s => s.skill_id === course.skill_id);
      const instructor = mockStore.participants.find(p => p.participant_id === course.participant_id);
      const cid = course.course_id || course.id;
      return {
        ...course,
        id: cid,
        course_id: cid,
        title: course.title || course.course_title,
        course_title: course.course_title || course.title,
        level: course.level || course.course_level || "Intermediate",
        course_level: course.course_level || course.level || "Intermediate",
        totalClasses: course.totalClasses || course.total_classes || 10,
        total_classes: course.total_classes || course.totalClasses || 10,
        charge: course.charge || course.price || 500,
        price: course.price || course.charge || 500,
        status: "Approved",
        skillName: skill ? skill.skill_name : (course.skillName || "General"),
        instructorName: instructor ? `${instructor.first_name} ${instructor.last_name}` : (course.instructorName || "Instructor"),
        instructorEmail: instructor ? instructor.email : (course.instructorEmail || "instructor@gmail.com")
      };
    });
  res.json({ success: true, count: approvedCourses.length, courses: approvedCourses });
});

const COURSE_STOP_WORDS = new Set([
  'course', 'courses', 'curriculum', 'tutorial', 'tutorials', 'training', 
  'mastery', 'bootcamp', 'introduction', 'intro', 'to', 'for', 'basics', 
  'basic', 'advanced', 'beginner', 'intermediate', 'complete', 'comprehensive', 
  'the', 'a', 'an', 'in', 'and', 'with', 'from', 'scratch', 'part', 'guide', 
  'learn', 'learning', '1', '2', '3', '4', '5', 'level', 'edition', 'fundamentals',
  'essential', 'essentials', 'overview', 'deep', 'dive', 'programming', 'development'
]);

function extractSubjectTokens(text) {
  const clean = String(text || '').toLowerCase().replace(/[^a-z0-9+#]/g, ' ').trim();
  return clean.split(/\s+/).filter(Boolean).filter(t => !COURSE_STOP_WORDS.has(t));
}

function matchesExactSubject(subjectA, subjectB) {
  const normA = String(subjectA || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normB = String(subjectB || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normA && normB && normA === normB) return true;

  const tokA = extractSubjectTokens(subjectA);
  const tokB = extractSubjectTokens(subjectB);
  if (tokA.length > 0 && tokB.length > 0) {
    return tokA.some(tA => tokB.some(tB => tA === tB));
  }
  return false;
}

router.post("/courses", async (req, res) => {
  const { title, description, level, skillId, participantId, requiredCredits, lessons, exam, examUrl, examDuration, hasExam, status, submitDirectly } = req.body;
  const rawPid = (participantId || "P001").trim();
  const courseTitle = (title || "New Skill Course").trim();
  const courseLevel = level || "Intermediate";
  const price = requiredCredits || 500;
  const isDraft = status === "Draft" || (!submitDirectly && status !== "Pending" && status !== "Peer_Review");
  const courseLessons = (lessons && Array.isArray(lessons) && lessons.length > 0)
    ? lessons
    : [{ title: `${courseTitle} - Introduction`, url: "https://skillchain.com/lessons/intro", duration: 45 }];

  const examInfo = (exam && typeof exam === 'object')
    ? exam
    : (examUrl ? { url: examUrl.trim(), duration: Number(examDuration) || 30 } : (hasExam ? { url: "", duration: 30 } : null));

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) {
          actualPid = pCheck.data[0].PARTICIPANT_ID;
        }
      }

      // A contributor is Certified (Non-Newbie / Expert) if participant has status 'expert'/'approved' OR has an admin-approved certificate
      let isExpert = false;
      const pStatusRes = await executeOracle(
        `SELECT status FROM participant WHERE LOWER(TRIM(participant_id)) = LOWER(TRIM(:pid)) OR LOWER(TRIM(email)) = LOWER(TRIM(:pid))`,
        { pid: actualPid }
      );
      const participantStatus = (pStatusRes.data && pStatusRes.data[0] ? (pStatusRes.data[0].STATUS || '') : '').toLowerCase().trim();

      if (participantStatus === 'expert' || participantStatus === 'approved') {
        isExpert = true;
      } else {
        const certCheck = await executeOracle(
          `SELECT COUNT(*) AS cnt FROM certificate c
           JOIN verify v ON c.certificate_id = v.certificate_id
           WHERE LOWER(TRIM(c.participant_id)) = LOWER(TRIM(:pid))
             AND UPPER(TRIM(v.verification_status)) IN ('ACCEPTED', 'APPROVED')`,
          { pid: actualPid }
        );
        if (certCheck.data && certCheck.data[0] && Number(certCheck.data[0].CNT) > 0) {
          isExpert = true;
        }
      }
      const isNewbie = !isExpert;
      const isCertifiedOrInstructor = isExpert;

      // Newbies go to Peer_Review; Experts (non-newbies) go to Admin (Pending) only
      const initialStatus = isDraft
        ? "Draft"
        : (isNewbie ? "Peer_Review" : "Pending");

      // Safe numeric ID generation from existing content rows
      const allCnt = await executeOracle("SELECT content_id FROM content");
      let maxCnt = (allCnt.data || []).reduce((max, r) => {
        const n = parseInt((r.CONTENT_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);

      maxCnt += 1;
      const newCntId = "CT" + String(maxCnt).padStart(3, "0");

      // Serialize metadata (course level + full lesson list + exam details) into content_url
      const metaUrl = JSON.stringify({
        level: courseLevel,
        lessons: courseLessons,
        exam: examInfo
      });

      const totalDur = courseLessons.reduce((sum, l) => sum + (Number(l.duration) || 45), 0);

      // Insert master course proposal into Oracle CONTENT table
      await executeOracle(
        `INSERT INTO content (content_id, participant_id, content_url, content_title, content_status, content_duration)
         VALUES (:cntid, :pid, :url, :title, :status, :dur)`,
        {
          cntid: newCntId,
          pid: actualPid,
          url: metaUrl,
          title: courseTitle,
          status: initialStatus,
          dur: Number(totalDur) || 45
        }
      );

      let authorInstructorName = req.body.instructorName;
      if (!authorInstructorName) {
        const pQuery = await executeOracle(
          `SELECT first_name, last_name FROM participant WHERE LOWER(TRIM(participant_id)) = LOWER(TRIM(:pid)) OR LOWER(TRIM(email)) = LOWER(TRIM(:pid))`,
          { pid: actualPid }
        );
        if (pQuery.data && pQuery.data[0]) {
          authorInstructorName = `${pQuery.data[0].FIRST_NAME || ''} ${pQuery.data[0].LAST_NAME || ''}`.trim();
        }
      }
      if (!authorInstructorName) authorInstructorName = "Newbie Contributor";

      if (!isDraft) {
        // Record individual lesson rows when submitted for review
        for (let i = 0; i < courseLessons.length; i++) {
          maxCnt += 1;
          const l = courseLessons[i];
          const lessonCntId = "CT" + String(maxCnt).padStart(3, "0");
          try {
            await executeOracle(
              `INSERT INTO content (content_id, participant_id, content_url, content_title, content_status, content_duration)
               VALUES (:cntid, :pid, :url, :title, 'Pending_Lesson', :dur)`,
              {
                cntid: lessonCntId,
                pid: actualPid,
                url: l.url || `https://skillchain.com/lessons/${lessonCntId.toLowerCase()}`,
                title: l.title || `${courseTitle} - Part ${i + 1}`,
                dur: Number(l.duration) || 45
              }
            );
          } catch (err) {}
        }

        // Insert notification for contributor
        const notifMsg = isCertifiedOrInstructor
          ? `[Participant: ${actualPid}] Your course proposal "${courseTitle}" has been submitted directly to Admin for review and approval.`
          : `[Participant: ${actualPid}] Your course proposal "${courseTitle}" has been submitted to Peer Review for qualified instructors to review.`;

        await executeOracle(
          `INSERT INTO notification (notification_id, message, type, generated_at)
           VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Content', SYSDATE)`,
          { msg: notifMsg }
        );
      }

      const newCourseObj = {
        id: newCntId,
        course_id: newCntId,
        content_id: newCntId,
        title: courseTitle,
        course_title: courseTitle,
        level: courseLevel,
        course_level: courseLevel,
        price: price,
        charge: price,
        participant_id: actualPid,
        instructorName: authorInstructorName,
        instructor: authorInstructorName,
        status: initialStatus,
        isDraft: isDraft,
        isCertifiedOrInstructor,
        total_classes: courseLessons.length,
        totalClasses: courseLessons.length,
        totalLessons: courseLessons.length,
        lessons: courseLessons,
        exam: examInfo
      };

      const outcomeMessage = isDraft
        ? `Draft course "${courseTitle}" created!`
        : (isCertifiedOrInstructor
            ? `Course "${courseTitle}" submitted directly to Admin for review and approval!`
            : `Course "${courseTitle}" submitted to Peer Review for qualified instructors!`);

      return res.json({
        success: true,
        message: outcomeMessage,
        courseId: newCntId,
        course: newCourseObj,
        status: initialStatus
      });
    }
  } catch (err) {
    console.error("[Create Course Error]:", err);
    return res.status(500).json({ error: err.message });
  }

  return res.json({
    success: true,
    message: isDraft ? `Draft course "${courseTitle}" saved!` : `Course "${courseTitle}" submitted!`,
    courseId: "CT_TEMP",
    status: isDraft ? "Draft" : "Pending"
  });
});

router.post("/courses/submit-for-review", async (req, res) => {
  const { courseId, course, title, level, participantId, instructorName, lessons, exam } = req.body;
  const targetCourseId = (courseId || course?.id || course?.course_id || "").trim();
  const rawPid = (participantId || course?.participant_id || "P001").trim();
  const courseTitle = (title || course?.title || course?.course_title || "Course Proposal").trim();
  const courseLevel = level || course?.level || course?.course_level || "Intermediate";
  const courseLessons = (lessons && Array.isArray(lessons) && lessons.length > 0)
    ? lessons
    : (course?.lessons && Array.isArray(course.lessons) ? course.lessons : []);
  const examInfo = exam || course?.exam || null;

  let authorName = instructorName || course?.instructorName;
  if (!authorName) {
    const p = (mockStore.participants || []).find(pt => (pt.participant_id || '').toLowerCase() === rawPid.toLowerCase() || (pt.email || '').toLowerCase() === rawPid.toLowerCase());
    if (p) authorName = `${p.first_name || p.firstName || ''} ${p.last_name || p.lastName || ''}`.trim();
  }
  if (!authorName) authorName = "Newbie Contributor";

  if (!courseLessons || courseLessons.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot submit a course for review without any lessons. Please add at least 1 lesson before submitting."
    });
  }

  let isCertified = false;
  let targetStatus = "Peer_Review";

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) {
          actualPid = pCheck.data[0].PARTICIPANT_ID;
        }
      }

      const metaUrl = JSON.stringify({
        level: courseLevel,
        lessons: courseLessons,
        exam: examInfo
      });

      const totalDur = courseLessons.reduce((sum, l) => sum + (Number(l.duration) || 45), 0);

      // Check if participant is a Certified Contributor (has verified certificate OR status 'expert'/'approved')
      let isExpert = false;
      const pStatusRes = await executeOracle(
        `SELECT status FROM participant WHERE LOWER(TRIM(participant_id)) = LOWER(TRIM(:pid)) OR LOWER(TRIM(email)) = LOWER(TRIM(:pid))`,
        { pid: actualPid }
      );
      const participantStatus = (pStatusRes.data && pStatusRes.data[0] ? (pStatusRes.data[0].STATUS || '') : '').toLowerCase().trim();

      if (participantStatus === 'expert' || participantStatus === 'approved') {
        isExpert = true;
      } else {
        const certCheck = await executeOracle(
          `SELECT COUNT(*) AS cnt FROM certificate c
           JOIN verify v ON c.certificate_id = v.certificate_id
           WHERE LOWER(TRIM(c.participant_id)) = LOWER(TRIM(:pid))
             AND UPPER(TRIM(v.verification_status)) IN ('ACCEPTED', 'APPROVED')`,
          { pid: actualPid }
        );
        if (certCheck.data && certCheck.data[0] && Number(certCheck.data[0].CNT) > 0) {
          isExpert = true;
        }
      }
      const isNewbie = !isExpert;

      // An Expert goes to Admin ONLY ('Pending'). A Newbie goes to Peer Review ('Peer_Review').
      targetStatus = isNewbie ? "Peer_Review" : "Pending";

      // Check if existing content record in Oracle
      let existing = null;
      if (targetCourseId) {
        existing = await executeOracle(
          `SELECT content_id FROM content WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid))`,
          { cid: targetCourseId }
        );
      }
      if (!existing || !existing.data || existing.data.length === 0) {
        existing = await executeOracle(
          `SELECT content_id FROM content WHERE UPPER(TRIM(content_title)) = UPPER(TRIM(:title)) AND LOWER(TRIM(participant_id)) = LOWER(TRIM(:pid))`,
          { title: courseTitle, pid: actualPid }
        );
      }

      if (existing && existing.data && existing.data.length > 0) {
        const matchedCntId = existing.data[0].CONTENT_ID;
        await executeOracle(
          `UPDATE content SET content_status = :status, content_url = :url, content_duration = :dur
           WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid))`,
          { status: targetStatus, url: metaUrl, dur: Number(totalDur) || 45, cid: matchedCntId }
        );
      } else {
        const allCnt = await executeOracle("SELECT content_id FROM content");
        let maxCnt = (allCnt.data || []).reduce((max, r) => {
          const n = parseInt((r.CONTENT_ID || "").replace(/\D/g, ""), 10);
          return !isNaN(n) && n > max ? n : max;
        }, 0);
        const newCntId = "CT" + String(maxCnt + 1).padStart(3, "0");

        await executeOracle(
          `INSERT INTO content (content_id, participant_id, content_url, content_title, content_status, content_duration)
           VALUES (:cntid, :pid, :url, :title, :status, :dur)`,
          {
            cntid: newCntId,
            pid: actualPid,
            url: metaUrl,
            title: courseTitle,
            status: targetStatus,
            dur: Number(totalDur) || 45
          }
        );
      }

      const notifMsg = isCertified
        ? `[Participant: ${actualPid}] Course "${courseTitle}" with ${courseLessons.length} lessons has been submitted directly to Admin for approval.`
        : `[Participant: ${actualPid}] Course "${courseTitle}" with ${courseLessons.length} lessons has been submitted to Peer Review for qualified instructors.`;

      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Content', SYSDATE)`,
        { msg: notifMsg }
      );
    }
  } catch (err) {
    console.warn("[Submit Review Oracle Note]:", err.message);
  }

  // Update in-memory mock store
  if (!mockStore.pendingCourses) mockStore.pendingCourses = [];
  if (!mockStore.peerReviewCourses) mockStore.peerReviewCourses = [];

  let skillCategory = 'Web Development';
  const lTitle = courseTitle.toLowerCase();
  if (lTitle.includes('c++') || lTitle.includes('cpp')) skillCategory = 'C++ Programming';
  else if (lTitle.includes('python')) skillCategory = 'Python Programming';
  else if (lTitle.includes('oracle') || lTitle.includes('sql') || lTitle.includes('database')) skillCategory = 'Database Management';
  else if (lTitle.includes('machine learning') || lTitle.includes('deep learning')) skillCategory = 'Machine Learning';

  const pendingObj = {
    id: targetCourseId || `C00${mockStore.pendingCourses.length + 10}`,
    course_id: targetCourseId || `C00${mockStore.pendingCourses.length + 10}`,
    courseId: targetCourseId || `C00${mockStore.pendingCourses.length + 10}`,
    title: courseTitle,
    course_title: courseTitle,
    level: courseLevel,
    course_level: courseLevel,
    charge: 500,
    price: 500,
    participant_id: rawPid,
    instructorName: authorName,
    instructor: authorName,
    status: targetStatus,
    skillName: skillCategory,
    totalClasses: courseLessons.length || 1,
    totalLessons: courseLessons.length || 1,
    lessons: courseLessons,
    exam: examInfo
  };

  const existingIdx = mockStore.pendingCourses.findIndex(c => (c.id || c.course_id) === targetCourseId);
  if (existingIdx >= 0) {
    mockStore.pendingCourses[existingIdx] = pendingObj;
  } else {
    mockStore.pendingCourses.push(pendingObj);
  }

  const existingPeerIdx = mockStore.peerReviewCourses.findIndex(c => (c.id || c.course_id || c.courseId) === targetCourseId);
  if (existingPeerIdx >= 0) {
    mockStore.peerReviewCourses[existingPeerIdx] = pendingObj;
  } else {
    mockStore.peerReviewCourses.unshift(pendingObj);
  }

  return res.json({
    success: true,
    message: isCertified
      ? `Course "${courseTitle}" submitted directly to Admin for approval!`
      : `Course "${courseTitle}" submitted to Peer Review for qualified instructors!`,
    course: pendingObj,
    status: targetStatus
  });
});

// ==========================================
// PEER REVIEW SYSTEM API ENDPOINTS
// ==========================================

// 1. Get Peer Review Queue (Courses waiting for peer reviews)
router.get("/peer-review/queue", async (req, res) => {
  const currentPid = (req.query.participantId || "").trim().toLowerCase();

  try {
    const dbStatus = getDatabaseStatus();
    let queue = [];

    if (dbStatus.connected) {
      let actualRevPid = currentPid;
      if (currentPid.includes("@") || !currentPid.startsWith("p")) {
        const pRev = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: currentPid }
        );
        if (pRev.data && pRev.data[0]) {
          actualRevPid = pRev.data[0].PARTICIPANT_ID;
        }
      }

      // 1. A Newbie can NEVER see or review anything in peer review! Only approved instructors / experts!
      if (actualRevPid) {
        const pRevStatus = await executeOracle(
          `SELECT status FROM participant WHERE LOWER(TRIM(participant_id)) = LOWER(TRIM(:pid)) OR LOWER(TRIM(email)) = LOWER(TRIM(:pid))`,
          { pid: actualRevPid }
        );
        const revStatus = (pRevStatus.data && pRevStatus.data[0] ? (pRevStatus.data[0].STATUS || '') : '').toLowerCase().trim();
        if (revStatus !== 'expert' && revStatus !== 'approved') {
          return res.json({ success: true, count: 0, queue: [] });
        }
      }

      // 2. Fetch reviewer's published courses from COURSE table (published course instructors only)
      let reviewerTaughtCourses = [];
      if (actualRevPid) {
        const taughtRes = await executeOracle(
          `SELECT course_title FROM course WHERE LOWER(TRIM(participant_id)) = LOWER(TRIM(:pid))`,
          { pid: actualRevPid }
        );
        if (taughtRes.data) {
          reviewerTaughtCourses = taughtRes.data.map(r => r.COURSE_TITLE);
        }
      }

      // If the participant is not an instructor of any published course, they cannot review anything
      if (reviewerTaughtCourses.length === 0) {
        return res.json({ success: true, count: 0, queue: [] });
      }

      // 3. Only fetch courses sent for approval by a NEWBIE waiting for Peer Review
      const cRes = await executeOracle(
        `SELECT c.content_id, c.participant_id, c.content_title, c.content_status, c.content_url,
                p.first_name, p.last_name, p.email, p.status AS author_status,
                p.first_name || ' ' || p.last_name as instructor_name
         FROM content c
         JOIN participant p ON c.participant_id = p.participant_id
         WHERE UPPER(TRIM(c.content_status)) IN ('PEER_REVIEW', 'PENDING_REVIEW')
           AND LOWER(TRIM(p.status)) NOT IN ('expert', 'approved')
         ORDER BY c.content_id DESC`
      );

        if (cRes.data && cRes.data.length > 0) {
          queue = cRes.data
            .map(row => {
              let meta = {};
              try {
                meta = JSON.parse(row.CONTENT_URL || "{}");
              } catch (e) {}

              const lessons = Array.isArray(meta.lessons) ? meta.lessons : [
                { id: "PL01", title: `${row.CONTENT_TITLE} - Module 1`, url: "https://skillchain.com/lessons/intro", duration: 45, status: "PENDING" }
              ];

              const reviewedCount = lessons.filter(l => l.status === "ACCEPT" || l.status === "REJECT").length;
              const acceptedCount = lessons.filter(l => l.status === "ACCEPT").length;
              const totalCount = Math.max(1, lessons.length);
              const currentApprovalPct = Math.round((acceptedCount / totalCount) * 100);

              let authorName = (row.INSTRUCTOR_NAME && row.INSTRUCTOR_NAME.trim()) ? row.INSTRUCTOR_NAME.trim() : (row.EMAIL || "Newbie Contributor");

              return {
                id: row.CONTENT_ID,
                courseId: row.CONTENT_ID,
                title: row.CONTENT_TITLE,
                course_title: row.CONTENT_TITLE,
                level: meta.level || "Intermediate",
                course_level: meta.level || "Intermediate",
                instructor: authorName,
                instructorName: authorName,
                instructorEmail: row.EMAIL || "",
                participant_id: row.PARTICIPANT_ID,
                skillName: row.CONTENT_TITLE || "General",
                status: "Peer_Review",
                completedReviews: reviewedCount,
                totalLessons: totalCount,
                currentApprovalPct,
                lessons,
                exam: meta.exam || null
              };
            })
            .filter(c => {
              // 1. Reviewer cannot review their own course
              const authorPid = (c.participant_id || "").toLowerCase().trim();
              const authorEmail = (c.instructorEmail || "").toLowerCase().trim();
              const revPid = (actualRevPid || "").toLowerCase().trim();
              if (revPid && (authorPid === revPid || authorEmail === revPid)) {
                return false;
              }

              // 2. Reviewer must teach a course matching this exact subject
              return reviewerTaughtCourses.some(taughtTitle => matchesExactSubject(c.title, taughtTitle));
            })
            .map(c => ({
              id: c.id,
              courseId: c.courseId,
              title: c.title,
              level: c.level,
              instructor: c.instructor,
              instructorName: c.instructorName,
              instructorEmail: c.instructorEmail,
              participant_id: c.participant_id,
              skillName: c.skillName,
              status: "Peer_Review",
              completedReviews: c.completedReviews,
              totalLessons: c.totalLessons,
              currentApprovalPct: c.currentApprovalPct,
              lessons: c.lessons
            }));
        }
      }

    return res.json({ success: true, count: queue.length, queue });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Get Single Peer Review Course with full Lessons & Freeze metadata
router.get("/peer-review/course/:courseId", async (req, res) => {
  const cid = (req.params.courseId || "").trim();

  try {
    const dbStatus = getDatabaseStatus();
    let matched = null;

    if (dbStatus.connected) {
      const cRes = await executeOracle(
        `SELECT c.content_id, c.participant_id, c.content_title, c.content_status, c.content_url,
                p.first_name, p.last_name, p.email,
                p.first_name || ' ' || p.last_name as instructor_name
         FROM content c
         LEFT JOIN participant p ON c.participant_id = p.participant_id
         WHERE UPPER(TRIM(c.content_id)) = UPPER(TRIM(:cid)) OR UPPER(TRIM(c.content_title)) = UPPER(TRIM(:cid))`,
        { cid }
      );

      if (cRes.data && cRes.data.length > 0) {
        const row = cRes.data[0];
        let meta = {};
        try {
          meta = JSON.parse(row.CONTENT_URL || "{}");
        } catch (e) {}

        const lessons = Array.isArray(meta.lessons) ? meta.lessons.map((l, idx) => ({
          id: l.id || l.content_id || `PL_${idx + 1}`,
          contentId: l.content_id || l.id || `PL_${idx + 1}`,
          title: l.title || `${row.CONTENT_TITLE} Module ${idx + 1}`,
          url: l.url || l.videoUrl || "https://skillchain.com/lessons/intro",
          duration: Number(l.duration) || 45,
          status: l.status || "PENDING",
          reviewedBy: l.reviewedBy || null
        })) : [
          { id: "PL01", contentId: "PL01", title: `${row.CONTENT_TITLE} - Module 1`, url: "https://skillchain.com/lessons/intro", duration: 45, status: "PENDING", reviewedBy: null }
        ];

        let authorName = (row.INSTRUCTOR_NAME && row.INSTRUCTOR_NAME.trim()) ? row.INSTRUCTOR_NAME.trim() : (row.EMAIL || "Newbie Contributor");

        matched = {
          id: row.CONTENT_ID,
          courseId: row.CONTENT_ID,
          title: row.CONTENT_TITLE,
          level: meta.level || "Intermediate",
          instructorName: authorName,
          instructor: authorName,
          instructorEmail: row.EMAIL || "",
          participant_id: row.PARTICIPANT_ID,
          skillName: row.CONTENT_TITLE || "General",
          lessons,
          exam: meta.exam || null
        };
      }
    }

    if (!matched) {
      if (!mockStore.peerReviewCourses) mockStore.peerReviewCourses = [];
      matched = mockStore.peerReviewCourses.find(c => (c.id || c.course_id || c.courseId) === cid);
    }

    if (!matched) {
      matched = (mockStore.pendingCourses || []).find(c => (c.id || c.course_id) === cid);
    }

    if (!matched) {
      matched = {
        id: cid,
        courseId: cid,
        title: "Peer Contributed Course Curriculum",
        level: "Intermediate",
        instructorName: "Newbie Contributor",
        instructor: "Newbie Contributor",
        skillName: "General",
        lessons: [
          { id: "PL01", contentId: "PL01", title: "Module 1: Fundamentals & Architecture", url: "https://www.youtube.com/watch?v=WDX1gLtCIlc", duration: 45, status: "ACCEPT", reviewedBy: "Senior Reviewer" },
          { id: "PL02", contentId: "PL02", title: "Module 2: Practical Implementation", url: "https://www.youtube.com/watch?v=wEWHq8FzdMw", duration: 50, status: "PENDING", reviewedBy: null },
          { id: "PL03", contentId: "PL03", title: "Module 3: Optimization & Deployment", url: "https://www.youtube.com/watch?v=vLnPwxZdW4Y", duration: 45, status: "PENDING", reviewedBy: null }
        ]
      };
    }

    const lessons = matched.lessons || [];
    const reviewedCount = lessons.filter(l => l.status === "ACCEPT" || l.status === "REJECT").length;
    const acceptedCount = lessons.filter(l => l.status === "ACCEPT").length;
    const totalCount = Math.max(1, lessons.length);
    const approvalPercentage = Math.round((acceptedCount / totalCount) * 100);

    return res.json({
      success: true,
      course: {
        ...matched,
        totalLessons: totalCount,
        reviewedCount,
        acceptedCount,
        approvalPercentage,
        isFullyReviewed: reviewedCount === totalCount
      },
      lessons
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Submit Peer Review Action (Accept / Reject per content, Freeze, 70% auto-publish)
router.post("/peer-review/submit-action", async (req, res) => {
  const { courseId, lessonId, reviewerId, reviewerName, actionType, feedbackComment } = req.body;
  const action = actionType === "ACCEPT" ? "ACCEPT" : "REJECT";
  const rawRevId = (reviewerId || "P001").trim();
  const revName = reviewerName || "Peer Reviewer";

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualRevPid = rawRevId;
      if (rawRevId.includes("@") || !rawRevId.startsWith("P")) {
        const pRev = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawRevId }
        );
        if (pRev.data && pRev.data[0]) {
          actualRevPid = pRev.data[0].PARTICIPANT_ID;
        }
      }

      // 1. Fetch content proposal from Oracle DB
      const cRes = await executeOracle(
        `SELECT content_id, participant_id, content_title, content_url, content_status, content_duration
         FROM content
         WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid)) OR UPPER(TRIM(content_title)) = UPPER(TRIM(:cid))`,
        { cid: courseId }
      );

      if (!cRes.data || cRes.data.length === 0) {
        return res.status(404).json({ success: false, message: "Course proposal not found in database." });
      }

      const contentRow = cRes.data[0];
      const authorPid = contentRow.PARTICIPANT_ID;
      const courseTitle = contentRow.CONTENT_TITLE;

      let meta = {};
      try {
        meta = JSON.parse(contentRow.CONTENT_URL || "{}");
      } catch (e) {}

      let lessons = Array.isArray(meta.lessons) && meta.lessons.length > 0 ? meta.lessons : [
        { id: lessonId || "PL01", contentId: lessonId || "PL01", title: `${courseTitle} - Module 1`, url: "https://skillchain.com/lessons/intro", duration: 45, status: "PENDING" }
      ];

      // Locate targeted lesson
      let lesson = lessons.find(l => (l.id || l.contentId) === lessonId);
      if (!lesson && lessons.length > 0) lesson = lessons[0];

      if (lesson) {
        if (lesson.status === "ACCEPT") {
          return res.json({
            success: true,
            message: "This lesson was already approved by a peer and is frozen.",
            isFrozen: true
          });
        }
        lesson.status = action;
        lesson.reviewedBy = revName;
        lesson.reviewerId = actualRevPid;
        lesson.reviewedAt = new Date().toISOString();
        lesson.feedback = feedbackComment || "";
      }

      meta.lessons = lessons;
      const updatedMetaStr = JSON.stringify(meta);

      // Award +20 credits to reviewer in Oracle DB
      await executeOracle(
        `UPDATE participant SET credit = NVL(credit, 0) + 20 WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:pid))`,
        { pid: actualRevPid }
      );

      // Insert notification for reviewer
      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'PeerReview', SYSDATE)`,
        { msg: `[Participant: ${actualRevPid}] You earned +20 reward credits for peer-reviewing content in "${courseTitle}".` }
      );

      const total = lessons.length;
      const reviewed = lessons.filter(l => l.status === "ACCEPT" || l.status === "REJECT").length;
      const accepted = lessons.filter(l => l.status === "ACCEPT").length;
      const scorePct = Math.round((accepted / Math.max(1, total)) * 100);
      const isComplete = reviewed === total;
      let finalStatus = "Peer_Review";
      let benchmarkPrice = 500;

      if (isComplete) {
        if (scorePct >= 70) {
          finalStatus = "Published";

          // Auto-calculate benchmark price from existing instructor courses for this subject
          const firstWord = courseTitle.split(' ')[0].toLowerCase();
          const priceRes = await executeOracle(
            `SELECT NVL(ROUND(AVG(price)), 500) AS avg_price FROM course WHERE LOWER(course_title) LIKE '%' || :subj || '%'`,
            { subj: firstWord }
          );
          if (priceRes.data && priceRes.data[0] && Number(priceRes.data[0].AVG_PRICE) > 0) {
            benchmarkPrice = Number(priceRes.data[0].AVG_PRICE);
          }

          // Generate next Course ID & Progress ID safely
          const allCourses = await executeOracle("SELECT course_id FROM course");
          const maxC = (allCourses.data || []).reduce((max, r) => {
            const n = parseInt((r.COURSE_ID || "").replace(/\D/g, ""), 10);
            return !isNaN(n) && n > max ? n : max;
          }, 0);
          const newCourseId = "C" + String(maxC + 1).padStart(3, "0");

          const allProgress = await executeOracle("SELECT progress_id FROM progress");
          const maxPr = (allProgress.data || []).reduce((max, r) => {
            const n = parseInt((r.PROGRESS_ID || "").replace(/\D/g, ""), 10);
            return !isNaN(n) && n > max ? n : max;
          }, 0);
          const newProgressId = "PR" + String(maxPr + 1).padStart(3, "0");

          // 1. Insert into PROGRESS table
          await executeOracle(
            `INSERT INTO progress (progress_id, total_lesson, completed_lesson) VALUES (:prid, :tot, 0)`,
            { prid: newProgressId, tot: total }
          );

          // 2. Insert into COURSE table (published to SkillHub with benchmark price!)
          await executeOracle(
            `INSERT INTO course (course_id, course_title, course_level, price, participant_id, skill_id, progress_id)
             VALUES (:cid, :title, :lvl, :price, :pid, 'S001', :prid)`,
            {
              cid: newCourseId,
              title: courseTitle,
              lvl: meta.level || "Intermediate",
              price: benchmarkPrice,
              pid: authorPid,
              prid: newProgressId
            }
          );

          // 3. Insert lessons into COURSE_ASSET & UPLOADS
          const allAssets = await executeOracle("SELECT asset_id FROM course_asset");
          let maxAst = (allAssets.data || []).reduce((max, r) => {
            const n = parseInt((r.ASSET_ID || "").replace(/\D/g, ""), 10);
            return !isNaN(n) && n > max ? n : max;
          }, 0);

          for (let i = 0; i < lessons.length; i++) {
            const les = lessons[i];
            maxAst += 1;
            const assetId = "AS" + String(maxAst).padStart(3, "0");
            const cntId = contentRow.CONTENT_ID || `CT00${i + 1}`;
            try {
              await executeOracle(
                `INSERT INTO course_asset (asset_id, course_id, asset_title, asset_url, content_id, asset_duration)
                 VALUES (:aid, :cid, :title, :url, :cntid, :dur)`,
                { aid: assetId, cid: newCourseId, title: les.title, url: les.url || "https://skillchain.com/lessons", cntid: cntId, dur: Number(les.duration) || 45 }
              );
            } catch (err) {}
          }

          try {
            await executeOracle(
              `INSERT INTO uploads (participant_id, course_id, content_id)
               VALUES (:pid, :cid, :cntid)`,
              { pid: authorPid, cid: newCourseId, cntid: contentRow.CONTENT_ID }
            );
          } catch (e) {}

          // 4. Insert exam if configured
          if (meta.exam && meta.exam.url) {
            try {
              const allExams = await executeOracle("SELECT exam_id FROM exam");
              let maxEx = (allExams.data || []).reduce((max, r) => {
                const n = parseInt((r.EXAM_ID || "").replace(/\D/g, ""), 10);
                return !isNaN(n) && n > max ? n : max;
              }, 0);
              const newExamId = "E" + String(maxEx + 1).padStart(3, "0");
              await executeOracle(
                `INSERT INTO exam (exam_id, course_id, exam_url, exam_duration, exam_status)
                 VALUES (:eid, :cid, :url, :dur, 'Active')`,
                { eid: newExamId, cid: newCourseId, url: meta.exam.url, dur: Number(meta.exam.duration) || 30 }
              );
            } catch (e) {}
          }

          // 5. Update CONTENT status to Published
          await executeOracle(
            `UPDATE content SET content_status = 'Published', content_url = :url WHERE content_id = :cid`,
            { url: updatedMetaStr, cid: contentRow.CONTENT_ID }
          );

          // NOTE: Contributor does NOT get +100 credits upfront. They will earn full course price when students enroll.
          await executeOracle(
            `INSERT INTO notification (notification_id, message, type, generated_at)
             VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Content', SYSDATE)`,
            { msg: `[Participant: ${authorPid}] Congratulations! Your course "${courseTitle}" achieved ${scorePct}% peer approval and is now PUBLISHED on SkillHub at ${benchmarkPrice} credits! You will earn credits each time a student enrolls.` }
          );
        } else {
          finalStatus = "Peer_Review_Rejected";
          await executeOracle(
            `UPDATE content SET content_status = 'Peer_Review_Rejected', content_url = :url WHERE content_id = :cid`,
            { url: updatedMetaStr, cid: contentRow.CONTENT_ID }
          );

          await executeOracle(
            `INSERT INTO notification (notification_id, message, type, generated_at)
             VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'warning', SYSDATE)`,
            { msg: `[Participant: ${authorPid}] Your course "${courseTitle}" received ${scorePct}% peer approval (< 70%) and has been returned for revisions.` }
          );
        }
      } else {
        // Just update content_url with the reviewed lesson
        await executeOracle(
          `UPDATE content SET content_url = :url WHERE content_id = :cid`,
          { url: updatedMetaStr, cid: contentRow.CONTENT_ID }
        );
      }

      return res.json({
        success: true,
        message: isComplete
          ? (scorePct >= 70
              ? `Course achieved ${scorePct}% peer approval rating (>= 70%) and has been PUBLISHED to SkillHub at ${benchmarkPrice || 500} credits!`
              : `Course achieved ${scorePct}% peer approval (< 70%) and has been returned to the contributor for revisions.`)
          : `Peer review recorded (${action})! +20 reward credits awarded.`,
        action,
        scorePct,
        isComplete,
        finalStatus,
        creditsAwarded: 20
      });
    }
  } catch (err) {
    console.error("[Peer Review Action Error]:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/courses/enroll", async (req, res) => {
  const { participantId, courseId } = req.body;
  const rawPid = (participantId || "P001").trim();
  const cid = (courseId || "C001").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) {
          actualPid = pCheck.data[0].PARTICIPANT_ID;
        }
      }

      // Check if participant is the author/instructor of this course
      const ownerCheck = await executeOracle(
        `SELECT participant_id FROM course WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`,
        { cid }
      );
      if (ownerCheck.data && ownerCheck.data[0]) {
        const ownerPid = (ownerCheck.data[0].PARTICIPANT_ID || "").trim();
        if (ownerPid.toUpperCase() === actualPid.toUpperCase()) {
          return res.status(400).json({
            success: false,
            message: "You are the instructor of this course and cannot enroll in or purchase your own course."
          });
        }
      }

      const plsql = `
DECLARE
  v_status VARCHAR2(50);
  v_msg    VARCHAR2(500);
BEGIN
  enroll_participant_proc('${actualPid}', '${cid}', v_status, v_msg);
  DBMS_OUTPUT.PUT_LINE('STATUS:' || v_status);
  DBMS_OUTPUT.PUT_LINE('MSG:' || v_msg);
END;
`;
      const result = await executeOracle(plsql);
      if (result.output) {
        const statusMatch = result.output.match(/STATUS:(.*)/i);
        const msgMatch = result.output.match(/MSG:(.*)/i);
        const status = statusMatch ? statusMatch[1].trim() : "SUCCESS";
        const msg = msgMatch ? msgMatch[1].trim() : result.output;

        if (status === "ALREADY_ENROLLED") {
          return res.json({ success: false, message: msg || "You are already enrolled in this course." });
        } else if (status === "INSUFFICIENT_CREDITS") {
          return res.json({ success: false, message: msg || "Insufficient credits to enroll in this course." });
        } else if (status === "NOT_FOUND") {
          return res.json({ success: false, message: msg || "Course or participant not found." });
        } else {
          // Fetch updated credit from Oracle DB
          let liveCredit = undefined;
          try {
            const pCheck = await executeOracle(`SELECT credit FROM participant WHERE participant_id = :pid`, { pid: actualPid });
            if (pCheck.data && pCheck.data[0]) {
              liveCredit = Number(pCheck.data[0].CREDIT);
              const mockP = (mockStore.participants || []).find(p => p.participant_id === actualPid || p.email?.toLowerCase() === rawPid.toLowerCase());
              if (mockP) mockP.credit = liveCredit;
            }
          } catch (e) {}

          return res.json({
            success: true,
            message: msg || "Enrolled successfully!",
            newCredit: liveCredit,
            enrolledAt: new Date().toISOString()
          });
        }
      }
    }
  } catch (e) {
    console.warn("[Enroll] Fallback to mock:", e.message);
  }

  const participant = mockStore.participants.find(p => p.participant_id === rawPid || p.email?.toLowerCase() === rawPid.toLowerCase() || p.participant_id === "P001");
  const course = mockStore.courses.find(c => c.course_id === cid || c.id === cid);

  if (!course) {
    return res.json({ success: false, message: "Course not found." });
  }

  const pid = participant ? participant.participant_id : rawPid;

  if (course.participant_id && (course.participant_id === pid || course.participant_id === rawPid)) {
    return res.status(400).json({
      success: false,
      message: "You are the instructor of this course and cannot enroll in or purchase your own course."
    });
  }
  const isEnrolled = mockStore.enrolls.some(e => (e.participant_id === pid || e.participant_id === rawPid) && (e.course_id === cid || e.course_id === course.course_id));
  if (isEnrolled) {
    return res.json({ success: false, message: "You are already enrolled in this course." });
  }

  const coursePrice = Number(course.price || course.charge || 0);
  const currentCredit = Number(participant?.credit || 0);

  if (currentCredit < coursePrice) {
    return res.json({
      success: false,
      message: `Insufficient credits! You have ${currentCredit} Credits, but this course requires ${coursePrice} Credits. Earn credits by contributing educational content or uploading verified certificates.`
    });
  }

  const newCredit = currentCredit - coursePrice;
  if (participant) {
    participant.credit = newCredit;
  }

  // Also reward instructor if different
  if (course.participant_id && course.participant_id !== pid) {
    const instructor = mockStore.participants.find(p => p.participant_id === course.participant_id || p.email?.toLowerCase() === course.participant_id.toLowerCase());
    if (instructor) {
      instructor.credit = (Number(instructor.credit) || 500) + coursePrice;
    }
  }

  mockStore.enrolls.push({ participant_id: pid, course_id: course.course_id || cid });

  res.json({
    success: true,
    message: `Enrolled successfully in ${course.course_title || course.title}! ${coursePrice} Credits spent. Remaining balance: ${newCredit} Credits.`,
    newCredit: newCredit,
    enrolledAt: new Date().toISOString()
  });
});

router.get("/courses/:id/lessons", async (req, res) => {
  const courseId = (req.params.id || "").trim();
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const cRes = await executeOracle(
        `SELECT c.course_id, c.course_title, c.course_level, c.price,
                p.first_name || ' ' || p.last_name as instructor_name, p.email as instructor_email,
                pr.progress_id, pr.total_lesson, pr.completed_lesson, pr.progress_percentage
         FROM course c
         LEFT JOIN participant p ON c.participant_id = p.participant_id
         LEFT JOIN progress pr ON c.progress_id = pr.progress_id
         WHERE UPPER(TRIM(c.course_id)) = UPPER(TRIM(:cid)) 
            OR UPPER(TRIM(c.course_title)) = UPPER(TRIM(:cid))`,
        { cid: courseId }
      );

      const resolvedCid = (cRes.data && cRes.data[0]) ? cRes.data[0].COURSE_ID : courseId;
      const courseTitle = (cRes.data && cRes.data[0]) ? cRes.data[0].COURSE_TITLE : "Course Curriculum";

      const assetRes = await executeOracle(
        `SELECT asset_id as id, asset_id, course_id, content_id,
                asset_title as title, asset_title,
                asset_url as video_url, asset_url,
                NVL(asset_duration, 45) as duration
         FROM course_asset
         WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))
         ORDER BY asset_id ASC`,
        { cid: resolvedCid }
      );

      let lessons = [];
      if (assetRes.data && assetRes.data.length > 0) {
        lessons = assetRes.data.map((a, idx) => {
          let vUrl = a.VIDEO_URL || a.ASSET_URL || "https://www.youtube.com/embed/WDX1gLtCIlc";
          if (vUrl.includes("watch?v=")) vUrl = vUrl.replace("watch?v=", "embed/");
          const rawTitle = a.TITLE || a.ASSET_TITLE || "";
          const lesTitle = rawTitle.trim() || `${courseTitle} Module ${idx + 1}`;
          return {
            id: a.ID || a.ASSET_ID || `AS_${resolvedCid}_${idx + 1}`,
            asset_id: a.ASSET_ID,
            content_id: a.CONTENT_ID,
            course_id: resolvedCid,
            title: lesTitle,
            videoUrl: vUrl,
            duration: a.DURATION ? `${a.DURATION} mins` : "45 mins",
            completed: false
          };
        });
      }

      const courseInfo = cRes.data && cRes.data[0] ? cRes.data[0] : null;

      return res.json({
        success: true,
        course: courseInfo ? {
          id: courseInfo.COURSE_ID,
          title: courseInfo.COURSE_TITLE,
          level: courseInfo.COURSE_LEVEL || "Intermediate",
          price: courseInfo.PRICE || 500,
          instructorName: courseInfo.INSTRUCTOR_NAME || "Platform Instructor",
          instructorEmail: courseInfo.INSTRUCTOR_EMAIL || "",
          progressId: courseInfo.PROGRESS_ID,
          totalLessons: lessons.length,
          completedLessons: 0,
          progressPercentage: 0
        } : { id: courseId, title: "Course Curriculum", totalLessons: lessons.length, completedLessons: 0, progressPercentage: 0 },
        lessons
      });
    }
  } catch (e) {
    console.warn("[Course Lessons] Fallback to mock:", e.message);
  }

  const mockCourse = mockStore.courses.find(c => 
    String(c.course_id || c.id).toUpperCase() === String(courseId).toUpperCase() ||
    String(c.course_title || c.title).toUpperCase() === String(courseId).toUpperCase()
  ) || mockStore.courses[0];

  const courseLessons = (mockCourse && Array.isArray(mockCourse.lessons)) ? mockCourse.lessons : [];

  res.json({
    success: true,
    course: {
      id: mockCourse.course_id || mockCourse.id,
      title: mockCourse.course_title || mockCourse.title,
      level: mockCourse.course_level || mockCourse.level,
      price: mockCourse.price,
      instructorName: "Platform Instructor",
      totalLessons: courseLessons.length,
      completedLessons: 0,
      progressPercentage: 0
    },
    lessons: courseLessons
  });
});

router.post("/courses/complete-lesson", async (req, res) => {
  const { participantId, courseId, lessonId, lessonTitle } = req.body;
  const rawPid = (participantId || "P001").trim();
  const cid = (courseId || "C001").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) {
          actualPid = pCheck.data[0].PARTICIPANT_ID;
        }
      }

      // Check course progress & asset count
      const progRes = await executeOracle(
        `SELECT c.progress_id, p.total_lesson, p.completed_lesson,
                (SELECT COUNT(*) FROM course_asset ca WHERE ca.course_id = c.course_id) as asset_count
         FROM course c
         LEFT JOIN progress p ON c.progress_id = p.progress_id
         WHERE UPPER(c.course_id) = UPPER(:cid)`,
        { cid }
      );

      let newCompleted = 1;
      let totalLessons = 5;
      let newPct = 20;

      if (progRes.data && progRes.data[0]) {
        let prid = progRes.data[0].PROGRESS_ID;
        const assetCount = Number(progRes.data[0].ASSET_COUNT) || 0;
        totalLessons = Number(progRes.data[0].TOTAL_LESSON) || assetCount || 5;
        const currentCompleted = Number(progRes.data[0].COMPLETED_LESSON) || 0;
        newCompleted = Math.min(totalLessons, currentCompleted + 1);
        newPct = Math.min(100, Math.round((newCompleted / Math.max(1, totalLessons)) * 100));

        let isNewLessonCompleted = newCompleted > currentCompleted;

        if (!prid) {
          const nextPr = await executeOracle(`SELECT NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(progress_id, '[0-9]+'))), 0) + 1 AS next_id FROM progress`);
          prid = `PR${String(nextPr.data[0].NEXT_ID).padStart(3, '0')}`;
          await executeOracle(
            `INSERT INTO progress (progress_id, total_lesson, completed_lesson)
             VALUES (:prid, :tot, :comp)`,
            { prid, tot: totalLessons, comp: newCompleted }
          );
          await executeOracle(`UPDATE course SET progress_id = :prid WHERE course_id = :cid`, { prid, cid });
        } else if (isNewLessonCompleted) {
          await executeOracle(
            `UPDATE progress
             SET total_lesson = :tot,
                 completed_lesson = :comp
             WHERE progress_id = :prid`,
            { tot: totalLessons, comp: newCompleted, prid }
          );
        }

        // Reward participant with +10 learning credits
        await executeOracle(
          `UPDATE participant SET credit = credit + 10 WHERE participant_id = :pid`,
          { pid: actualPid }
        );

        const cleanTitle = lessonTitle || `Lesson #${lessonId || 1}`;
        await executeOracle(
          `INSERT INTO notification (notification_id, message, type, generated_at)
           VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Progress', SYSDATE)`,
          { msg: `[Participant: ${actualPid}] Great work! You completed "${cleanTitle}" (+10 learning credits earned)!` }
        );
      }

      const pUpdated = await executeOracle(`SELECT credit FROM participant WHERE participant_id = :pid`, { pid: actualPid });
      const newCredit = (pUpdated.data && pUpdated.data[0]) ? pUpdated.data[0].CREDIT : 500;

      return res.json({
        success: true,
        message: `Lesson completed! +10 credits awarded.`,
        newCredit: Number(newCredit)
      });
    }
  } catch (e) {
    console.warn("[Complete Lesson] Fallback to mock:", e.message);
  }

  const p = mockStore.participants.find(item => item.participant_id === rawPid || item.email?.toLowerCase() === rawPid.toLowerCase());
  if (p) p.credit = (p.credit || 500) + 10;
  res.json({ success: true, message: "Lesson completed! +10 credits awarded.", newCredit: p ? p.credit : 510 });
});

router.post("/courses/approve", async (req, res) => {
  const { courseId, id, selectedSkill, skillId, creditValue, price } = req.body;
  const targetId = (courseId || id || "").trim();
  const skillNameOrId = (selectedSkill || skillId || "S001").trim();
  const assignedPrice = Number(creditValue || price) > 0 ? Number(creditValue || price) : 500;

  if (!targetId) {
    return res.status(400).json({ success: false, message: "Course ID is required for approval." });
  }

  let resolvedSkillId = "S001";
  let resolvedSkillName = "General";
  const matchedSkill = (mockStore.skills || []).find(s => 
    s.skill_id.toUpperCase() === skillNameOrId.toUpperCase() || 
    s.skill_name.toLowerCase() === skillNameOrId.toLowerCase()
  );
  if (matchedSkill) {
    resolvedSkillId = matchedSkill.skill_id;
    resolvedSkillName = matchedSkill.skill_name;
  } else if (selectedSkill) {
    resolvedSkillName = selectedSkill;
  }

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      // 1. Resolve Skill ID from Oracle DB
      const skillCheck = await executeOracle(
        `SELECT skill_id, skill_name FROM skill WHERE UPPER(skill_id) = UPPER(:sk) OR UPPER(skill_name) = UPPER(:sk)`,
        { sk: skillNameOrId }
      );
      if (skillCheck.data && skillCheck.data[0]) {
        resolvedSkillId = skillCheck.data[0].SKILL_ID;
        resolvedSkillName = skillCheck.data[0].SKILL_NAME || resolvedSkillName;
      }

      let courseTitle = "New Certified Course";
      let participantId = "P001";
      let level = "Intermediate";
      let lessonList = [];

      const mockPending = (mockStore.pendingCourses || []).find(mc => mc.course_id === targetId || mc.id === targetId) ||
                          (mockStore.courses || []).find(mc => mc.course_id === targetId || mc.id === targetId);
      if (mockPending) {
        courseTitle = mockPending.title || mockPending.course_title || courseTitle;
        participantId = mockPending.participant_id || participantId;
        level = mockPending.level || mockPending.course_level || level;
        lessonList = mockPending.lessons || [];
      }

      const contentCheck = await executeOracle(
        `SELECT content_id, participant_id, content_title, content_url, content_duration 
         FROM content 
         WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid)) OR UPPER(TRIM(content_title)) = UPPER(TRIM(:cid))`,
        { cid: targetId }
      );
      if (contentCheck.data && contentCheck.data[0]) {
        const cntRow = contentCheck.data[0];
        if (!mockPending || !mockPending.title) {
          courseTitle = cntRow.CONTENT_TITLE;
        }
        participantId = cntRow.PARTICIPANT_ID || participantId;

        if (cntRow.CONTENT_URL && typeof cntRow.CONTENT_URL === 'string' && cntRow.CONTENT_URL.startsWith('{')) {
          try {
            const parsed = JSON.parse(cntRow.CONTENT_URL);
            if (parsed.level) level = parsed.level;
            if (Array.isArray(parsed.lessons) && parsed.lessons.length > 0) {
              lessonList = parsed.lessons;
            }
          } catch (e) {}
        }

        if (lessonList.length === 0) {
          lessonList.push({
            title: cntRow.CONTENT_TITLE,
            url: cntRow.CONTENT_URL && !cntRow.CONTENT_URL.startsWith('{') ? cntRow.CONTENT_URL : "https://skillchain.com/lessons",
            duration: cntRow.CONTENT_DURATION || 45
          });
        }
      }

      // Auto-calculate benchmark price from other instructor courses on this subject if not provided
      let assignedPrice = Number(creditValue || price) > 0 ? Number(creditValue || price) : null;
      if (!assignedPrice) {
        const firstWord = courseTitle.split(' ')[0].toLowerCase();
        const priceRes = await executeOracle(
          `SELECT NVL(ROUND(AVG(price)), 500) AS avg_price FROM course WHERE LOWER(course_title) LIKE '%' || :subj || '%'`,
          { subj: firstWord }
        );
        if (priceRes.data && priceRes.data[0] && Number(priceRes.data[0].AVG_PRICE) > 0) {
          assignedPrice = Number(priceRes.data[0].AVG_PRICE);
        } else {
          assignedPrice = 500;
        }
      }

      // 3. Generate Next Course ID & Progress ID safely without collision
      const allCourses = await executeOracle("SELECT course_id FROM course");
      const maxC = (allCourses.data || []).reduce((max, r) => {
        const n = parseInt((r.COURSE_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newCourseId = targetId.startsWith("C") && !targetId.startsWith("CT") ? targetId : "C" + String(maxC + 1).padStart(3, "0");

      const allProgress = await executeOracle("SELECT progress_id FROM progress");
      const maxPr = (allProgress.data || []).reduce((max, r) => {
        const n = parseInt((r.PROGRESS_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newProgressId = "PR" + String(maxPr + 1).padStart(3, "0");
      const totalLessonsCount = Math.max(1, lessonList.length);

      // Check if course already exists in course table (e.g. C004)
      const existingCourseCheck = await executeOracle("SELECT course_id FROM course WHERE course_id = :cid", { cid: newCourseId });
      if (existingCourseCheck.data && existingCourseCheck.data.length > 0) {
        await executeOracle(
          `UPDATE course SET price = :price, skill_id = :skillId WHERE course_id = :cid`,
          { price: assignedPrice, skillId: resolvedSkillId, cid: newCourseId }
        );
      } else {
        // 4. Insert into Oracle PROGRESS table
        await executeOracle(
          `INSERT INTO progress (progress_id, total_lesson, completed_lesson)
           VALUES (:prid, :tot, 0)`,
          { prid: newProgressId, tot: totalLessonsCount }
        );

        // 5. Insert into Oracle COURSE table (with Admin's chosen credit price!)
        await executeOracle(
          `INSERT INTO course (course_id, course_title, course_level, price, participant_id, skill_id, progress_id)
           VALUES (:cid, :title, :level, :price, :pid, :skillId, :prid)`,
          {
            cid: newCourseId,
            title: courseTitle,
            level: level,
            price: assignedPrice,
            pid: participantId,
            skillId: resolvedSkillId,
            prid: newProgressId
          }
        );
      }

      // 6. Insert lessons into COURSE_ASSET & UPLOADS tables
      const allAssets = await executeOracle("SELECT asset_id FROM course_asset");
      let maxAst = (allAssets.data || []).reduce((max, r) => {
        const n = parseInt((r.ASSET_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);

      for (let i = 0; i < lessonList.length; i++) {
        const les = lessonList[i];
        maxAst += 1;
        const assetId = "AS" + String(maxAst).padStart(3, "0");
        const cntId = targetId.startsWith("CT") ? targetId : `CT00${i + 1}`;
        try {
          await executeOracle(
            `INSERT INTO course_asset (asset_id, course_id, asset_title, asset_url, content_id, asset_duration)
             VALUES (:aid, :cid, :title, :url, :cntid, :dur)`,
            { aid: assetId, cid: newCourseId, title: les.title, url: les.url || "https://skillchain.com/lessons", cntid: cntId, dur: Number(les.duration) || 45 }
          );
        } catch (err) {
          console.warn("[Course Asset insert note]:", err.message);
        }
      }

      if (contentCheck.data && contentCheck.data[0]) {
        try {
          await executeOracle(
            `INSERT INTO uploads (participant_id, course_id, content_id)
             VALUES (:pid, :cid, :cntid)`,
            { pid: participantId, cid: newCourseId, cntid: contentCheck.data[0].CONTENT_ID }
          );
        } catch (e) {}
      }

      // 7. Insert or update EXAM table entry for the course
      try {
        let courseExam = null;
        if (contentCheck.data && contentCheck.data[0] && contentCheck.data[0].CONTENT_URL && typeof contentCheck.data[0].CONTENT_URL === 'string' && contentCheck.data[0].CONTENT_URL.startsWith('{')) {
          try {
            const parsed = JSON.parse(contentCheck.data[0].CONTENT_URL);
            if (parsed.exam) courseExam = parsed.exam;
          } catch (e) {}
        }
        if (!courseExam && mockPending && mockPending.exam) {
          courseExam = mockPending.exam;
        }

        const examUrl = (courseExam && courseExam.url) ? courseExam.url : "";
        const examDuration = (courseExam && Number(courseExam.duration)) ? Number(courseExam.duration) : 30;

        const existingExam = await executeOracle("SELECT exam_id FROM exam WHERE course_id = :cid", { cid: newCourseId });
        if (existingExam.data && existingExam.data.length > 0) {
          await executeOracle(
            `UPDATE exam SET exam_url = :url, exam_duration = :dur, exam_status = 'Active' WHERE course_id = :cid`,
            { url: examUrl, dur: examDuration, cid: newCourseId }
          );
        } else {
          const allExams = await executeOracle("SELECT exam_id FROM exam");
          let maxEx = (allExams.data || []).reduce((max, r) => {
            const n = parseInt((r.EXAM_ID || "").replace(/\D/g, ""), 10);
            return !isNaN(n) && n > max ? n : max;
          }, 0);
          const newExamId = "E" + String(maxEx + 1).padStart(3, "0");

          await executeOracle(
            `INSERT INTO exam (exam_id, course_id, exam_url, exam_duration, exam_status)
             VALUES (:eid, :cid, :url, :dur, 'Active')`,
            { eid: newExamId, cid: newCourseId, url: examUrl, dur: examDuration }
          );
        }
      } catch (examErr) {
        console.warn("[Course Exam insert note]:", examErr.message);
      }

      // Update master proposal and all related pending lessons to Published
      await executeOracle(
        `UPDATE content SET content_status = 'Published' 
         WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:targetId)) 
            OR UPPER(TRIM(content_title)) = UPPER(TRIM(:courseTitle))
            OR UPPER(TRIM(content_title)) LIKE UPPER(TRIM(:titlePattern))`,
        { targetId, courseTitle, titlePattern: `${courseTitle}%` }
      );

      // NOTE: Contributor does NOT get +100 credits upfront. They will earn full course price when students enroll.
      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Reward', SYSDATE)`,
        { msg: `[Participant: ${participantId}] Congratulations! Your course "${courseTitle}" has been approved by Admin with ${assignedPrice} credits and is now live on SkillHub! You will earn credits each time a student enrolls.` }
      );

      // Keep in-memory mock store in sync
      if (mockStore.pendingCourses) {
        mockStore.pendingCourses = mockStore.pendingCourses.filter(p => {
          const pid = p.course_id || p.id;
          const ptitle = (p.title || p.course_title || "").trim().toLowerCase();
          return pid !== targetId && (!courseTitle || ptitle !== courseTitle.toLowerCase());
        });
      }
      if (!mockStore.courses) mockStore.courses = [];
      const approvedCourseObj = {
        id: newCourseId,
        course_id: newCourseId,
        title: courseTitle,
        course_title: courseTitle,
        level: level,
        course_level: level,
        price: assignedPrice,
        charge: assignedPrice,
        participant_id: participantId,
        skill_id: resolvedSkillId,
        skillName: resolvedSkillName,
        status: "Approved",
        total_classes: lessonList.length || 10,
        totalClasses: lessonList.length || 10,
        lessons: lessonList
      };

      const existingIdx = mockStore.courses.findIndex(c => c.course_id === newCourseId || c.id === newCourseId || c.course_id === targetId || c.id === targetId || (courseTitle && (c.title || c.course_title || "").trim().toLowerCase() === courseTitle.toLowerCase()));
      if (existingIdx >= 0) {
        mockStore.courses[existingIdx] = { ...mockStore.courses[existingIdx], ...approvedCourseObj };
      } else {
        mockStore.courses.push(approvedCourseObj);
      }

      return res.json({
        success: true,
        message: `Course "${courseTitle}" approved with ${assignedPrice} credits and published to SkillHub!`,
        courseId: newCourseId,
        assignedPrice,
        course: approvedCourseObj
      });
    }
  } catch (e) {
    console.warn("[Approve Course] Fallback to mock:", e.message);
  }

  // Fallback in-memory approval
  let pCourse = (mockStore.pendingCourses || []).find(c => c.course_id === targetId || c.id === targetId);
  let existingInCourses = (mockStore.courses || []).find(c => c.course_id === targetId || c.id === targetId);

  let approvedCourseObj = null;
  const courseTitle = (req.body.title || req.body.courseTitle || pCourse?.title || pCourse?.course_title || existingInCourses?.title || existingInCourses?.course_title || "Certified Course").trim();
  const coursePid = pCourse?.participant_id || existingInCourses?.participant_id || "P001";
  const courseLevel = pCourse?.level || pCourse?.course_level || existingInCourses?.level || existingInCourses?.course_level || "Intermediate";
  const lessons = pCourse?.lessons || existingInCourses?.lessons || [];

  if (mockStore.pendingCourses) {
    mockStore.pendingCourses = mockStore.pendingCourses.filter(c => {
      const pid = c.course_id || c.id;
      const ptitle = (c.title || c.course_title || "").trim().toLowerCase();
      return pid !== targetId && (!courseTitle || ptitle !== courseTitle.toLowerCase());
    });
  }

  approvedCourseObj = {
    ...(existingInCourses || pCourse || {}),
    id: targetId,
    course_id: targetId,
    title: courseTitle,
    course_title: courseTitle,
    level: courseLevel,
    course_level: courseLevel,
    price: assignedPrice,
    charge: assignedPrice,
    participant_id: coursePid,
    skill_id: resolvedSkillId,
    skillName: resolvedSkillName,
    status: "Approved",
    totalClasses: lessons.length > 0 ? lessons.length : (pCourse?.totalClasses || existingInCourses?.totalClasses || 10),
    total_classes: lessons.length > 0 ? lessons.length : (pCourse?.total_classes || existingInCourses?.total_classes || 10),
    lessons: lessons
  };

  const cIdx = (mockStore.courses || []).findIndex(c => c.course_id === targetId || c.id === targetId);
  if (cIdx >= 0) {
    mockStore.courses[cIdx] = approvedCourseObj;
  } else {
    if (!mockStore.courses) mockStore.courses = [];
    mockStore.courses.push(approvedCourseObj);
  }

  // Reward contributor with +100 credits
  const contributor = (mockStore.participants || []).find(p => p.participant_id === coursePid || p.email?.toLowerCase() === coursePid.toLowerCase());
  if (contributor) {
    contributor.credit = (Number(contributor.credit) || 500) + 100;
  }

  if (!mockStore.notifications) mockStore.notifications = [];
  mockStore.notifications.unshift({
    id: Date.now(),
    type: "success",
    tag: "Congratulations!",
    message: `[Participant: ${coursePid}] Congratulations! Your course "${courseTitle}" has been approved by Admin with ${assignedPrice} credits and is now live on SkillHub (+100 bonus credits awarded)!`,
    time: "Just now",
    isUnread: true
  });

  res.json({
    success: true,
    message: `Course "${courseTitle}" approved with ${assignedPrice} credits and published to SkillHub!`,
    courseId: targetId,
    assignedPrice,
    course: approvedCourseObj
  });
});

// ==========================================
// MY CONTRIBUTIONS & FURTHER CONTENT ADDITIONS
// ==========================================
router.get("/contributions/:participantId", async (req, res) => {
  const rawPid = (req.params.participantId || "").trim();
  const cleanPid = rawPid.toLowerCase();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) {
          actualPid = pCheck.data[0].PARTICIPANT_ID;
        }
      }

      // 1. Fetch approved / published courses from COURSE table (and uploads link)
      const approvedRes = await executeOracle(
        `SELECT c.course_id, c.course_title, c.course_level, c.price, c.participant_id, c.skill_id,
                s.skill_name, NVL(pr.total_lesson, 10) as total_lessons
         FROM course c
         LEFT JOIN skill s ON c.skill_id = s.skill_id
         LEFT JOIN progress pr ON c.progress_id = pr.progress_id
         WHERE UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:pid))
            OR UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:rawPid))
            OR c.course_id IN (SELECT course_id FROM uploads WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:pid)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:rawPid)))
            OR c.participant_id IN (SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:rawPid)))
         ORDER BY c.course_id DESC`,
        { pid: actualPid, rawPid }
      );

      // Fetch assets (lessons) for approved courses
      const assetsRes = await executeOracle(
        `SELECT asset_id, course_id, asset_title, asset_url, asset_duration, content_id 
         FROM course_asset 
         WHERE course_id IN (
           SELECT c.course_id FROM course c 
           WHERE UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:pid))
              OR UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:rawPid))
              OR c.course_id IN (SELECT course_id FROM uploads WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:pid)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:rawPid)))
              OR c.participant_id IN (SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:rawPid)))
         )
         ORDER BY asset_id ASC`,
        { pid: actualPid, rawPid }
      );

      const assetsByCourse = {};
      (assetsRes.data || []).forEach(ast => {
        const cid = ast.COURSE_ID;
        if (!assetsByCourse[cid]) assetsByCourse[cid] = [];
        assetsByCourse[cid].push({
          id: ast.ASSET_ID,
          asset_id: ast.ASSET_ID,
          content_id: ast.CONTENT_ID,
          title: ast.ASSET_TITLE,
          url: ast.ASSET_URL,
          duration: ast.ASSET_DURATION || 45
        });
      });

      // Fetch exams for approved courses
      const examsRes = await executeOracle(
        `SELECT exam_id, course_id, exam_url, exam_duration, exam_status 
         FROM exam 
         WHERE course_id IN (
           SELECT c.course_id FROM course c 
           WHERE UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:pid))
              OR UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:rawPid))
              OR c.course_id IN (SELECT course_id FROM uploads WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:pid)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:rawPid)))
              OR c.participant_id IN (SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:rawPid)))
         )`,
        { pid: actualPid, rawPid }
      );

      const examsByCourse = {};
      (examsRes.data || []).forEach(ex => {
        examsByCourse[ex.COURSE_ID] = {
          id: ex.EXAM_ID,
          exam_id: ex.EXAM_ID,
          exam_url: ex.EXAM_URL,
          url: ex.EXAM_URL,
          duration: ex.EXAM_DURATION || 30,
          exam_duration: ex.EXAM_DURATION || 30,
          status: ex.EXAM_STATUS || "Active"
        };
      });

      const approvedCourses = (approvedRes.data || []).map(c => {
        const cid = c.COURSE_ID;
        const lessons = assetsByCourse[cid] || [];
        const exam = examsByCourse[cid] || null;
        return {
          id: cid,
          course_id: cid,
          title: c.COURSE_TITLE,
          course_title: c.COURSE_TITLE,
          level: c.COURSE_LEVEL || "Intermediate",
          course_level: c.COURSE_LEVEL || "Intermediate",
          price: c.PRICE || 500,
          charge: c.PRICE || 500,
          skillName: c.SKILL_NAME || "General",
          totalLessons: lessons.length > 0 ? lessons.length : (c.TOTAL_LESSONS || 10),
          status: "Approved",
          participant_id: c.PARTICIPANT_ID || actualPid,
          participantId: c.PARTICIPANT_ID || actualPid,
          lessons: lessons,
          exam: exam
        };
      });

      // 2. Fetch draft, pending, and published proposals directly from Oracle DB CONTENT table
      // (Only JSON packages that represent full course proposals, not single lesson rows or linked course assets)
      const contentDbRes = await executeOracle(
        `SELECT ct.content_id, ct.content_title, ct.content_url, ct.content_duration, ct.content_status, ct.participant_id
         FROM content ct
         WHERE (UPPER(TRIM(ct.participant_id)) = UPPER(TRIM(:pid))
            OR UPPER(TRIM(ct.participant_id)) = UPPER(TRIM(:rawPid))
            OR ct.participant_id IN (SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:rawPid))))
           AND ct.content_url LIKE '{%'
           AND ct.content_id NOT IN (SELECT NVL(content_id, 'NONE') FROM course_asset)
         ORDER BY ct.content_id DESC`,
        { pid: actualPid, rawPid }
      );

      const draftCourses = [];
      const pendingCourses = [];

      (contentDbRes.data || []).forEach(c => {
        let level = "Intermediate";
        let lessons = [];
        let exam = null;

        if (c.CONTENT_URL && typeof c.CONTENT_URL === 'string' && c.CONTENT_URL.startsWith("{")) {
          try {
            const parsed = JSON.parse(c.CONTENT_URL);
            if (parsed.level) level = parsed.level;
            if (Array.isArray(parsed.lessons)) lessons = parsed.lessons;
            if (parsed.exam) exam = parsed.exam;
          } catch (e) {}
        }

        const rawStatus = (c.CONTENT_STATUS || "").trim();
        const lowerStatus = rawStatus.toLowerCase();

        // Skip individual lesson chunks that are not course packages
        if (lowerStatus === "pending_lesson") return;

        const courseItem = {
          id: c.CONTENT_ID,
          course_id: c.CONTENT_ID,
          title: c.CONTENT_TITLE,
          course_title: c.CONTENT_TITLE,
          level: level,
          course_level: level,
          status: rawStatus || "Draft",
          participant_id: c.PARTICIPANT_ID || actualPid,
          participantId: c.PARTICIPANT_ID || actualPid,
          totalLessons: lessons.length > 0 ? lessons.length : 1,
          lessons: lessons,
          exam: exam
        };

        // Check if this course is already approved in COURSE table
        const matchedApproved = approvedCourses.find(a => 
          (a.id && a.id === courseItem.id) ||
          (a.course_id && a.course_id === courseItem.course_id) ||
          ((a.title || a.course_title || '').trim().toLowerCase() === (courseItem.title || courseItem.course_title || '').trim().toLowerCase())
        );

        if (matchedApproved) {
          // Sync lessons and exam metadata to approved course if not present
          if ((!matchedApproved.lessons || matchedApproved.lessons.length === 0) && lessons.length > 0) {
            matchedApproved.lessons = lessons;
            matchedApproved.totalLessons = lessons.length;
          }
          if (!matchedApproved.exam && exam) {
            matchedApproved.exam = exam;
          }
          return; // Do NOT add to pending or drafts!
        }

        if (lowerStatus === 'pending' || lowerStatus === 'peer_review' || lowerStatus === 'in review' || lowerStatus === 'under_review') {
          pendingCourses.push(courseItem);
        } else if (lowerStatus === 'draft') {
          draftCourses.push(courseItem);
        } else if (lowerStatus === 'peer_review_rejected' || lowerStatus === 'rejected') {
          draftCourses.push({ ...courseItem, status: 'Peer_Review_Rejected' });
        }
      });

      // Deduplicate arrays
      const uniqueApproved = Array.from(new Map(approvedCourses.map(item => [(item.id || item.course_id || item.title).toLowerCase(), item])).values());
      const uniquePending = Array.from(new Map(pendingCourses.map(item => [(item.id || item.course_id || item.title).toLowerCase(), item])).values())
        .filter(p => !uniqueApproved.some(a => 
          (a.id && a.id === p.id) || 
          (a.course_id && a.course_id === p.course_id) || 
          ((a.title || a.course_title || '').trim().toLowerCase() === (p.title || p.course_title || '').trim().toLowerCase())
        ));
      const uniqueDrafts = Array.from(new Map(draftCourses.map(item => [(item.id || item.course_id || item.title).toLowerCase(), item])).values())
        .filter(d => d.status === 'Peer_Review_Rejected' || (!uniqueApproved.some(a => (a.title || '').trim().toLowerCase() === (d.title || '').trim().toLowerCase()) && !uniquePending.some(p => (p.title || '').trim().toLowerCase() === (d.title || '').trim().toLowerCase())));

      return res.json({
        success: true,
        draftCourses: uniqueDrafts,
        pendingCourses: uniquePending,
        approvedCourses: uniqueApproved
      });
    }
  } catch (e) {
    console.warn("[Contributions] Fallback:", e.message);
  }

  // Fallback MockStore
  const userMatches = (pid) => {
    if (!pid) return false;
    const p = String(pid).trim().toLowerCase();
    return p === cleanPid || p === (rawPid || "").toLowerCase();
  };

  const approved = (mockStore.courses || [])
    .filter(c => (userMatches(c.participant_id) || userMatches(c.instructorEmail) || cleanPid === "p001" || cleanPid === "tanvir@gmail.com") && (c.status === "Approved" || !c.status))
    .map(c => ({ ...c, status: "Approved", participant_id: c.participant_id || rawPid }));

  let pending = (mockStore.pendingCourses || [])
    .filter(c => (userMatches(c.participant_id) || userMatches(c.instructorEmail)) && c.status !== "Approved")
    .map(c => ({ ...c, participant_id: c.participant_id || rawPid }));

  pending = pending.filter(p => !approved.some(a => 
    (a.id === p.id) || 
    (a.course_id === p.course_id) || 
    ((a.title || a.course_title || '').trim().toLowerCase() === (p.title || p.course_title || '').trim().toLowerCase())
  ));

  const drafts = (mockStore.draftCourses || [])
    .filter(d => userMatches(d.participant_id));

  res.json({
    success: true,
    draftCourses: drafts,
    pendingCourses: pending,
    approvedCourses: approved
  });
});

router.delete("/contributions/:courseId", async (req, res) => {
  const targetCid = (req.params.courseId || "").trim();
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      // 1. Delete associated course_asset rows if any
      await executeOracle(
        `DELETE FROM course_asset WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid)) OR UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`,
        { cid: targetCid }
      ).catch(() => {});

      // 2. Delete from content table
      await executeOracle(
        `DELETE FROM content WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid)) OR UPPER(TRIM(content_title)) = UPPER(TRIM(:cid))`,
        { cid: targetCid }
      );

      return res.json({ success: true, message: `Draft course ${targetCid} deleted successfully from Oracle DB!` });
    }
  } catch (err) {
    console.warn("[Delete Draft Error]:", err.message);
  }

  if (mockStore.courses) {
    mockStore.courses = mockStore.courses.filter(c => (c.id || c.course_id) !== targetCid);
  }
  if (mockStore.pendingCourses) {
    mockStore.pendingCourses = mockStore.pendingCourses.filter(c => (c.id || c.course_id) !== targetCid);
  }
  if (mockStore.peerReviewCourses) {
    mockStore.peerReviewCourses = mockStore.peerReviewCourses.filter(c => (c.id || c.course_id) !== targetCid);
  }

  return res.json({ success: true, message: `Draft course ${targetCid} deleted successfully!` });
});

router.post("/courses/add-content", async (req, res) => {
  const { courseId, participantId, lessonTitle, title: reqTitle, lessonUrl, url: reqUrl, lessonDuration, duration: reqDuration } = req.body;
  const targetCid = (courseId || "C001").trim();
  const rawPid = (participantId || "P001").trim();
  const title = (lessonTitle || reqTitle || "New Lesson Addition").trim();
  const url = (lessonUrl || reqUrl || "https://skillchain.com/lesson").trim();
  const duration = Number(lessonDuration || reqDuration) || 45;

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // Generate Asset ID
      const allAssets = await executeOracle("SELECT asset_id FROM course_asset");
      let maxAst = (allAssets.data || []).reduce((max, r) => {
        const n = parseInt((r.ASSET_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newAstId = "AS" + String(maxAst + 1).padStart(3, "0");

      // Generate Content ID
      const allCnt = await executeOracle("SELECT content_id FROM content");
      let maxCnt = (allCnt.data || []).reduce((max, r) => {
        const n = parseInt((r.CONTENT_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newCntId = "CT" + String(maxCnt + 1).padStart(3, "0");

      // Check if course exists in COURSE table
      const courseCheck = await executeOracle("SELECT course_id, course_title, progress_id FROM course WHERE UPPER(course_id) = UPPER(:cid)", { cid: targetCid });
      const isApprovedCourse = courseCheck.data && courseCheck.data.length > 0;

      if (isApprovedCourse) {
        // Direct insertion into COURSE_ASSET for approved course
        await executeOracle(
          `INSERT INTO course_asset (asset_id, course_id, asset_title, asset_url, content_id, asset_duration)
           VALUES (:aid, :cid, :title, :url, :cntid, :dur)`,
          { aid: newAstId, cid: targetCid, title, url, cntid: newCntId, dur: duration }
        );

        // Record in CONTENT as Published
        await executeOracle(
          `INSERT INTO content (content_id, participant_id, content_url, content_title, content_status, content_duration)
           VALUES (:cntid, :pid, :url, :title, 'Published', :dur)`,
          { cntid: newCntId, pid: actualPid, url, title, dur: duration }
        );

        // Record in UPLOADS
        await executeOracle(
          `INSERT INTO uploads (participant_id, course_id, content_id)
           VALUES (:pid, :cid, :cntid)`,
          { pid: actualPid, cid: targetCid, cntid: newCntId }
        ).catch(() => {});

        // Increment total_lesson count in PROGRESS table
        await executeOracle(
          `UPDATE progress SET total_lesson = total_lesson + 1
           WHERE progress_id = (SELECT progress_id FROM course WHERE UPPER(course_id) = UPPER(:cid))`,
          { cid: targetCid }
        ).catch(() => {});
      } else {
        // Pending course content proposal
        await executeOracle(
          `INSERT INTO content (content_id, participant_id, content_url, content_title, content_status, content_duration)
           VALUES (:cntid, :pid, :url, :title, 'Pending', :dur)`,
          { cntid: newCntId, pid: actualPid, url, title, dur: duration }
        );
      }

      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Content', SYSDATE)`,
        { msg: `[Participant: ${actualPid}] Lesson "${title}" added to course ${targetCid} and is now live in the curriculum!` }
      );

      if (!mockStore.pendingLessons) mockStore.pendingLessons = [];
      mockStore.pendingLessons.push({
        contentId: newCntId,
        courseId: targetCid,
        participantId: actualPid,
        title,
        url,
        duration,
        status: isApprovedCourse ? "Approved" : "Pending"
      });

      return res.json({
        success: true,
        message: `Lesson "${title}" successfully added to course ${targetCid}!`,
        contentId: newCntId,
        assetId: newAstId
      });
    }
  } catch (e) {
    console.warn("[Add Content] Error:", e.message);
  }

  if (!mockStore.pendingLessons) mockStore.pendingLessons = [];
  mockStore.pendingLessons.push({
    contentId: "CT" + Date.now(),
    courseId: targetCid,
    participantId: rawPid,
    title,
    url,
    duration,
    status: "Approved"
  });

  res.json({ success: true, message: `Lesson "${title}" added to course successfully!` });
});

router.get("/courses/pending-lessons", async (req, res) => {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const result = await executeOracle(
        `SELECT ct.content_id, ct.participant_id, ct.content_title, ct.content_url, ct.content_duration,
                p.first_name || ' ' || p.last_name as instructor_name, p.email as instructor_email
         FROM content ct
         JOIN participant p ON ct.participant_id = p.participant_id
         WHERE ct.content_status = 'Pending'
         ORDER BY ct.content_id DESC`
      );
      if (result.data) {
        const list = result.data.map(r => ({
          contentId: r.CONTENT_ID,
          title: r.CONTENT_TITLE,
          url: r.CONTENT_URL,
          duration: r.CONTENT_DURATION || 45,
          participantId: r.PARTICIPANT_ID,
          instructorName: r.INSTRUCTOR_NAME,
          instructorEmail: r.INSTRUCTOR_EMAIL,
          courseId: (mockStore.pendingLessons || []).find(pl => pl.contentId === r.CONTENT_ID)?.courseId || "General"
        }));
        return res.json({ success: true, count: list.length, lessons: list });
      }
    }
  } catch (e) {
    console.warn("[Pending Lessons] Fallback:", e.message);
  }

  res.json({ success: true, count: (mockStore.pendingLessons || []).length, lessons: mockStore.pendingLessons || [] });
});

router.post("/courses/approve-lesson", async (req, res) => {
  const { contentId, courseId } = req.body;
  const cntId = (contentId || "").trim();
  const cid = (courseId || "C001").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const allAssets = await executeOracle("SELECT asset_id FROM course_asset");
      let maxAst = (allAssets.data || []).reduce((max, r) => {
        const n = parseInt((r.ASSET_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newAssetId = "AS" + String(maxAst + 1).padStart(3, "0");

      const cntRow = await executeOracle(`SELECT * FROM content WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid))`, { cid: cntId });
      const lessonTitle = cntRow.data && cntRow.data[0] ? cntRow.data[0].CONTENT_TITLE : "Additional Lesson";
      const lessonUrl = cntRow.data && cntRow.data[0] ? cntRow.data[0].CONTENT_URL : "https://skillchain.com/lessons";
      const duration = cntRow.data && cntRow.data[0] ? (cntRow.data[0].CONTENT_DURATION || 45) : 45;
      const pid = cntRow.data && cntRow.data[0] ? cntRow.data[0].PARTICIPANT_ID : "P001";

      await executeOracle(
        `INSERT INTO course_asset (asset_id, course_id, asset_title, asset_url, content_id, asset_duration)
         VALUES (:aid, :cid, :title, :url, :cntid, :dur)`,
        { aid: newAssetId, cid, title: lessonTitle, url: lessonUrl, cntid: cntId, dur: duration }
      );

      await executeOracle(
        `UPDATE progress SET total_lesson = total_lesson + 1 WHERE progress_id IN (SELECT progress_id FROM course WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid)))`,
        { cid }
      );

      await executeOracle(
        `UPDATE content SET content_status = 'Published' WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cntid))`,
        { cntid: cntId }
      );

      await executeOracle(
        `UPDATE participant SET credit = credit + 50 WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:pid))`,
        { pid }
      );

      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Reward', SYSDATE)`,
        { msg: `[Participant: ${pid}] Congratulations! Your lesson "${lessonTitle}" has been approved and added to course ${cid} (+50 credits awarded)!` }
      );

      if (mockStore.pendingLessons) {
        mockStore.pendingLessons = mockStore.pendingLessons.filter(pl => pl.contentId !== cntId);
      }

      return res.json({ success: true, message: `Lesson "${lessonTitle}" approved and added to course ${cid}!` });
    }
  } catch (e) {
    console.warn("[Approve Lesson] Error:", e.message);
  }

  res.json({ success: true, message: `Lesson approved and added to course!` });
});



router.post("/courses/reject", async (req, res) => {
  const { courseId, courseTitle: reqTitle } = req.body;
  const targetId = (courseId || "").trim();
  let courseTitle = (reqTitle || "").trim();
  let pid = "P001";

  const mockPending = (mockStore.pendingCourses || []).find(p => 
    p.course_id === targetId || p.id === targetId || 
    (courseTitle && (p.title || p.course_title || '').toLowerCase() === courseTitle.toLowerCase())
  );
  if (mockPending) {
    courseTitle = mockPending.title || mockPending.course_title || courseTitle;
    pid = mockPending.participant_id || pid;
  }

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const cntRes = await executeOracle(
        `SELECT participant_id, content_title FROM content 
         WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid)) 
            OR UPPER(TRIM(content_title)) = UPPER(TRIM(:cid))
            OR UPPER(TRIM(content_title)) = UPPER(TRIM(:title))`,
        { cid: targetId, title: courseTitle || targetId }
      );
      if (cntRes.data && cntRes.data[0]) {
        pid = cntRes.data[0].PARTICIPANT_ID || pid;
        courseTitle = cntRes.data[0].CONTENT_TITLE || courseTitle;
      }

      await executeOracle(
        `UPDATE content SET content_status = 'Rejected' 
         WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid)) 
            OR UPPER(TRIM(content_title)) = UPPER(TRIM(:cid))
            OR UPPER(TRIM(content_title)) = UPPER(TRIM(:title))`,
        { cid: targetId, title: courseTitle || targetId }
      );

      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'warning', SYSDATE)`,
        { msg: `[Participant: ${pid}] Your course proposal "${courseTitle || targetId}" was reviewed and rejected by Admin.` }
      );
    }
  } catch (e) {
    console.warn("[Reject Course] Fallback to mock:", e.message);
  }

  // Remove completely from pending store
  if (mockStore.pendingCourses) {
    mockStore.pendingCourses = mockStore.pendingCourses.filter(p => {
      const pid = p.course_id || p.id;
      const ptitle = (p.title || p.course_title || '').toLowerCase();
      return pid !== targetId && (!courseTitle || ptitle !== courseTitle.toLowerCase());
    });
  }

  const course = (mockStore.courses || []).find(c => 
    c.course_id === targetId || c.id === targetId || 
    (courseTitle && (c.title || c.course_title || '').toLowerCase() === courseTitle.toLowerCase())
  );
  if (course) {
    course.status = "Rejected";
  }

  res.json({ success: true, message: `Course "${courseTitle || targetId}" rejected and removed from approval queue.` });
});

// ==========================================
// SKILLS
// ==========================================
router.get("/skills", async (req, res) => {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const result = await executeOracle(`SELECT * FROM skill ORDER BY skill_id`);
      if (result.data && result.data.length > 0) {
        const skills = result.data.map(s => ({
          ...s,
          skill_id: s.SKILL_ID || s.skill_id,
          skill_name: s.SKILL_NAME || s.skill_name,
          skill_tier: s.SKILL_TIER || s.skill_tier,
          admin_id: s.ADMIN_ID || s.admin_id
        }));
        return res.json({ success: true, skills });
      }
    }
  } catch (e) {
    console.warn("[Skills] Fallback to mock:", e.message);
  }
  res.json({ success: true, skills: mockStore.skills });
});

router.post("/skills/add", async (req, res) => {
  const { skillName, skillTier, creditValue, category, description } = req.body;
  const newSid = "S" + String(mockStore.skills.length + 1).padStart(3, "0");

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      await executeOracle(
        `INSERT INTO skill (skill_id, admin_id, skill_name, skill_tier) VALUES (:sid, 'A001', :name, :tier)`,
        { sid: newSid, name: skillName, tier: skillTier }
      );
      return res.json({ success: true, message: `Skill "${skillName}" created!`, skill: { skill_id: newSid, skill_name: skillName, skill_tier: skillTier } });
    }
  } catch (e) {
    console.warn("[Add Skill] Fallback to mock:", e.message);
  }

  const newSkill = {
    skill_id: newSid,
    admin_id: "A001",
    skill_name: skillName || "New Skill",
    skill_tier: skillTier || "Intermediate"
  };
  mockStore.skills.push(newSkill);
  res.json({ success: true, message: `Skill "${skillName}" created successfully!`, skill: newSkill });
});

// ==========================================
// CERTIFICATES
// ==========================================
function cleanCertificateSkillTitle(raw, fallback = "Skill Certificate") {
  if (!raw || typeof raw !== 'string') return fallback;
  let str = raw.trim();

  // If it's a file path or url, get last component
  if (str.includes('/') || str.includes('\\')) {
    str = str.split(/[/\\]/).pop();
  }

  // Remove file extensions
  str = str.replace(/\.(webp|png|jpe?g|pdf|svg|gif)$/i, '');

  // If it's an ID like CERT001, CERT006, cert_03, default_P001, P003, etc.
  if (/^(cert|certificate|default|c|p)[_-]?\d+([a-z0-9_]+)?$/i.test(str) || /^cert\d+$/i.test(str) || /^default_[a-z0-9]+$/i.test(str)) {
    return fallback;
  }

  // Remove UUIDs (e.g. ed5378c9-3f3f-4da5-af3b-89f7c69fcbd8)
  str = str.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '');

  // Remove hex strings / long random hashes
  str = str.replace(/\b[0-9a-fA-F]{16,}\b/g, '');

  // Remove timestamp suffixes (e.g. _1789114314445 or -1789114314445)
  str = str.replace(/[_-]\d{10,15}\b/g, '');

  // Remove cert_P001_ or cert_ prefixes
  str = str.replace(/^cert_[A-Za-z0-9]+_/i, '');
  str = str.replace(/^cert_/i, '');

  // Remove boilerplate like certificate_of_completion
  str = str.replace(/certificate[_\s\-]+of[_\s\-]+completion/gi, '');
  str = str.replace(/completion[_\s\-]+certificate/gi, '');
  str = str.replace(/certificate[_\s\-]+/gi, ' ');
  str = str.replace(/[_\s\-]+certificate/gi, ' ');

  // Replace underscores and hyphens with space
  str = str.replace(/[_\-]+/g, ' ').trim();
  str = str.replace(/\s+/g, ' ').trim();

  if (!str || /^\d+$/.test(str) || /^cert\s*\d+$/i.test(str) || /^default$/i.test(str) || /^(c|p)\d+$/i.test(str)) {
    return fallback;
  }

  const words = str.split(' ').map(w => {
    const lower = w.toLowerCase();
    if (['c++', 'c#', 'sql', 'html', 'css', 'js', 'php', 'ui', 'ux', 'ai', 'ml', 'jwt', 'api', 'dbms'].includes(lower)) {
      return lower.toUpperCase();
    }
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  return words.join(' ');
}

router.get("/certificates", async (req, res) => {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const result = await executeOracle(
        `SELECT c.certificate_id, c.certificate_type, c.certificate_asset, c.participant_id,
                TO_CHAR(c.issue_date, 'YYYY-MM-DD') AS issue_date,
                p.first_name, p.last_name, p.email,
                NVL(v.verification_status, 'Pending') AS status,
                s.skill_name AS skill_title
         FROM certificate c
         JOIN participant p ON c.participant_id = p.participant_id
         LEFT JOIN verify v ON c.certificate_id = v.certificate_id
         LEFT JOIN updates u ON c.certificate_id = u.certificate_id AND c.participant_id = u.participant_id
         LEFT JOIN skill s ON u.skill_id = s.skill_id
         ORDER BY c.certificate_id DESC`
      );
      if (result.data && result.data.length > 0) {
        const certificates = result.data.map(c => {
          const rawAsset = c.CERTIFICATE_ASSET || "";
          let fullAssetUrl = "";
          if (rawAsset.startsWith("data:image/")) {
            fullAssetUrl = rawAsset;
          } else if (rawAsset.startsWith("http://") || rawAsset.startsWith("https://")) {
            fullAssetUrl = rawAsset;
          } else if (rawAsset.startsWith("/")) {
            fullAssetUrl = rawAsset;
          } else if (rawAsset.includes(".png") || rawAsset.includes(".jpg") || rawAsset.includes(".jpeg") || rawAsset.includes(".webp")) {
            fullAssetUrl = `/uploads/certificates/${rawAsset}`;
          } else {
            fullAssetUrl = `/uploads/certificates/default_${c.PARTICIPANT_ID}.png`;
          }

          const fullName = `${c.FIRST_NAME || ''} ${c.LAST_NAME || ''}`.trim() || c.PARTICIPANT_ID;
          const certSkillTitle = c.CERTIFICATE_TYPE || c.SKILL_TITLE || cleanCertificateSkillTitle(rawAsset, "Verified Skill Certificate");

          return {
            id: c.CERTIFICATE_ID,
            certId: c.CERTIFICATE_ID,
            skill: certSkillTitle,
            certificate_type: c.CERTIFICATE_TYPE || certSkillTitle,
            asset: fullAssetUrl,
            status: c.STATUS || "Pending",
            participant_id: c.PARTICIPANT_ID,
            participantName: fullName,
            email: c.EMAIL,
            issueDate: c.ISSUE_DATE
          };
        });
        return res.json({ success: true, count: certificates.length, certificates });
      }
    }
  } catch (e) {
    console.warn("[Certificates] Fallback to mock:", e.message);
  }

  const certs = (mockStore.certificates || []).map(c => {
    const rawAsset = c.asset || "";
    let fullAssetUrl = "";
    if (rawAsset.startsWith("data:image/")) {
      fullAssetUrl = rawAsset;
    } else if (rawAsset.startsWith("http://") || rawAsset.startsWith("https://")) {
      fullAssetUrl = rawAsset;
    } else if (rawAsset.startsWith("/")) {
      fullAssetUrl = rawAsset;
    } else if (rawAsset.includes(".png") || rawAsset.includes(".jpg") || rawAsset.includes(".jpeg") || rawAsset.includes(".webp")) {
      fullAssetUrl = `/uploads/certificates/${rawAsset}`;
    } else {
      fullAssetUrl = `/uploads/certificates/default_${c.participant_id || 'P001'}.png`;
    }

    const p = (mockStore.participants || []).find(part => part.participant_id === c.participant_id);
    const resolvedName = c.participantName || (p ? `${p.first_name} ${p.last_name}` : `Participant ${c.participant_id}`);
    const cleanTitle = c.certificate_type || cleanCertificateSkillTitle(c.skill || rawAsset, "Verified Skill Certificate");

    return {
      ...c,
      skill: cleanTitle,
      certificate_type: cleanTitle,
      participantName: resolvedName,
      asset: fullAssetUrl
    };
  });

  res.json({ success: true, count: certs.length, certificates: certs });
});

router.post("/certificates/verify", async (req, res) => {
  const { id, certId, status, skill } = req.body;
  const targetCid = (certId || id || "").trim();
  const newStatus = status || "Accepted";
  const assignedSkill = (skill || "").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      // 1. Fetch previous verification_status
      let previousStatus = null;
      const verifyCheck = await executeOracle(
        `SELECT verification_status FROM verify WHERE UPPER(certificate_id) = UPPER(:cid)`,
        { cid: targetCid }
      );
      if (verifyCheck.data && verifyCheck.data.length > 0) {
        previousStatus = verifyCheck.data[0].VERIFICATION_STATUS;
        await executeOracle(
          `UPDATE verify SET verification_status = :status, verified_at = SYSDATE WHERE UPPER(certificate_id) = UPPER(:cid)`,
          { status: newStatus, cid: targetCid }
        );
      } else {
        await executeOracle(
          `INSERT INTO verify (admin_id, certificate_id, verified_at, verification_status)
           VALUES ('A001', :cid, SYSDATE, :status)`,
          { cid: targetCid, status: newStatus }
        );
      }

      // 2. Fetch participant_id from certificate
      const certUserRes = await executeOracle(
        `SELECT participant_id FROM certificate WHERE UPPER(certificate_id) = UPPER(:cid)`,
        { cid: targetCid }
      );
      const certPid = (certUserRes.data && certUserRes.data[0]) ? certUserRes.data[0].PARTICIPANT_ID : "P001";

      // 3. Update certificate_type in CERTIFICATE table
      if (assignedSkill) {
        await executeOracle(
          `UPDATE certificate SET certificate_type = :ctype WHERE UPPER(certificate_id) = UPPER(:cid)`,
          { ctype: assignedSkill, cid: targetCid }
        ).catch(() => {});
      }

      if (newStatus === "Accepted") {
        // 4. If Admin provided a Certificate Type / Skill Name, link with SKILL, UPDATES, and PARTICIPANT_SKILL
        if (assignedSkill) {
          let skillId = null;
          const sCheck = await executeOracle(
            `SELECT skill_id FROM skill WHERE UPPER(TRIM(skill_name)) = UPPER(TRIM(:sname))`,
            { sname: assignedSkill }
          );
          if (sCheck.data && sCheck.data.length > 0) {
            skillId = sCheck.data[0].SKILL_ID;
          } else {
            const allS = await executeOracle("SELECT skill_id FROM skill");
            let maxS = (allS.data || []).reduce((max, r) => {
              const n = parseInt((r.SKILL_ID || "").replace(/\D/g, ""), 10);
              return !isNaN(n) && n > max ? n : max;
            }, 0);
            skillId = "S" + String(maxS + 1).padStart(3, "0");
            await executeOracle(
              `INSERT INTO skill (skill_id, admin_id, skill_name, skill_tier) VALUES (:sid, 'A001', :sname, 'Intermediate')`,
              { sid: skillId, sname: assignedSkill }
            );
          }

          // Link in UPDATES table (certificate_id, participant_id, skill_id)
          const upCheck = await executeOracle(
            `SELECT COUNT(*) as cnt FROM updates WHERE UPPER(certificate_id) = UPPER(:cid) AND UPPER(participant_id) = UPPER(:pid)`,
            { cid: targetCid, pid: certPid }
          );
          if (upCheck.data && upCheck.data[0] && upCheck.data[0].CNT > 0) {
            await executeOracle(
              `UPDATE updates SET skill_id = :sid WHERE UPPER(certificate_id) = UPPER(:cid) AND UPPER(participant_id) = UPPER(:pid)`,
              { sid: skillId, cid: targetCid, pid: certPid }
            );
          } else {
            await executeOracle(
              `INSERT INTO updates (certificate_id, participant_id, skill_id) VALUES (:cid, :pid, :sid)`,
              { cid: targetCid, pid: certPid, sid: skillId }
            );
          }

          // Insert into PARTICIPANT_SKILL table if not already present
          const psCheck = await executeOracle(
            `SELECT COUNT(*) as cnt FROM participant_skill WHERE UPPER(participant_id) = UPPER(:pid) AND UPPER(TRIM(skill)) = UPPER(TRIM(:sname))`,
            { pid: certPid, sname: assignedSkill }
          );
          if (!psCheck.data || psCheck.data[0].CNT === 0) {
            await executeOracle(
              `INSERT INTO participant_skill (participant_id, skill) VALUES (:pid, :sname)`,
              { pid: certPid, sname: assignedSkill }
            );
          }
        }

        // Reward 100 credits and promote to Expert
        if (previousStatus !== "Accepted") {
          await executeOracle(
            `UPDATE participant SET credit = credit + 100, status = 'Expert' WHERE participant_id = :pid`,
            { pid: certPid }
          );

          // Insert participant-specific notification
          await executeOracle(
            `INSERT INTO notification (notification_id, message, type, generated_at)
             VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'success', SYSDATE)`,
            { msg: `[Participant: ${certPid}] Congratulations! Your certificate "${assignedSkill || targetCid}" has been verified and approved by Admin (+100 credits awarded, promoted to Expert)!` }
          );
        }
      } else {
        await executeOracle(
          `INSERT INTO notification (notification_id, message, type, generated_at)
           VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'warning', SYSDATE)`,
          { msg: `[Participant: ${certPid}] Notice: Your certificate ${targetCid} was reviewed and rejected by Admin.` }
        );
      }

      return res.json({
        success: true,
        message: `Certificate ${targetCid} ${newStatus === 'Accepted' ? 'approved and verified as "' + (assignedSkill || 'Skill Certificate') + '"' : 'rejected'}!`
      });
    }
  } catch (e) {
    console.warn("[Verify Cert] Error:", e.message);
  }

  const cert = mockStore.certificates.find(c => c.id === id || c.certId === targetCid);
  if (cert) {
    cert.status = newStatus;
    if (assignedSkill) {
      cert.skill = assignedSkill;
      cert.certificate_type = assignedSkill;
    }
  }
  res.json({ success: true, message: `Certificate ${targetCid} updated to status "${newStatus}"!`, certificate: cert });
});

router.post("/certificates/upload", async (req, res) => {
  const { certName, participantId, fileUrl, imageBase64 } = req.body;
  const rawPid = (participantId || "P001").trim();
  const name = (certName || "Skill Certificate").trim();

  let savedAssetPath = fileUrl || "";

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) {
          actualPid = pCheck.data[0].PARTICIPANT_ID;
        }
      }

      // 1. If base64 image data is provided, save it as a real file in server/uploads/certificates/
      if (imageBase64 && imageBase64.includes("base64,")) {
        try {
          const match = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          const ext = match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'png';
          const base64Data = match ? match[2] : imageBase64;
          const cleanTitle = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
          const fileName = `cert_${actualPid}_${cleanTitle}_${Date.now()}.${ext}`;
          const filePath = path.join(__dirname, "..", "uploads", "certificates", fileName);
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          savedAssetPath = `/uploads/certificates/${fileName}`;
        } catch (err) {
          console.warn("[Save Image] Error writing image:", err.message);
        }
      } else if (!savedAssetPath) {
        savedAssetPath = `/uploads/certificates/default_${actualPid}.png`;
      }

      // Safe numeric ID generation from existing certificate rows
      const allCerts = await executeOracle("SELECT certificate_id FROM certificate");
      let maxCert = (allCerts.data || []).reduce((max, r) => {
        const n = parseInt((r.CERTIFICATE_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      maxCert += 1;
      const newCertId = "CERT" + String(maxCert).padStart(3, "0");

      // 1. Insert into Oracle CERTIFICATE table with certificate_type and saved image path
      await executeOracle(
        `INSERT INTO certificate (certificate_id, certificate_type, certificate_asset, admin_id, participant_id, issue_date)
         VALUES (:cid, :ctype, :asset, 'A001', :pid, SYSDATE)`,
        { cid: newCertId, ctype: name, asset: savedAssetPath, pid: actualPid }
      );

      // 2. Insert into Oracle VERIFY table with 'Pending'
      await executeOracle(
        `INSERT INTO verify (admin_id, certificate_id, verified_at, verification_status)
         VALUES ('A001', :cid, SYSDATE, 'Pending')`,
        { cid: newCertId }
      );

      // 3. Insert notification for participant
      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Certificate', SYSDATE)`,
        { msg: `[Participant: ${actualPid}] Your certificate "${name}" (${newCertId}) has been uploaded and submitted for Admin verification.` }
      );

      const fullAssetUrl = savedAssetPath.startsWith("http") ? savedAssetPath : `http://localhost:5000${savedAssetPath}`;

      return res.json({
        success: true,
        message: `Certificate "${name}" uploaded and submitted for admin verification!`,
        certificate: {
          id: newCertId,
          certId: newCertId,
          skill: name,
          asset: fullAssetUrl,
          status: "Pending",
          participant_id: actualPid
        }
      });
    }
  } catch (e) {
    console.warn("[Upload Cert] Error:", e.message);
  }

  const newCertId = "CERT" + String(mockStore.certificates.length + 1).padStart(3, "0");
  const fullAssetUrl = savedAssetPath.startsWith("http") ? savedAssetPath : `http://localhost:5000${savedAssetPath}`;
  const newCert = {
    id: mockStore.certificates.length + 1,
    certId: newCertId,
    skill: name,
    status: "Pending",
    participant_id: pid,
    asset: fullAssetUrl
  };
  mockStore.certificates.unshift(newCert);
  res.json({ success: true, message: `Certificate "${name}" submitted for admin verification!`, certificate: newCert });
});

// ==========================================
// PARTICIPANTS & PROFILES
// ==========================================
router.get("/participants", async (req, res) => {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const result = await executeOracle(
        `SELECT p.participant_id, p.email, p.admin_id, p.first_name, p.last_name, p.credit,
                CASE 
                  WHEN LOWER(TRIM(p.status)) = 'approved' THEN 'Approved'
                  WHEN LOWER(TRIM(p.status)) = 'active' THEN 'Approved'
                  WHEN LOWER(TRIM(p.status)) = 'newbie' THEN 'Approved'
                  WHEN LOWER(TRIM(p.status)) = 'expert' THEN 'Approved'
                  WHEN LOWER(TRIM(p.status)) = 'removed' THEN 'Removed'
                  ELSE 'Pending'
                END AS status,
                p.average_rating, p.address_house, p.address_road, p.address_area, p.address_city, p.address_district, p.address_division,
                TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
                (SELECT MIN(phone_number) FROM participant_phone WHERE participant_id = p.participant_id) AS phone
         FROM participant p
         ORDER BY p.participant_id`
      );
      if (result.data && result.data.length > 0) {
        const participants = result.data.map(p => ({
          participant_id: p.PARTICIPANT_ID,
          id: p.PARTICIPANT_ID,
          email: p.EMAIL,
          first_name: p.FIRST_NAME,
          last_name: p.LAST_NAME,
          credit: p.CREDIT,
          status: p.STATUS || "Pending",
          average_rating: p.AVERAGE_RATING,
          address_house: p.ADDRESS_HOUSE,
          address_road: p.ADDRESS_ROAD,
          address_area: p.ADDRESS_AREA,
          address_city: p.ADDRESS_CITY,
          district: p.ADDRESS_DISTRICT,
          division: p.ADDRESS_DIVISION,
          date_of_birth: p.DATE_OF_BIRTH,
          phone: p.PHONE || "+8801700000000"
        }));
        return res.json({ success: true, count: participants.length, participants });
      }
    }
  } catch (e) {
    console.warn("[Participants] Fallback to mock:", e.message);
  }
  res.json({ success: true, count: mockStore.participants.length, participants: mockStore.participants });
});

router.get("/participants/:id", async (req, res) => {
  const pid = (req.params.id || "P001").trim();
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const result = await executeOracle(
        `SELECT p.participant_id, p.first_name, p.last_name, p.email, p.credit, p.status,
                p.address_house, p.address_road, p.address_area, p.address_city, p.address_district, p.address_division,
                pp.phone_number,
                get_participant_credit_tier(p.participant_id) as tier,
                t_participant_address(p.address_house, p.address_road, p.address_area, p.address_city, p.address_district, p.address_division).get_formatted_address() as formatted_addr
         FROM participant p
         LEFT JOIN participant_phone pp ON p.participant_id = pp.participant_id
         WHERE UPPER(TRIM(p.participant_id)) = UPPER(TRIM('${pid}')) OR LOWER(TRIM(p.email)) = LOWER(TRIM('${pid}'))`
      );
      if (result.data && result.data.length > 0) {
        const row = result.data[0];
        let certs = [];
        try {
          const certRes = await executeOracle(
            `SELECT c.certificate_id, c.certificate_type, c.certificate_asset, s.skill_name, NVL(v.verification_status, 'Pending') AS status,
                    TO_CHAR(c.issue_date, 'YYYY-MM-DD') AS issue_date
             FROM certificate c
             LEFT JOIN verify v ON c.certificate_id = v.certificate_id
             LEFT JOIN updates u ON c.certificate_id = u.certificate_id AND c.participant_id = u.participant_id
             LEFT JOIN skill s ON u.skill_id = s.skill_id
             WHERE UPPER(TRIM(c.participant_id)) = UPPER(TRIM('${row.PARTICIPANT_ID || pid}'))
               AND (UPPER(TRIM(v.verification_status)) = 'ACCEPTED' OR UPPER(TRIM(v.verification_status)) = 'APPROVED')`
          );
          certs = certRes.data ? certRes.data.map(c => {
            const rawAsset = (c.CERTIFICATE_ASSET || c.certificate_asset || "").trim();
            let fullAssetUrl = "";
            if (rawAsset.startsWith("data:image/") || rawAsset.startsWith("http://") || rawAsset.startsWith("https://") || rawAsset.startsWith("/")) {
              fullAssetUrl = rawAsset;
            } else if (rawAsset.includes(".png") || rawAsset.includes(".jpg") || rawAsset.includes(".jpeg") || rawAsset.includes(".webp")) {
              fullAssetUrl = `/uploads/certificates/${rawAsset}`;
            } else {
              fullAssetUrl = `/uploads/certificates/default_${row.PARTICIPANT_ID || pid}.png`;
            }

            const title = c.CERTIFICATE_TYPE || c.certificate_type || c.SKILL_NAME || c.skill_name || cleanCertificateSkillTitle(rawAsset, "Verified Skill Certificate");
            return {
              certificate_id: c.CERTIFICATE_ID || c.certificate_id,
              certId: c.CERTIFICATE_ID || c.certificate_id,
              certificate_type: title,
              skill: title,
              name: title,
              asset: fullAssetUrl,
              issue_date: c.ISSUE_DATE || c.issue_date,
              status: c.STATUS || 'Accepted'
            };
          }) : [];
        } catch (err) {
          certs = [];
        }

        return res.json({
          success: true,
          participant: {
            ...row,
            participantId: row.PARTICIPANT_ID,
            firstName: row.FIRST_NAME,
            lastName: row.LAST_NAME,
            email: row.EMAIL,
            credit: row.CREDIT,
            creditPoints: row.CREDIT,
            status: row.STATUS,
            creditTier: row.TIER,
            formattedAddress: row.FORMATTED_ADDR,
            houseNo: row.ADDRESS_HOUSE,
            roadNo: row.ADDRESS_ROAD,
            area: row.ADDRESS_AREA,
            city: row.ADDRESS_CITY,
            district: row.ADDRESS_DISTRICT,
            division: row.ADDRESS_DIVISION,
            phone: row.PHONE_NUMBER || "+8801700000000",
            skillsCount: certs.length,
            certificates: certs
          }
        });
      }
    }
  } catch (e) {
    console.warn("[Participant Profile] Fallback to mock:", e.message);
  }

  const p = mockStore.participants.find(item => item.participant_id?.toLowerCase() === pid.toLowerCase() || item.email?.toLowerCase() === pid.toLowerCase()) || {
    participant_id: pid,
    first_name: "Learner",
    last_name: "User",
    email: pid,
    credit: 150,
    status: "Active",
    address_house: "1",
    address_road: "1",
    address_area: "Area",
    address_city: "City",
    address_district: "Dhaka",
    address_division: "Dhaka",
    date_of_birth: "01/01/2000"
  };
  const certs = mockStore.certificates
    .filter(c => c.participant_id === p.participant_id && (c.status === "Accepted" || c.status === "Approved"))
    .map(c => c.skill);

  res.json({
    success: true,
    participant: {
      ...p,
      firstName: p.first_name,
      lastName: p.last_name,
      creditPoints: p.credit,
      skillsCount: certs.length,
      creditTier: p.credit >= 700 ? "GOLD PRO (2x Multiplier)" : "SILVER SCHOLAR (1.5x Multiplier)",
      formattedAddress: `House #${p.address_house}, Road #${p.address_road}, ${p.address_area}, ${p.address_city}, ${p.address_district}`,
      certificates: certs
    }
  });
});

router.put("/participants/update", async (req, res) => {
  const { participantId, updates } = req.body;
  const pid = participantId || "P001";

  const fieldMapping = {
    firstName: 'first_name',
    lastName: 'last_name',
    dob: 'date_of_birth',
    division: 'address_division',
    district: 'address_district',
    city: 'address_city',
    area: 'address_area',
    roadNo: 'address_road',
    houseNo: 'address_house'
  };

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected && updates) {
      const setParts = [];
      const binds = { pid };

      Object.keys(updates).forEach(k => {
        if (k === 'dob' && updates.dob !== undefined) {
          setParts.push(`date_of_birth = ${parseDateToOracle(updates.dob)}`);
        } else {
          const dbField = fieldMapping[k];
          if (dbField && updates[k] !== undefined) {
            setParts.push(`${dbField} = :${dbField}`);
            binds[dbField] = updates[k];
          }
        }
      });

      if (setParts.length > 0) {
        await executeOracle(
          `UPDATE participant SET ${setParts.join(", ")} WHERE UPPER(participant_id) = UPPER(:pid) OR LOWER(email) = LOWER(:pid)`,
          binds
        );
      }

      if (updates.phone) {
        // Resolve actual PID first
        const pRes = await executeOracle(
          `SELECT participant_id FROM participant WHERE UPPER(participant_id) = UPPER(:pid) OR LOWER(email) = LOWER(:pid)`,
          { pid }
        );
        const resolvedPid = (pRes.data && pRes.data[0] && pRes.data[0].PARTICIPANT_ID) ? pRes.data[0].PARTICIPANT_ID : pid;

        const phoneCheck = await executeOracle(
          `SELECT COUNT(*) as cnt FROM participant_phone WHERE UPPER(participant_id) = UPPER(:resolvedPid)`,
          { resolvedPid }
        );
        if (phoneCheck.data && phoneCheck.data[0].CNT > 0) {
          await executeOracle(
            `UPDATE participant_phone SET phone_number = :phone WHERE UPPER(participant_id) = UPPER(:resolvedPid)`,
            { phone: updates.phone, resolvedPid }
          );
        } else {
          await executeOracle(
            `INSERT INTO participant_phone (participant_id, phone_number) VALUES (:resolvedPid, :phone)`,
            { resolvedPid, phone: updates.phone }
          );
        }
      }

      return res.json({ success: true, message: "Profile updated successfully in Oracle Database!" });
    }
  } catch (e) {
    console.warn("[Update Participant] Error:", e.message);
  }

  const p = mockStore.participants.find(item => item.participant_id === pid || item.email?.toLowerCase() === pid.toLowerCase());
  if (p && updates) {
    Object.assign(p, updates);
  }
  res.json({ success: true, message: "Participant profile updated!", participant: p });
});

router.post("/participants/:id/restrict-instructor", async (req, res) => {
  const targetPid = (req.params.id || "").trim();
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      // 1. Update participant status to 'Restricted_Instructor'
      await executeOracle(
        `UPDATE participant SET status = 'Restricted_Instructor' WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:id)) OR LOWER(TRIM(email)) = LOWER(TRIM(:id))`,
        { id: targetPid }
      );
      // 2. Unlist courses contributed by this instructor from public SkillHub catalog
      await executeOracle(
        `UPDATE content SET content_status = 'Unlisted' WHERE (UPPER(TRIM(participant_id)) = UPPER(TRIM(:id)) OR participant_id IN (SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:id)))) AND content_status = 'Approved'`,
        { id: targetPid }
      );
      return res.json({
        success: true,
        message: `Instructor privileges revoked for ${targetPid}. Contributed courses unlisted from public catalog, but user retains student access to purchased courses.`
      });
    }
  } catch (e) {
    console.warn("[Restrict Instructor] Error:", e.message);
  }

  const p = mockStore.participants.find(pt => pt.participant_id === targetPid || pt.email?.toLowerCase() === targetPid.toLowerCase());
  if (p) p.status = "Restricted_Instructor";

  return res.json({ success: true, message: `Instructor privileges revoked for ${targetPid}.` });
});

router.post("/courses/rate-lesson", async (req, res) => {
  const { participantId, courseId, lessonId, rating, comment } = req.body;
  const numRating = Math.max(1, Math.min(5, Number(rating) || 5));
  const rawPid = (participantId || "P001").trim();
  const cid = (courseId || "C001").trim();
  const lesId = (lessonId || "1").trim();
  const commentText = (comment || "Great lesson").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // Generate Feedback ID
      const allFb = await executeOracle("SELECT feedback_id FROM feedback");
      let maxFb = (allFb.data || []).reduce((max, r) => {
        const n = parseInt((r.FEEDBACK_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newFid = "FB" + String(maxFb + 1).padStart(3, "0");

      // 1. Insert into FEEDBACK table
      await executeOracle(
        `INSERT INTO feedback (feedback_id, comment_text, rating, admin_id)
         VALUES (:fid, :comm, :rat, 'A001')`,
        { fid: newFid, comm: `[Lesson ${lesId}] ${commentText}`, rat: numRating }
      );

      // 2. Insert into GIVES table
      await executeOracle(
        `INSERT INTO gives (participant_id, course_id, feedback_id)
         VALUES (:pid, :cid, :fid)`,
        { pid: actualPid, cid, fid: newFid }
      ).catch(() => {});

      // 3. Compute Course Average Rating
      const courseAvgRes = await executeOracle(
        `SELECT ROUND(AVG(f.rating), 2) as avg_course_rating
         FROM feedback f
         JOIN gives g ON f.feedback_id = g.feedback_id
         WHERE UPPER(g.course_id) = UPPER(:cid)`,
        { cid }
      );
      const courseAvg = (courseAvgRes.data && courseAvgRes.data[0] && courseAvgRes.data[0].AVG_COURSE_RATING)
        ? Number(courseAvgRes.data[0].AVG_COURSE_RATING)
        : numRating;

      // 4. Query instructor average rating (automatically synchronized by Oracle trigger trg_sync_rating_on_gives)
      const instRes = await executeOracle(
        `SELECT p.average_rating 
         FROM participant p
         JOIN course c ON UPPER(p.participant_id) = UPPER(c.participant_id)
         WHERE UPPER(c.course_id) = UPPER(:cid)`,
        { cid }
      );
      const instAvg = (instRes.data && instRes.data[0] && instRes.data[0].AVERAGE_RATING != null)
        ? Number(instRes.data[0].AVERAGE_RATING)
        : courseAvg;

      return res.json({
        success: true,
        message: `Thank you! Your rating (${numRating}★) for Lesson ${lesId} has been recorded.`,
        courseRating: courseAvg,
        instructorRating: instAvg
      });
    }
  } catch (err) {
    console.warn("[Rate Lesson Error]:", err.message);
  }

  return res.json({ success: true, message: `Rating (${numRating}★) recorded!`, courseRating: numRating });
});

router.delete("/participants/:id", async (req, res) => {
  const targetId = req.params.id;
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      // Soft-restrict to avoid foreign key cascades while removing platform access
      await executeOracle(
        `UPDATE participant SET status = 'Removed' WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:id)) OR LOWER(TRIM(email)) = LOWER(TRIM(:id))`,
        { id: targetId }
      );
      return res.json({ success: true, message: `Participant ${targetId} removed.` });
    }
  } catch (e) {
    console.warn("[Delete Participant] Fallback to mock:", e.message);
  }

  const idx = mockStore.participants.findIndex(p => p.participant_id === targetId || p.email?.toLowerCase() === targetId.toLowerCase());
  if (idx > -1) mockStore.participants[idx].status = "Removed";
  res.json({ success: true, message: "Participant removed." });
});

// ==========================================
// ENROLLMENTS
// ==========================================
router.get("/enrollments", async (req, res) => {
  const pid = (req.query.participantId || req.query.email || "").trim();
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let sql = `
        SELECT e.participant_id, e.course_id, TO_CHAR(e.enroll_date, 'YYYY-MM-DD') AS enroll_date,
               c.course_title, c.course_level, c.price,
               p.first_name, p.last_name, p.email,
               p.first_name || ' ' || p.last_name as participant_name,
               NVL(pr.total_lesson, 1) as total_lesson,
               NVL(pr.completed_lesson, 0) as completed_lesson,
               NVL(pr.progress_percentage, 0) as progress_percentage
        FROM enrolls e
        JOIN course c ON e.course_id = c.course_id
        JOIN participant p ON e.participant_id = p.participant_id
        LEFT JOIN progress pr ON c.progress_id = pr.progress_id
      `;
      if (pid) {
        sql += ` WHERE UPPER(TRIM(e.participant_id)) = UPPER(TRIM('${pid}')) OR LOWER(TRIM(p.email)) = LOWER(TRIM('${pid}'))`;
      }
      sql += ` ORDER BY e.enroll_date DESC`;

      const result = await executeOracle(sql);
      if (result.data) {
        const enrollments = result.data.map(e => {
          const total = Number(e.TOTAL_LESSON) || 1;
          const completed = Number(e.COMPLETED_LESSON) || 0;
          const pct = (total > 0 && completed >= total) ? 100 : Number(e.PROGRESS_PERCENTAGE) || Math.min(100, Math.round((completed / Math.max(1, total)) * 100));
          const isDone = pct >= 100 || (total > 0 && completed >= total);
          return {
            participant_id: e.PARTICIPANT_ID,
            participantId: e.PARTICIPANT_ID,
            course_id: e.COURSE_ID,
            courseId: e.COURSE_ID,
            course_title: e.COURSE_TITLE,
            courseTitle: e.COURSE_TITLE,
            level: e.COURSE_LEVEL || "Intermediate",
            price: e.PRICE,
            enrollDate: e.ENROLL_DATE,
            participantName: e.PARTICIPANT_NAME || `${e.FIRST_NAME || ''} ${e.LAST_NAME || ''}`.trim(),
            email: e.EMAIL,
            totalClasses: total,
            total_classes: total,
            totalLessons: total,
            completedLessons: completed,
            completed_lessons: completed,
            progress: pct,
            progressPercentage: pct,
            is_completed: isDone ? 1 : 0,
            completed: isDone,
            status: isDone ? "Completed" : (completed > 0 ? "In Progress" : "Enrolled")
          };
        });
        return res.json({ success: true, count: enrollments.length, enrollments });
      }
    }
  } catch (e) {
    console.warn("[Enrollments] Fallback to mock:", e.message);
  }

  const enrollments = mockStore.enrolls
    .filter(e => !pid || e.participant_id === pid)
    .map(e => {
      const course = mockStore.courses.find(c => c.course_id === e.course_id);
      const participant = mockStore.participants.find(p => p.participant_id === e.participant_id);
      return {
        ...e,
        course_id: e.course_id,
        courseId: e.course_id,
        course_title: course ? course.course_title : "Unknown",
        courseTitle: course ? course.course_title : "Unknown",
        participant_name: participant ? `${participant.first_name} ${participant.last_name}` : "Unknown"
      };
    });
  res.json({ success: true, count: enrollments.length, enrollments });
});

// ==========================================
// REPORTS & FEEDBACK
// ==========================================
router.get("/reports", async (req, res) => {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const result = await executeOracle(`SELECT * FROM v_course_analytics ORDER BY course_id`);
      if (result.data && result.data.length > 0) {
        const reports = result.data.map((r, i) => ({
          id: String(i + 1).padStart(2, "0"),
          courseId: r.COURSE_ID,
          courseName: r.COURSE_TITLE,
          instructorName: r.INSTRUCTOR_NAME,
          instructorEmail: r.INSTRUCTOR_EMAIL,
          courseRating: r.AVG_COURSE_RATING != null ? Number(r.AVG_COURSE_RATING) : 4.5,
          instructorAvgRating: r.INSTRUCTOR_AVG_RATING != null ? Number(r.INSTRUCTOR_AVG_RATING) : (r.AVG_COURSE_RATING || 4.5),
          skillName: r.SKILL_NAME,
          skillTier: r.SKILL_TIER,
          price: r.PRICE,
          totalEnrolled: r.TOTAL_ENROLLED_STUDENTS,
          progressPercentage: r.PROGRESS_PERCENTAGE
        }));
        return res.json({ success: true, reports });
      }
    }
  } catch (e) {
    console.warn("[Reports] Fallback to mock:", e.message);
  }

  const reports = mockStore.feedbacks.map((f, i) => {
    const course = mockStore.courses.find(c => c.course_id === f.course_id);
    return {
      id: String(i + 1).padStart(2, "0"),
      courseId: f.course_id,
      courseName: course ? course.course_title : "Course " + (i + 1),
      instructorName: f.instructor_name || "Instructor",
      courseRating: f.rating,
      instructorAvgRating: (f.rating * 0.98).toFixed(1)
    };
  });
  res.json({ success: true, reports });
});

router.post("/feedback", async (req, res) => {
  const { participantId, courseId, rating, comment } = req.body;
  const rawPid = (participantId || "P001").trim();
  const cid = (courseId || "C001").trim();
  const numRating = Math.max(1, Math.min(5, Number(rating) || 5));

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // Check if participant is enrolled in this course
      const enrollCheck = await executeOracle(
        `SELECT COUNT(*) as cnt FROM enrolls WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:pid)) AND UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`,
        { pid: actualPid, cid }
      );

      if (!enrollCheck.data || enrollCheck.data[0].CNT === 0) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course to leave feedback and rating."
        });
      }

      const allF = await executeOracle("SELECT feedback_id FROM feedback");
      let maxF = (allF.data || []).reduce((max, r) => {
        const n = parseInt((r.FEEDBACK_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newFid = "F" + String(maxF + 1).padStart(3, "0");

      await executeOracle(
        `INSERT INTO feedback (feedback_id, comment_text, rating, admin_id) VALUES (:fid, :comment, :rating, 'A001')`,
        { fid: newFid, comment: comment || "Great course!", rating: numRating }
      );
      await executeOracle(
        `INSERT INTO gives (participant_id, course_id, feedback_id) VALUES (:pid, :cid, :fid)`,
        { pid: actualPid, cid, fid: newFid }
      );
      return res.json({ success: true, message: "Feedback submitted successfully!", feedbackId: newFid });
    }
  } catch (e) {
    console.warn("[Feedback] Fallback to mock:", e.message);
  }

  const newFid = "F" + String(mockStore.feedbacks.length + 1).padStart(3, "0");
  mockStore.feedbacks.push({
    feedback_id: newFid,
    comment_text: comment,
    rating: numRating,
    course_id: cid,
    instructor_name: "Instructor"
  });
  res.json({ success: true, message: "Feedback submitted successfully!", feedbackId: newFid });
});

router.delete("/courses/:id", async (req, res) => {
  const targetId = req.params.id;
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualCid = targetId;
      const cCheck = await executeOracle(
        `SELECT course_id FROM course WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:t)) OR UPPER(TRIM(course_title)) = UPPER(TRIM(:t))`,
        { t: targetId }
      );
      if (cCheck.data && cCheck.data[0]) {
        actualCid = cCheck.data[0].COURSE_ID;
      }

      // 1. Fetch related feedback IDs to delete orphan feedback records
      const fRes = await executeOracle(
        `SELECT feedback_id FROM gives WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`,
        { cid: actualCid }
      ).catch(() => ({ data: [] }));
      const feedbackIds = (fRes.data || []).map(r => r.FEEDBACK_ID).filter(Boolean);

      await executeOracle(`DELETE FROM gives WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      for (const fid of feedbackIds) {
        await executeOracle(`DELETE FROM feedback WHERE feedback_id = :fid`, { fid }).catch(() => {});
      }

      await executeOracle(`DELETE FROM attempts WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      await executeOracle(`DELETE FROM exam WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      await executeOracle(`DELETE FROM enrolls WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      await executeOracle(`DELETE FROM course_asset WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      await executeOracle(`DELETE FROM uploads WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      await executeOracle(`DELETE FROM course WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid });
      return res.json({ success: true, message: `Course ${actualCid} permanently deleted from SkillHub and Database.` });
    }
  } catch (e) {
    console.warn("[Delete Course] Fallback to mock:", e.message);
  }

  const cIdx = mockStore.courses.findIndex(c => c.course_id === targetId || c.id === targetId);
  if (cIdx > -1) mockStore.courses.splice(cIdx, 1);
  res.json({ success: true, message: `Course ${targetId} removed.` });
});

router.delete("/reports/course/:id", async (req, res) => {
  const targetId = req.params.id;
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualCid = targetId;
      const cCheck = await executeOracle(
        `SELECT course_id FROM course WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:t)) OR UPPER(TRIM(course_title)) = UPPER(TRIM(:t))`,
        { t: targetId }
      );
      if (cCheck.data && cCheck.data[0]) {
        actualCid = cCheck.data[0].COURSE_ID;
      }

      // Fetch related feedback IDs to clean up orphan feedback
      const fRes = await executeOracle(
        `SELECT feedback_id FROM gives WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`,
        { cid: actualCid }
      ).catch(() => ({ data: [] }));
      const feedbackIds = (fRes.data || []).map(r => r.FEEDBACK_ID).filter(Boolean);

      await executeOracle(`DELETE FROM gives WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      for (const fid of feedbackIds) {
        await executeOracle(`DELETE FROM feedback WHERE feedback_id = :fid`, { fid }).catch(() => {});
      }

      await executeOracle(`DELETE FROM attempts WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      await executeOracle(`DELETE FROM exam WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid }).catch(() => {});
      await executeOracle(`DELETE FROM enrolls WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid });
      await executeOracle(`DELETE FROM course_asset WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid });
      await executeOracle(`DELETE FROM uploads WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid });
      await executeOracle(`DELETE FROM course WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`, { cid: actualCid });
      return res.json({ success: true, message: `Course ${actualCid} deleted from reports and SkillHub.` });
    }
  } catch (e) {
    console.warn("[Reports] Delete course fallback:", e.message);
  }

  const idx = mockStore.feedbacks.findIndex(f => String(f.course_id) === String(targetId) || String(f.id) === String(targetId));
  if (idx !== -1) mockStore.feedbacks.splice(idx, 1);
  const cIdx = mockStore.courses.findIndex(c => c.course_id === targetId || c.id === targetId);
  if (cIdx > -1) mockStore.courses.splice(cIdx, 1);

  res.json({ success: true, message: `Course ${targetId} removed.` });
});

router.delete("/reports/instructor/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      await executeOracle(
        `DELETE FROM gives g WHERE g.course_id IN (SELECT c.course_id FROM course c WHERE c.participant_id = :id)`,
        { id }
      );
      return res.json({ success: true, message: "Instructor report deleted" });
    }
  } catch (e) {
    console.warn("[Reports] Delete instructor fallback:", e.message);
  }

  res.json({ success: true, message: "Instructor report deleted" });
});

// ==========================================
// MONITOR (ADMIN)
// ==========================================
router.get("/monitor", async (req, res) => {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const result = await executeOracle(
        `SELECT p.participant_id, p.first_name, p.last_name, p.email, p.credit, p.average_rating,
                p.address_house, p.address_road, p.address_area, p.address_city, p.address_district, p.address_division,
                TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS dob,
                CASE 
                  WHEN LOWER(TRIM(p.status)) = 'approved' THEN 'Approved'
                  WHEN LOWER(TRIM(p.status)) = 'active' THEN 'Approved'
                  WHEN LOWER(TRIM(p.status)) = 'newbie' THEN 'Approved'
                  WHEN LOWER(TRIM(p.status)) = 'expert' THEN 'Approved'
                  WHEN LOWER(TRIM(p.status)) = 'removed' THEN 'Removed' 
                  ELSE 'Pending' 
                END AS status,
                t_participant_address(p.address_house, p.address_road, p.address_area, p.address_city, p.address_district, p.address_division).get_formatted_address() AS formatted_adt_address,
                t_participant_address(p.address_house, p.address_road, p.address_area, p.address_city, p.address_district, p.address_division).get_short_location() AS short_location,
                (SELECT MIN(phone_number) FROM participant_phone WHERE participant_id = p.participant_id) AS phone
         FROM participant p
         ORDER BY CASE 
           WHEN LOWER(TRIM(p.status)) NOT IN ('approved', 'active', 'newbie', 'expert', 'removed') THEN 0
           WHEN LOWER(TRIM(p.status)) = 'pending' THEN 0 
           ELSE 1 
         END, p.participant_id`
      );
      if (result.data && result.data.length > 0) {
        const seen = new Set();
        const users = [];
        for (const p of result.data) {
          const pid = p.PARTICIPANT_ID;
          if (!pid || seen.has(pid)) continue;
          seen.add(pid);

          let normalizedStatus = "Pending";
          const st = (p.STATUS || p.status || "").toLowerCase().trim();
          if (st === "approved" || st === "active" || st === "newbie" || st === "expert") normalizedStatus = "Approved";
          else if (st === "removed") normalizedStatus = "Removed";
          else normalizedStatus = "Pending";

          users.push({
            id: pid,
            firstName: p.FIRST_NAME,
            lastName: p.LAST_NAME,
            email: p.EMAIL,
            phone: p.PHONE || "+8801700000000",
            altPhone: "",
            dob: p.DOB || p.DATE_OF_B || (p.DATE_OF_BIRTH ? String(p.DATE_OF_BIRTH).slice(0, 10) : "2000-01-01"),
            houseNo: p.ADDRESS_HOUSE || "12",
            roadNo: p.ADDRESS_ROAD || "Mirpur Road",
            area: p.ADDRESS_AREA || "Mirpur",
            city: p.ADDRESS_CITY || "Dhaka",
            district: p.ADDRESS_DISTRICT || "Dhaka",
            division: p.ADDRESS_DIVISION || "Dhaka",
            formattedAddress: p.FORMATTED_ADT_ADDRESS,
            credit: p.CREDIT,
            status: normalizedStatus
          });
        }
        users.sort((a, b) => {
          const aPending = (a.status || '').toLowerCase() === 'pending';
          const bPending = (b.status || '').toLowerCase() === 'pending';
          if (aPending && !bPending) return -1;
          if (!aPending && bPending) return 1;
          return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' });
        });
        return res.json({ success: true, count: users.length, users });
      }
    }
  } catch (e) {
    console.warn("[Monitor] Fallback to mock:", e.message);
  }

  const seen = new Set();
  const users = [];
  for (const p of mockStore.participants) {
    if (!p.participant_id || seen.has(p.participant_id)) continue;
    seen.add(p.participant_id);

    let normalizedStatus = "Pending";
    const st = (p.status || "").toLowerCase().trim();
    if (st === "approved" || st === "active") normalizedStatus = "Approved";
    else if (st === "removed") normalizedStatus = "Removed";
    else normalizedStatus = "Pending";

    users.push({
      id: p.participant_id,
      firstName: p.first_name,
      lastName: p.last_name,
      email: p.email,
      phone: p.phone || "+8801700000000",
      altPhone: "",
      dob: p.date_of_birth || "2000-01-01",
      houseNo: p.address_house,
      roadNo: p.address_road,
      area: p.address_area,
      city: p.address_city,
      district: p.address_district,
      division: p.address_division,
      status: normalizedStatus
    });
  }
  users.sort((a, b) => {
    const aPending = (a.status || '').toLowerCase() === 'pending';
    const bPending = (b.status || '').toLowerCase() === 'pending';
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' });
  });
  res.json({ success: true, count: users.length, users });
});

router.post("/monitor/update-status", async (req, res) => {
  const { userId, newStatus } = req.body;
  let normalizedStatus = "Approved";
  const incoming = (newStatus || "").toLowerCase().trim();
  if (incoming === "removed") normalizedStatus = "Removed";
  else if (incoming === "pending") normalizedStatus = "Pending";
  else normalizedStatus = "Approved";

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      await executeOracle(
        `UPDATE participant SET status = :status WHERE UPPER(TRIM(participant_id)) = UPPER(TRIM(:pid))`,
        { status: normalizedStatus, pid: userId }
      );
      try {
        await executeOracle(
          `MERGE INTO monitor m
           USING (SELECT :pid AS participant_id FROM dual) src
           ON (m.participant_id = src.participant_id)
           WHEN MATCHED THEN
             UPDATE SET m.monitor_status = :mstatus, m.monitored_at = SYSDATE
           WHEN NOT MATCHED THEN
             INSERT (participant_id, admin_id, monitor_status, monitored_at)
             VALUES (:pid, 'A001', :mstatus, SYSDATE)`,
          { pid: userId, mstatus: normalizedStatus }
        );
      } catch (errM) {
        // Ignore if monitor table differs
      }
      return res.json({ success: true, message: `Participant ${userId} status updated to "${normalizedStatus}".` });
    }
  } catch (e) {
    console.warn("[Update Status] Fallback to mock:", e.message);
  }

  const user = mockStore.participants.find(p => p.participant_id === userId);
  if (user) {
    user.status = normalizedStatus;
  }
  res.json({ success: true, message: `Participant ${userId} status updated to "${normalizedStatus}".`, user });
});

// ==========================================
// NOTIFICATIONS
// ==========================================
router.get("/notifications", async (req, res) => {
  const rawPid = (req.query.participantId || req.query.pid || "").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid && (rawPid.includes("@") || !rawPid.startsWith("P"))) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) {
          actualPid = pCheck.data[0].PARTICIPANT_ID;
        }
      }

      const cleanPidLower = (actualPid || "").toLowerCase();

      const result = await executeOracle(
        `SELECT notification_id, message, type,
                TO_CHAR(generated_at, 'YYYY-MM-DD HH24:MI:SS') AS gen_time
         FROM notification
         ORDER BY generated_at DESC`
      );

      if (result.data) {
        let filteredRows = [];

        if (cleanPidLower) {
          filteredRows = result.data.filter(n => {
            const rawMsg = (n.MESSAGE || "").toLowerCase();
            // Match explicitly targeted notifications
            if (rawMsg.includes(`[participant: ${cleanPidLower}]`) || rawMsg.includes(`[participant:${cleanPidLower}]`)) {
              return true;
            }
            // Match global announcements
            if (rawMsg.startsWith("[global]") || rawMsg.startsWith("[broadcast]") || rawMsg.startsWith("[announcement]")) {
              return true;
            }
            return false;
          });

          // If no notifications exist yet for this individual, generate a personalized welcome notice
          if (filteredRows.length === 0) {
            filteredRows = [
              {
                NOTIFICATION_ID: `WELCOME_${actualPid || 'USER'}`,
                MESSAGE: `Welcome to SkillChain! Explore courses in SkillHub to enroll and learn, or contribute content to start earning reward credits.`,
                TYPE: "info",
                GEN_TIME: "Just now"
              }
            ];
          }
        } else {
          // If no participant specified (admin / system query), show all
          filteredRows = result.data;
        }

        const notifications = filteredRows.map((n, i) => {
          const rawType = (n.TYPE || "info").toLowerCase();
          let mappedType = "info";
          let tag = n.TYPE || "System Notice";

          if (rawType.includes("enroll") || rawType.includes("success") || rawType.includes("cert") || rawType.includes("complete") || rawType.includes("reward")) {
            mappedType = "success";
            if (rawType.includes("enroll")) tag = "Course Enrollment";
            else if (rawType.includes("cert")) tag = "Certificate Verified";
            else if (rawType.includes("complete")) tag = "Course Completed";
            else tag = "Reward & Approval";
          } else if (rawType.includes("exam") || rawType.includes("warn") || rawType.includes("test") || rawType.includes("reject")) {
            mappedType = "warning";
            tag = rawType.includes("reject") ? "Review Notice" : "Exam & Assessment";
          } else if (rawType.includes("prog") || rawType.includes("lesson")) {
            mappedType = "info";
            tag = "Learning Progress";
          } else if (rawType.includes("content") || rawType.includes("review") || rawType.includes("course")) {
            mappedType = "info";
            tag = "Community Contribution";
          }

          let formattedTime = "Recently";
          if (n.GEN_TIME) {
            formattedTime = n.GEN_TIME;
          }

          // Strip [Participant: PID] or [Global] prefix for clean UI presentation
          const cleanMessage = (n.MESSAGE || "Platform Notification")
            .replace(/^\[(Participant:\s*[^\]]+|Global|Broadcast|Announcement)\]\s*/i, "")
            .trim();

          return {
            id: n.NOTIFICATION_ID || `N${i + 1}`,
            type: mappedType,
            tag: tag,
            message: cleanMessage,
            time: formattedTime,
            isUnread: i < 3
          };
        });

        return res.json({ success: true, count: notifications.length, notifications });
      }
    }
  } catch (e) {
    console.warn("[Notifications] Fallback to mock:", e.message);
  }

  // Fallback mode
  const cleanPid = (rawPid || "").toLowerCase();
  let mockList = mockStore.notifications || [];
  if (cleanPid) {
    mockList = mockList.filter(n => {
      const msg = (n.message || "").toLowerCase();
      if (msg.includes(`[participant: ${cleanPid}]`) || msg.includes(`[participant:${cleanPid}]`)) return true;
      if (n.participant_id && n.participant_id.toLowerCase() === cleanPid) return true;
      if (n.isGlobal) return true;
      return false;
    });
    if (mockList.length === 0) {
      mockList = [
        {
          id: 1,
          type: "info",
          tag: "Welcome to SkillChain",
          message: "Welcome! Explore courses in SkillHub to enroll and learn, or contribute content to start earning reward credits.",
          time: "Just now",
          isUnread: true
        }
      ];
    }
  }

  res.json({ success: true, count: mockList.length, notifications: mockList });
});

router.post("/notifications", async (req, res) => {
  const { title, message, type } = req.body;
  const newNid = "N" + String(Date.now()).slice(-4);
  const msgType = type || "Info";

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES (:nid, :msg, :type, SYSDATE)`,
        { nid: newNid, msg: message || title, type: msgType }
      );
      return res.json({ success: true, message: "Notification delivered!" });
    }
  } catch (e) {
    console.warn("[Notification] Fallback to mock:", e.message);
  }

  mockStore.notifications.unshift({
    id: mockStore.notifications.length + 1,
    type: type || "info",
    tag: title || "Notification",
    message: message,
    time: "Just now",
    isUnread: true
  });
  res.json({ success: true, message: "Notification sent!" });
});

// ==========================================
// EXAMS & ASSESSMENTS
// ==========================================
const courseQuestions = {
  default: [
    {
      id: 1,
      question: "What is the primary benefit of using a credit-based decentralized learning platform?",
      options: ["Peer-to-peer knowledge sharing without monetary barriers", "Eliminating database schemas", "Ignoring security credentials", "Mandatory monthly subscriptions"],
      correct: 0
    },
    {
      id: 2,
      question: "How are participant rewards computed upon course completion or contribution?",
      options: ["Manually on paper", "Automatically credited via verified database transactions", "Randomly assigned weekly", "Only admins get credits"],
      correct: 1
    },
    {
      id: 3,
      question: "Which component ensures relational integrity in Oracle Database?",
      options: ["Primary and Foreign Key Constraints", "Inline HTML tags", "Client local storage", "CSS selectors"],
      correct: 0
    },
    {
      id: 4,
      question: "What status must a course achieve before becoming publicly available in SkillHub?",
      options: ["Draft", "Pending", "Approved", "Archived"],
      correct: 2
    },
    {
      id: 5,
      question: "What happens when a participant completes all lessons in an enrolled course?",
      options: ["Progress reaches 100% and certification exam unlocks", "Account is deleted", "Course price is doubled", "Nothing happens"],
      correct: 0
    }
  ],
  "C001": [
    { id: 1, question: "Which C++ concept enables compile-time polymorphism?", options: ["Templates & Function Overloading", "Virtual Functions", "Dynamic Cast", "friend functions"], correct: 0 },
    { id: 2, question: "What is the primary purpose of RAII in modern C++?", options: ["Resource management via object lifetime", "Rapid Animation In Interface", "Rendering Audio In Internet", "Reducing Array Indices"], correct: 0 },
    { id: 3, question: "Which standard container provides contiguous memory storage in C++?", options: ["std::vector", "std::list", "std::set", "std::map"], correct: 0 },
    { id: 4, question: "What does std::move do in C++11?", options: ["Casts an lvalue to an rvalue reference", "Physically copies bytes", "Deallocates pointer memory", "Initializes a thread"], correct: 0 },
    { id: 5, question: "Which smart pointer maintains exclusive ownership of a resource?", options: ["std::unique_ptr", "std::shared_ptr", "std::weak_ptr", "std::auto_ptr"], correct: 0 }
  ],
  "C002": [
    { id: 1, question: "What is the main role of the Virtual DOM in React?", options: ["Minimizes direct DOM manipulations for high rendering performance", "Replaces CSS stylesheets", "Stores SQL tables in memory", "Bypasses browser rendering engine"], correct: 0 },
    { id: 2, question: "Which React hook is used to manage side-effects such as API calls?", options: ["useEffect", "useState", "useMemo", "useContext"], correct: 0 },
    { id: 3, question: "In Express.js, what does the middleware 'next()' function do?", options: ["Passes control to the next middleware handler in stack", "Restarts the server", "Commits a database transaction", "Terminates the HTTP request immediately"], correct: 0 },
    { id: 4, question: "What is the purpose of CORS headers in REST APIs?", options: ["Control cross-origin resource access in browsers", "Encrypt SQL strings", "Generate random JWT tokens", "Format JSON outputs"], correct: 0 },
    { id: 5, question: "Which HTTP method should be used for idempotent full resource updates?", options: ["PUT", "POST", "PATCH", "DELETE"], correct: 0 }
  ],
  "C003": [
    { id: 1, question: "Which Python library is primary for numerical operations on multidimensional arrays?", options: ["NumPy", "Flask", "Matplotlib", "BeautifulSoup"], correct: 0 },
    { id: 2, question: "What does the Pandas `groupby()` operation achieve?", options: ["Splits data into groups based on criteria for aggregation", "Sorts array in descending order", "Deletes null columns", "Encrypts strings"], correct: 0 },
    { id: 3, question: "Which metric evaluates classification model accuracy under class imbalance?", options: ["F1-Score and ROC-AUC", "Mean Squared Error", "R-squared", "Sum of Residuals"], correct: 0 },
    { id: 4, question: "In Scikit-Learn, what method fits data and transforms features simultaneously?", options: ["fit_transform()", "train_predict()", "execute_pipeline()", "compile()"], correct: 0 },
    { id: 5, question: "What is the role of cross-validation in machine learning?", options: ["Assessing model generalizability and preventing overfitting", "Speeding up CPU clocks", "Visualizing 3D charts", "Formatting data to JSON"], correct: 0 }
  ],
  "C004": [
    { id: 1, question: "Which PL/SQL block structure handles runtime errors gracefully?", options: ["EXCEPTION WHEN ... THEN", "CATCH ... FINALLY", "TRY ... RECOVER", "ON ERROR GOTO"], correct: 0 },
    { id: 2, question: "What is the main difference between a Function and a Procedure in Oracle PL/SQL?", options: ["A function must return a value; a procedure does not need to", "Procedures cannot take parameters", "Functions cannot be called in PL/SQL", "They are 100% identical"], correct: 0 },
    { id: 3, question: "Which trigger type executes once for each row modified by a DML statement?", options: ["FOR EACH ROW trigger", "STATEMENT trigger", "INSTEAD OF trigger", "SYSTEM trigger"], correct: 0 },
    { id: 4, question: "What does the COMMIT statement do in Oracle Database?", options: ["Permanently saves all pending transactional changes to database", "Undoes all current operations", "Closes database connection", "Deletes active session"], correct: 0 },
    { id: 5, question: "Which SQL clause restricts rows after an aggregate GROUP BY operation?", options: ["HAVING", "WHERE", "ORDER BY", "QUALIFY"], correct: 0 }
  ]
};

router.get("/exams", async (req, res) => {
  const rawPid = (req.query.participantId || req.query.pid || "P001").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // 1. Fetch completed attempts for participant from Oracle ATTEMPTS table
      const attemptsRes = await executeOracle(
        `SELECT a.exam_id, a.course_id, a.score, TO_CHAR(a.attempt_date, 'YYYY-MM-DD HH24:MI:SS') as attempt_date,
                c.course_title
         FROM attempts a
         LEFT JOIN course c ON a.course_id = c.course_id
         WHERE UPPER(a.participant_id) = UPPER(:pid)
         ORDER BY a.attempt_date DESC`,
        { pid: actualPid }
      );

      const completed = (attemptsRes.data || []).map((att, idx) => ({
        id: idx + 1,
        examId: att.EXAM_ID,
        courseId: att.COURSE_ID,
        title: att.COURSE_TITLE || `Assessment - ${att.COURSE_ID || 'Course'}`,
        duration: "30 mins",
        score: att.SCORE,
        attemptDate: att.ATTEMPT_DATE || "Recently"
      }));

      // 2. Fetch enrolled courses for this participant joined with EXAM and PROGRESS tables
      const enrolledRes = await executeOracle(
        `SELECT e.course_id, c.course_title, c.course_level,
                ex.exam_id, ex.exam_url, ex.exam_duration, ex.exam_status,
                NVL((SELECT COUNT(*) FROM course_asset ca WHERE ca.course_id = c.course_id), 5) as total_lessons,
                0 as completed_lessons,
                0 as progress_percentage
         FROM enrolls e
         JOIN course c ON e.course_id = c.course_id
         LEFT JOIN exam ex ON c.course_id = ex.course_id
         LEFT JOIN progress p ON c.progress_id = p.progress_id
         WHERE UPPER(e.participant_id) = UPPER(:pid)
         ORDER BY e.enroll_date DESC`,
        { pid: actualPid }
      );

      const enrolledList = enrolledRes.data || [];
      const completedCourseIds = new Set((attemptsRes.data || []).map(a => a.COURSE_ID));

      const availableExams = enrolledList.map((enr, idx) => {
        const cid = enr.COURSE_ID;
        const cTitle = enr.COURSE_TITLE || `Course ${cid}`;
        const durNum = Number(enr.EXAM_DURATION) || 30;
        const totalL = Number(enr.TOTAL_LESSONS) || 1;
        const completedL = Number(enr.COMPLETED_LESSONS) || 0;
        const progressPct = Number(enr.PROGRESS_PERCENTAGE) || (totalL > 0 ? Math.round((completedL / totalL) * 100) : 0);
        const isUnlocked = progressPct >= 100 || completedL >= totalL;
        
        let questions = courseQuestions[cid];
        if (!questions) {
          questions = [
            { id: 1, question: `What is the core foundational concept covered in ${cTitle}?`, options: [`Core architecture and essential best practices in ${cTitle}`, "Deleting database tables without backups", "Ignoring software design patterns", "Disabling compiler type checking"], correct: 0 },
            { id: 2, question: `Which methodology is recommended when building scalable solutions in ${cTitle}?`, options: ["Modular component architecture and clean separation of concerns", "Hardcoding all runtime parameters", "Skipping error handling routines", "Avoiding unit and integration testing"], correct: 0 },
            { id: 3, question: `How should runtime exceptions and edge cases be handled in ${cTitle}?`, options: ["Structured error boundaries and validated fallback mechanisms", "Ignoring exceptions silently", "Restarting the hardware", "Removing all constraints"], correct: 0 },
            { id: 4, question: `What is the primary indicator of successful implementation in ${cTitle}?`, options: ["Robust test coverage, high performance, and reliable execution", "Zero lines of code written", "Bypassing authentication and authorization", "Slow rendering loops"], correct: 0 },
            { id: 5, question: `What reward is granted upon achieving passing grade in this ${cTitle} assessment?`, options: ["Official SkillChain certification verification and +50 bonus credits", "No record stored in Oracle DB", "Loss of course access", "Resetting account history"], correct: 0 }
          ];
        }

        return {
          id: enr.EXAM_ID || `EXAM_${cid}`,
          examId: enr.EXAM_ID || `EXAM_${cid}`,
          courseId: cid,
          title: `${cTitle} - Certification Assessment`,
          courseTitle: cTitle,
          level: enr.COURSE_LEVEL || 'Intermediate',
          duration: `${durNum} minutes`,
          durationMinutes: durNum,
          examUrl: enr.EXAM_URL || '',
          totalQuestions: questions.length,
          questions,
          isCompleted: completedCourseIds.has(cid),
          isUnlocked,
          progressPercentage: progressPct,
          completedLessons: completedL,
          totalLessons: totalL
        };
      });

      const pendingList = availableExams.filter(e => !e.isCompleted);
      const pendingExam = pendingList[0] || (availableExams.length > 0 ? availableExams[0] : null);

      return res.json({
        success: true,
        available: availableExams,
        pendingList: pendingList,
        pending: pendingExam,
        completed: completed
      });
    }
  } catch (e) {
    console.warn("[Exams] Fallback to mock:", e.message);
  }

  // Fallback if DB offline
  const mockEnrolled = (mockStore.enrollments || []).filter(e => e.participantId === rawPid || e.participant_id === rawPid);
  const availableExams = mockEnrolled.map(enr => {
    const questions = courseQuestions[enr.courseId] || courseQuestions.default;
    return {
      id: `EXAM_${enr.courseId}`,
      examId: `EXAM_${enr.courseId}`,
      courseId: enr.courseId,
      title: `${enr.courseTitle || 'Enrolled Course'} - Certification Assessment`,
      courseTitle: enr.courseTitle || 'Enrolled Course',
      duration: "30 minutes",
      durationMinutes: 30,
      examUrl: "",
      totalQuestions: questions.length,
      questions,
      isCompleted: false
    };
  });

  res.json({
    success: true,
    available: availableExams,
    pendingList: availableExams,
    pending: availableExams[0] || null,
    completed: []
  });
});

// Update or upload exam assessment questions for a course
router.post(["/courses/test/upload", "/exams/update-questions"], async (req, res) => {
  const { participantId, courseId, testTitle, testUrl, examUrl, duration, examDuration, questions } = req.body;
  const cid = (courseId || "C001").trim();
  const dur = Number(duration || examDuration) || 30;
  const url = (testUrl || examUrl || "").trim();

  if (Array.isArray(questions) && questions.length > 0) {
    courseQuestions[cid] = questions;
  }

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const eid = `EXAM_${cid}`;
      const examCheck = await executeOracle(`SELECT exam_id FROM exam WHERE course_id = :cid`, { cid });
      if (examCheck.data && examCheck.data.length > 0) {
        await executeOracle(
          `UPDATE exam SET exam_url = :url, exam_duration = :dur WHERE course_id = :cid`,
          { url, dur, cid }
        );
      } else {
        await executeOracle(
          `INSERT INTO exam (exam_id, course_id, exam_url, exam_duration, exam_status)
           VALUES (:eid, :cid, :url, :dur, 'Pending')`,
          { eid, cid, url, dur }
        ).catch(() => {});
      }
      return res.json({ success: true, message: `Course exam and questions updated successfully!` });
    }
  } catch (err) {
    console.warn("[Upload Test] Fallback:", err.message);
  }

  res.json({ success: true, message: `Course assessment updated successfully!` });
});

router.post("/exams/submit", async (req, res) => {
  const { participantId, examId, courseId, score, courseTitle } = req.body;
  const rawPid = (participantId || "P001").trim();
  const eid = (examId || "E001").trim();
  const cid = (courseId || "C001").trim();
  const numScore = Number(score) || 0;
  const passed = numScore >= 70;
  const cTitleClean = (courseTitle || "").replace(/^Completion of\s+/i, '').trim() || cid;
  const finalCertTitle = `Completion of ${cTitleClean}`;

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // Check if exam exists in EXAM table; if not insert
      const examCheck = await executeOracle(`SELECT exam_id FROM exam WHERE exam_id = :eid`, { eid });
      if (!examCheck.data || examCheck.data.length === 0) {
        await executeOracle(
          `INSERT INTO exam (exam_id, course_id, exam_duration) VALUES (:eid, :cid, 30)`,
          { eid, cid }
        ).catch(() => {});
      }

      await executeOracle(
        `INSERT INTO attempts (participant_id, course_id, exam_id, attempt_date, score)
         VALUES (:pid, :cid, :eid, SYSDATE, :score)`,
        { pid: actualPid, cid, eid, score: numScore }
      );

      if (passed) {
        let isFirstTimePass = false;
        // 1. Check if participant already has this certificate or already passed in Oracle
        try {
          const existingCert = await executeOracle(
            `SELECT c.certificate_id FROM certificate c
             LEFT JOIN verify v ON c.certificate_id = v.certificate_id
             WHERE UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:pid))
               AND (UPPER(TRIM(c.certificate_asset)) = UPPER(TRIM(:cTitle)) OR UPPER(TRIM(c.certificate_asset)) LIKE UPPER(TRIM(:cMatch)))
               AND (UPPER(TRIM(v.verification_status)) = 'ACCEPTED' OR UPPER(TRIM(v.verification_status)) = 'APPROVED')`,
            { pid: actualPid, cTitle: finalCertTitle, cMatch: `%${cTitleClean}%` }
          );

          if (!existingCert.data || existingCert.data.length === 0) {
            isFirstTimePass = true;
            // Generate next certificate ID
            const cntRes = await executeOracle(`SELECT COUNT(*) as cnt FROM certificate`);
            const count = (cntRes.data && cntRes.data[0] && cntRes.data[0].CNT) ? cntRes.data[0].CNT : 10;
            const newCertId = "CERT" + String(count + 1).padStart(3, "0");

            // Insert approved certificate record
            await executeOracle(
              `INSERT INTO certificate (certificate_id, certificate_type, certificate_asset, admin_id, participant_id, issue_date)
               VALUES (:cid, :ctype, :asset, 'A001', :pid, SYSDATE)`,
              { cid: newCertId, ctype: cTitleClean, asset: finalCertTitle, pid: actualPid }
            );

            // Insert Accepted verification status in VERIFY table
            await executeOracle(
              `INSERT INTO verify (admin_id, certificate_id, verified_at, verification_status)
               VALUES ('A001', :cid, SYSDATE, 'Accepted')`,
              { cid: newCertId }
            );

            // Link in UPDATES table if course has skill_id
            const crsRes = await executeOracle(
              `SELECT skill_id FROM course WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))`,
              { cid }
            );
            if (crsRes.data && crsRes.data[0] && crsRes.data[0].SKILL_ID) {
              await executeOracle(
                `INSERT INTO updates (certificate_id, participant_id, skill_id)
                 VALUES (:cid, :pid, :skid)`,
                { cid: newCertId, pid: actualPid, skid: crsRes.data[0].SKILL_ID }
              ).catch(() => {});
            }
          }
        } catch (certErr) {
          console.warn("[Auto-Cert] Error generating certificate:", certErr.message);
        }

        // Award +50 bonus credits ONLY if this is the first time passing this course exam
        if (isFirstTimePass) {
          await executeOracle(
            `UPDATE participant SET credit = credit + 50 WHERE participant_id = :pid`,
            { pid: actualPid }
          );

          await executeOracle(
            `INSERT INTO notification (notification_id, message, type, generated_at)
             VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Certificate', SYSDATE)`,
            { msg: `[Participant: ${actualPid}] Congratulations! You passed the exam for "${cTitleClean}" (${numScore}%). Your certificate "${finalCertTitle}" has been added to your profile (+50 credits awarded)!` }
          );
        } else {
          await executeOracle(
            `INSERT INTO notification (notification_id, message, type, generated_at)
             VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'info', SYSDATE)`,
            { msg: `[Participant: ${actualPid}] Exam retake result: You passed with ${numScore}% in "${cTitleClean}". (Certificate and +50 credits were already claimed previously).` }
          );
        }
      } else {
        await executeOracle(
          `INSERT INTO notification (notification_id, message, type, generated_at)
           VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'warning', SYSDATE)`,
          { msg: `[Participant: ${actualPid}] Assessment result: You scored ${numScore}% in "${cTitleClean}". Review course lessons and retake the exam to earn your certificate.` }
        );
      }

      const pUpdated = await executeOracle(`SELECT credit FROM participant WHERE participant_id = :pid`, { pid: actualPid });
      const currentCredit = (pUpdated.data && pUpdated.data[0]) ? pUpdated.data[0].CREDIT : 500;

      return res.json({
        success: true,
        passed,
        score: numScore,
        creditsAwarded: passed ? 50 : 0,
        certificateAwarded: passed,
        certificateTitle: finalCertTitle,
        newCredit: Number(currentCredit),
        message: passed
          ? `Congratulations! Passed with ${numScore}%. Certificate "${finalCertTitle}" has been added to your profile (+50 credits)!`
          : `Assessment finished with ${numScore}%. Review materials and retry to earn your certificate.`
      });
    }
  } catch (e) {
    console.warn("[Exam Submit] Fallback to mock:", e.message);
  }

  const p = mockStore.participants.find(item => item.participant_id === rawPid || item.email?.toLowerCase() === rawPid.toLowerCase());
  const actualPid = p ? p.participant_id : rawPid;

  if (passed) {
    if (p) p.credit = (p.credit || 500) + 50;

    const exists = mockStore.certificates.some(
      c => c.participant_id === actualPid && c.skill === finalCertTitle
    );
    if (!exists) {
      const newCertId = "CERT" + String(mockStore.certificates.length + 1).padStart(3, "0");
      mockStore.certificates.unshift({
        id: mockStore.certificates.length + 1,
        certId: newCertId,
        skill: finalCertTitle,
        status: "Accepted",
        participant_id: actualPid,
        asset: finalCertTitle
      });
    }
  }

  res.json({
    success: true,
    passed,
    score: numScore,
    creditsAwarded: passed ? 50 : 0,
    certificateAwarded: passed,
    certificateTitle: finalCertTitle,
    newCredit: p ? p.credit : 550,
    message: passed ? `Congratulations! Passed with ${numScore}%. Certificate "${finalCertTitle}" awarded (+50 credits)!` : `Completed with ${numScore}%.`
  });
});

// ==========================================
// PEER REVIEW
// ==========================================
router.get("/peer-review/pending", async (req, res) => {
  const rawPid = (req.query.participantId || req.query.pid || "").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid && (rawPid.includes("@") || !rawPid.startsWith("P"))) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      const pendingRes = await executeOracle(
        `SELECT ct.content_id as id, ct.content_title as title, ct.content_url as video_url,
                ct.content_duration as duration, ct.participant_id as creator_id,
                p.first_name || ' ' || p.last_name as creator_name
         FROM content ct
         LEFT JOIN participant p ON ct.participant_id = p.participant_id
         WHERE ct.content_status = 'Pending'
         ORDER BY ct.content_id DESC`
      );

      const items = (pendingRes.data || []).map((c, idx) => ({
        id: c.ID || idx + 1,
        contentId: c.ID,
        title: c.TITLE || "Community Submitted Lesson",
        creatorName: c.CREATOR_NAME || "Peer Contributor",
        videoUrl: c.VIDEO_URL || "https://www.youtube.com/watch?v=WDX1gLtCIlc",
        duration: c.DURATION ? `${c.DURATION} mins` : "45 mins",
        status: null
      }));

      return res.json({ success: true, count: items.length, items });
    }
  } catch (e) {
    console.warn("[Peer Review Pending] Fallback to mock:", e.message);
  }

  res.json({
    success: true,
    items: [
      { id: 1, contentId: "CT001", title: "Introduction to C programming", creatorName: "Rahim Ahmed", videoUrl: "https://www.youtube.com/watch?v=WDX1gLtCIlc", duration: "45 mins", status: null },
      { id: 2, contentId: "CT002", title: "First C Program & Compiler Setup", creatorName: "Sadia Islam", videoUrl: "https://www.youtube.com/watch?v=wEWHq8FzdMw", duration: "35 mins", status: null },
      { id: 3, contentId: "CT003", title: "Variables, Memory & Data Types", creatorName: "Tanvir Hossain", videoUrl: "https://www.youtube.com/watch?v=vLnPwxZdW4Y", duration: "50 mins", status: null },
      { id: 4, contentId: "CT004", title: "Operators & Expressions in C", creatorName: "Nusrat Jahan", videoUrl: "https://www.youtube.com/watch?v=7S_tz1z_5bA", duration: "40 mins", status: null },
      { id: 5, contentId: "CT005", title: "Decision Making & Branching Logic", creatorName: "Fahim Hasan", videoUrl: "https://www.youtube.com/watch?v=8jLOx1hD3_o", duration: "60 mins", status: null }
    ]
  });
});

router.post("/peer-review/submit", async (req, res) => {
  const { reviewerId, contentId, title, actionType, feedbackComment } = req.body;
  const rawPid = (reviewerId || "P001").trim();
  const normalizedAction = actionType === 'ACCEPT' ? 'Approved' : 'Rejected';

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // Update content status if contentId exists
      if (contentId) {
        await executeOracle(
          `UPDATE content SET content_status = :st WHERE content_id = :cid`,
          { st: normalizedAction, cid: contentId }
        );
      }

      // Award +20 credits to the peer reviewer
      await executeOracle(
        `UPDATE participant SET credit = credit + 20 WHERE participant_id = :pid`,
        { pid: actualPid }
      );

      // Notify reviewer
      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Reward', SYSDATE)`,
        { msg: `[Participant: ${actualPid}] Thank you for peer reviewing "${title}" (+20 reviewer credits awarded)!` }
      );

      const pUpdated = await executeOracle(`SELECT credit FROM participant WHERE participant_id = :pid`, { pid: actualPid });
      const currentCredit = (pUpdated.data && pUpdated.data[0]) ? pUpdated.data[0].CREDIT : 500;

      return res.json({
        success: true,
        message: `Peer review submitted! +20 credits awarded to your balance.`,
        newCredit: Number(currentCredit)
      });
    }
  } catch (e) {
    console.warn("[Peer Review Submit] Fallback to mock:", e.message);
  }

  const p = mockStore.participants.find(item => item.participant_id === rawPid || item.email?.toLowerCase() === rawPid.toLowerCase());
  if (p) p.credit = (p.credit || 500) + 20;

  res.json({
    success: true,
    message: `Peer review submitted! +20 credits awarded.`,
    newCredit: p ? p.credit : 520
  });
});

// ==========================================
// CONTRIBUTOR CONTENT MANAGEMENT
// ==========================================
router.get("/content/user/:participantId", async (req, res) => {
  const rawPid = (req.params.participantId || "P001").trim();

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // 1. Fetch approved courses contributed by this participant with their attached exam
      const coursesRes = await executeOracle(
        `SELECT c.course_id, c.course_title, c.course_level, c.price, c.participant_id, c.skill_id,
                s.skill_name, pr.total_lesson,
                ex.exam_id, ex.exam_url, ex.exam_duration, ex.exam_status
         FROM course c
         LEFT JOIN skill s ON c.skill_id = s.skill_id
         LEFT JOIN progress pr ON c.progress_id = pr.progress_id
         LEFT JOIN exam ex ON c.course_id = ex.course_id
         WHERE UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:pid))
            OR UPPER(TRIM(c.participant_id)) = UPPER(TRIM(:rawPid))
            OR c.participant_id IN (SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:rawPid)))
         ORDER BY c.course_id DESC`,
        { pid: actualPid, rawPid }
      );

      // 2. Fetch all lessons for all contributed courses from COURSE_ASSET
      const assetsRes = await executeOracle(
        `SELECT ca.asset_id as id, ca.asset_id, ca.course_id, ca.content_id,
                ca.asset_title as title, ca.asset_title,
                ca.asset_url as url, ca.asset_url,
                NVL(ca.asset_duration, 45) as duration,
                NVL(ca.asset_duration, 45) as asset_duration
         FROM course_asset ca
         ORDER BY ca.asset_id ASC`
      );

      const allAssets = assetsRes.data || [];
      const approvedCoursesList = (coursesRes.data || []).map(c => {
        const cid = c.COURSE_ID || c.course_id;
        const courseLessons = allAssets
          .filter(a => String(a.COURSE_ID || a.course_id).toUpperCase() === String(cid).toUpperCase())
          .map((a, idx) => {
            let rawTitle = (a.TITLE || a.ASSET_TITLE || a.title || a.asset_title || '').trim();
            if (rawTitle.endsWith(':')) {
              rawTitle = rawTitle.replace(/:+$/, '').trim();
            }
            const fallbackTitle = `${c.COURSE_TITLE || c.title || 'Course'} Lesson ${idx + 1}`;
            const cleanTitle = rawTitle || fallbackTitle;
            const assetId = a.ASSET_ID || a.ID || a.id || a.asset_id || `AS_${cid}_${idx + 1}`;
            const contentId = a.CONTENT_ID || a.content_id;
            return {
              id: assetId,
              ID: assetId,
              asset_id: assetId,
              ASSET_ID: assetId,
              content_id: contentId,
              CONTENT_ID: contentId,
              course_id: cid,
              COURSE_ID: cid,
              title: cleanTitle,
              TITLE: cleanTitle,
              asset_title: cleanTitle,
              ASSET_TITLE: cleanTitle,
              url: a.URL || a.ASSET_URL || a.url || a.asset_url || "https://skillchain.com/lessons",
              asset_url: a.URL || a.ASSET_URL || a.url || a.asset_url || "https://skillchain.com/lessons",
              duration: Number(a.DURATION || a.ASSET_DURATION || a.duration || a.asset_duration) || 45,
              DURATION: Number(a.DURATION || a.ASSET_DURATION || a.duration || a.asset_duration) || 45,
              asset_duration: Number(a.DURATION || a.ASSET_DURATION || a.duration || a.asset_duration) || 45
            };
          });

        const courseObj = {
          id: cid,
          course_id: cid,
          title: c.COURSE_TITLE,
          course_title: c.COURSE_TITLE,
          level: c.COURSE_LEVEL || "Intermediate",
          price: c.PRICE || 500,
          skillName: c.SKILL_NAME || "General",
          status: "Approved",
          totalLessons: courseLessons.length,
          exam: {
            id: c.EXAM_ID || `EXAM_${cid}`,
            exam_id: c.EXAM_ID || `EXAM_${cid}`,
            exam_url: c.EXAM_URL || "",
            url: c.EXAM_URL || "",
            exam_duration: Number(c.EXAM_DURATION) || 30,
            duration: Number(c.EXAM_DURATION) || 30,
            status: c.EXAM_STATUS || "Active"
          },
          lessons: courseLessons
        };
        return courseObj;
      });

      // 3. Also fetch raw content proposals
      const contentRes = await executeOracle(
        `SELECT ct.content_id as id, ct.content_title as title, ct.content_url as url,
                ct.content_duration as duration, ct.content_status as status
         FROM content ct
         WHERE UPPER(ct.participant_id) = UPPER(:pid)
         ORDER BY ct.content_id DESC`,
        { pid: actualPid }
      );

      // Collect all lessons across contributed courses + standalone content
      let allLessons = [];
      approvedCoursesList.forEach(c => {
        if (c.lessons && c.lessons.length > 0) {
          allLessons.push(...c.lessons);
        }
      });

      if (allLessons.length === 0 && contentRes.data && contentRes.data.length > 0) {
        allLessons = contentRes.data;
      }

      return res.json({
        success: true,
        count: allLessons.length,
        courses: approvedCoursesList,
        lessons: allLessons
      });
    }
  } catch (e) {
    console.warn("[User Content] Fallback to mock:", e.message);
  }

  const mockCourses = (mockStore.courses || []).filter(c => c.participant_id === rawPid || c.participant_id === "P001" || c.participant_id === "P015");
  const fallbackLessons = [
    { id: "CT001", asset_id: "AS001", content_id: "CT001", course_id: "C001", title: "Introduction to C programming", url: "https://www.youtube.com/watch?v=WDX1gLtCIlc", duration: 45 },
    { id: "CT002", asset_id: "AS002", content_id: "CT002", course_id: "C001", title: "First C Program", url: "https://www.youtube.com/watch?v=wEWHq8FzdMw", duration: 35 },
    { id: "CT003", asset_id: "AS003", content_id: "CT003", course_id: "C001", title: "Variables and Data Types in C", url: "#", duration: 50 }
  ];

  res.json({
    success: true,
    courses: mockCourses.map(c => ({
      id: c.course_id || c.id,
      course_id: c.course_id || c.id,
      title: c.course_title || c.title,
      course_title: c.course_title || c.title,
      level: c.course_level || c.level || "Intermediate",
      price: c.price || 500,
      status: "Approved",
      totalLessons: c.lessons?.length || 3,
      exam: {
        exam_id: `EXAM_${c.course_id || c.id}`,
        exam_url: "https://forms.gle/exam-test",
        exam_duration: 30,
        status: "Active"
      },
      lessons: c.lessons || fallbackLessons
    })),
    lessons: fallbackLessons
  });
});

router.post("/content/upload", async (req, res) => {
  const { participantId, courseId, title, lessonTitle, url, lessonUrl, duration, lessonDuration } = req.body;
  const rawPid = (participantId || "P001").trim();
  const targetCid = (courseId || "C001").trim();
  const lTitle = (lessonTitle || title || "New Course Lesson").trim();
  const lUrl = (lessonUrl || url || "https://www.youtube.com/watch?v=WDX1gLtCIlc").trim();
  const lDur = Number(lessonDuration || duration) || 45;

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // Generate Asset ID
      const allAssets = await executeOracle("SELECT asset_id FROM course_asset");
      let maxAst = (allAssets.data || []).reduce((max, r) => {
        const n = parseInt((r.ASSET_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newAstId = "AS" + String(maxAst + 1).padStart(3, "0");

      // Generate Content ID
      const allCnt = await executeOracle("SELECT content_id FROM content");
      let maxCnt = (allCnt.data || []).reduce((max, r) => {
        const n = parseInt((r.CONTENT_ID || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      const newCntId = "CT" + String(maxCnt + 1).padStart(3, "0");

      // 1. Insert into CONTENT first (to satisfy COURSE_ASSET FK constraint)
      await executeOracle(
        `INSERT INTO content (content_id, participant_id, content_url, content_title, content_status, content_duration)
         VALUES (:cntid, :pid, :url, :title, 'Published', :dur)`,
        { cntid: newCntId, pid: actualPid, url: lUrl, title: lTitle, dur: lDur }
      );

      // 2. Insert into COURSE_ASSET
      await executeOracle(
        `INSERT INTO course_asset (asset_id, course_id, asset_title, asset_url, content_id, asset_duration)
         VALUES (:aid, :cid, :title, :url, :cntid, :dur)`,
        { aid: newAstId, cid: targetCid, title: lTitle, url: lUrl, cntid: newCntId, dur: lDur }
      );

      // Insert into UPLOADS
      await executeOracle(
        `INSERT INTO uploads (participant_id, course_id, content_id)
         VALUES (:pid, :cid, :cntid)`,
        { pid: actualPid, cid: targetCid, cntid: newCntId }
      ).catch(() => {});

      // Increment progress total_lesson for the course
      await executeOracle(
        `UPDATE progress SET total_lesson = total_lesson + 1
         WHERE progress_id = (SELECT progress_id FROM course WHERE UPPER(course_id) = UPPER(:cid))`,
        { cid: targetCid }
      ).catch(() => {});

      // Notify contributor
      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Content', SYSDATE)`,
        { msg: `[Participant: ${actualPid}] New lesson "${lTitle}" added to course ${targetCid} and is now live!` }
      );

      return res.json({
        success: true,
        message: `Lesson "${lTitle}" successfully added to course ${targetCid}!`,
        assetId: newAstId,
        contentId: newCntId
      });
    }
  } catch (e) {
    console.warn("[Upload Content Error]:", e.message);
  }

  res.json({
    success: true,
    message: `Lesson "${lTitle}" added to course successfully!`,
    contentId: "CT" + Date.now()
  });
});

router.post("/content/test", async (req, res) => {
  const { participantId, courseId, testTitle, testUrl, duration, examDuration, examUrl } = req.body;
  const rawPid = (participantId || "P001").trim();
  const targetCid = (courseId || "C001").trim();
  const url = (testUrl || examUrl || "").trim();
  const dur = parseInt(duration || examDuration, 10) || 30;

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) actualPid = pCheck.data[0].PARTICIPANT_ID;
      }

      // Check if exam already exists for this course
      const exCheck = await executeOracle(
        `SELECT exam_id FROM exam WHERE UPPER(course_id) = UPPER(:cid)`,
        { cid: targetCid }
      );

      let examId = "";
      if (exCheck.data && exCheck.data.length > 0) {
        examId = exCheck.data[0].EXAM_ID;
        await executeOracle(
          `UPDATE exam SET exam_url = :url, exam_duration = :dur, exam_status = 'Active' WHERE UPPER(course_id) = UPPER(:cid)`,
          { url, dur, cid: targetCid }
        );
      } else {
        const allExams = await executeOracle("SELECT exam_id FROM exam");
        let maxEx = (allExams.data || []).reduce((max, r) => {
          const n = parseInt((r.EXAM_ID || "").replace(/\D/g, ""), 10);
          return !isNaN(n) && n > max ? n : max;
        }, 0);
        examId = "E" + String(maxEx + 1).padStart(3, "0");

        await executeOracle(
          `INSERT INTO exam (exam_id, course_id, exam_url, exam_duration, exam_status)
           VALUES (:eid, :cid, :url, :dur, 'Active')`,
          { eid: examId, cid: targetCid, url, dur }
        );
      }

      await executeOracle(
        `INSERT INTO notification (notification_id, message, type, generated_at)
         VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), :msg, 'Exam', SYSDATE)`,
        { msg: `[Participant: ${actualPid}] Assessment test updated for course ${targetCid} (${dur} mins).` }
      );

      return res.json({
        success: true,
        message: `Course assessment updated successfully! (Duration: ${dur} mins)`,
        examId
      });
    }
  } catch (e) {
    console.warn("[Upload Test] Fallback to mock:", e.message);
  }

  res.json({ success: true, message: "Assessment test updated successfully!", examId: "E" + String(Date.now()).slice(-4) });
});

router.delete("/content/:id", async (req, res) => {
  const targetId = (req.params.id || "").trim();
  const courseId = (req.query.courseId || req.body?.courseId || "").trim();
  const assetId = (req.query.assetId || req.body?.assetId || "").trim();
  const contentId = (req.query.contentId || req.body?.contentId || "").trim();
  const title = (req.query.title || req.body?.title || "").trim();
  const rawIdx = req.query.index !== undefined ? req.query.index : req.body?.index;
  const index = (rawIdx !== undefined && rawIdx !== null && rawIdx !== "") ? Number(rawIdx) : null;

  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let assetToDelete = null;
      if (courseId) {
        const courseAssetsRes = await executeOracle(
          `SELECT asset_id, course_id, content_id, asset_title
           FROM course_asset 
           WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid))
           ORDER BY asset_id ASC`,
          { cid: courseId }
        );
        const assets = courseAssetsRes.data || [];
        
        if (assetId && assetId !== 'UNDEFINED') {
          assetToDelete = assets.find(a => String(a.ASSET_ID).toUpperCase() === assetId.toUpperCase());
        }
        if (!assetToDelete && targetId && !targetId.startsWith('idx_')) {
          assetToDelete = assets.find(a => 
            String(a.ASSET_ID).toUpperCase() === targetId.toUpperCase() ||
            String(a.CONTENT_ID).toUpperCase() === targetId.toUpperCase() ||
            String(a.ASSET_TITLE || '').trim().toLowerCase() === targetId.toLowerCase()
          );
        }
        if (!assetToDelete && title) {
          assetToDelete = assets.find(a => String(a.ASSET_TITLE || '').trim().toLowerCase() === title.toLowerCase());
        }
        if (!assetToDelete && index !== null && !isNaN(index) && index >= 0 && index < assets.length) {
          assetToDelete = assets[index];
        }
      }

      if (!assetToDelete) {
        const checkAsset = await executeOracle(
          `SELECT asset_id, course_id, content_id, asset_title
           FROM course_asset 
           WHERE UPPER(TRIM(asset_id)) = UPPER(TRIM(:tid))
              OR UPPER(TRIM(content_id)) = UPPER(TRIM(:tid))
              OR UPPER(TRIM(asset_title)) = UPPER(TRIM(:tid))
              OR UPPER(TRIM(asset_id)) = UPPER(TRIM(:aid))`,
          { tid: targetId, aid: assetId || targetId }
        );
        if (checkAsset.data && checkAsset.data.length > 0) {
          assetToDelete = checkAsset.data[0];
        }
      }

      const effectiveAssetId = assetToDelete ? assetToDelete.ASSET_ID : (assetId || targetId);
      const effectiveContentId = assetToDelete ? assetToDelete.CONTENT_ID : (contentId || targetId);
      const effectiveCourseId = assetToDelete ? assetToDelete.COURSE_ID : courseId;

      // 2. Delete from COURSE_ASSET
      if (effectiveAssetId && !effectiveAssetId.startsWith('idx_')) {
        await executeOracle(
          `DELETE FROM course_asset WHERE UPPER(TRIM(asset_id)) = UPPER(TRIM(:aid))`,
          { aid: effectiveAssetId }
        );
      }

      // 3. Delete from dependent child tables of CONTENT (uploads, generates)
      if (effectiveContentId && !effectiveContentId.startsWith('idx_')) {
        await executeOracle(
          `DELETE FROM uploads WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid))`,
          { cid: effectiveContentId }
        ).catch(() => {});

        await executeOracle(
          `DELETE FROM generates WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid))`,
          { cid: effectiveContentId }
        ).catch(() => {});

        // 4. Delete from CONTENT
        await executeOracle(
          `DELETE FROM content WHERE UPPER(TRIM(content_id)) = UPPER(TRIM(:cid))`,
          { cid: effectiveContentId }
        ).catch(() => {});
      }

      // 5. Update progress total_lesson for the course
      if (effectiveCourseId) {
        await executeOracle(
          `UPDATE progress 
           SET total_lesson = (SELECT COUNT(*) FROM course_asset WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid)))
           WHERE progress_id = (SELECT progress_id FROM course WHERE UPPER(TRIM(course_id)) = UPPER(TRIM(:cid)))`,
          { cid: effectiveCourseId }
        ).catch(() => {});
      }

      // Clean in-memory mock fallback as well
      if (mockStore.courses) {
        mockStore.courses.forEach(c => {
          const cId = String(c.course_id || c.id || '').toUpperCase();
          if (!effectiveCourseId || cId === effectiveCourseId.toUpperCase()) {
            if (Array.isArray(c.lessons)) {
              c.lessons = c.lessons.filter((l, i) => {
                if (index !== null && i === index) return false;
                const lId = String(l.id || '').toUpperCase();
                const lAssetId = String(l.asset_id || '').toUpperCase();
                const lContentId = String(l.content_id || '').toUpperCase();
                const lTitle = String(l.title || l.asset_title || '').trim().toLowerCase();

                const isMatch =
                  (effectiveAssetId && (lAssetId === effectiveAssetId.toUpperCase() || lId === effectiveAssetId.toUpperCase())) ||
                  (effectiveContentId && (lContentId === effectiveContentId.toUpperCase() || lId === effectiveContentId.toUpperCase())) ||
                  (title && lTitle === title.toLowerCase());

                return !isMatch;
              });
              c.totalLessons = c.lessons.length;
              c.totalClasses = c.lessons.length;
            }
          }
        });
      }
      if (mockStore.pendingLessons) {
        mockStore.pendingLessons = mockStore.pendingLessons.filter(pl => 
          pl.contentId !== targetId && pl.id !== targetId && pl.title !== targetId && pl.title !== title
        );
      }

      return res.json({ success: true, message: `Lesson permanently deleted.` });
    }
  } catch (e) {
    console.warn("[Delete Content] Oracle Error:", e.message);
  }

  // Fallback deletion in mock store
  if (mockStore.courses) {
    mockStore.courses.forEach(c => {
      const cId = String(c.course_id || c.id || '').toUpperCase();
      if (!courseId || cId === courseId.toUpperCase()) {
        if (Array.isArray(c.lessons)) {
          c.lessons = c.lessons.filter((l, i) => {
            if (index !== null && i === index) return false;
            return l.id !== targetId && l.asset_id !== targetId && l.content_id !== targetId && l.title !== title;
          });
          c.totalLessons = c.lessons.length;
          c.totalClasses = c.lessons.length;
        }
      }
    });
  }
  if (mockStore.pendingLessons) {
    mockStore.pendingLessons = mockStore.pendingLessons.filter(pl => 
      pl.contentId !== targetId && pl.id !== targetId && pl.title !== targetId && pl.title !== title
    );
  }

  res.json({ success: true, message: `Lesson deleted.` });
});

// ==========================================
// PROGRESS
// ==========================================
router.get("/progress/:participantId", async (req, res) => {
  const rawPid = (req.params.participantId || "").trim();
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      let actualPid = rawPid;
      if (rawPid.includes("@") || !rawPid.startsWith("P")) {
        const pCheck = await executeOracle(
          `SELECT participant_id FROM participant WHERE LOWER(TRIM(email)) = LOWER(TRIM(:em)) OR UPPER(TRIM(participant_id)) = UPPER(TRIM(:em))`,
          { em: rawPid }
        );
        if (pCheck.data && pCheck.data[0]) {
          actualPid = pCheck.data[0].PARTICIPANT_ID;
        }
      }

      const result = await executeOracle(
        `SELECT c.course_id, c.course_title, c.course_level,
                p.progress_id,
                CASE 
                  WHEN (SELECT COUNT(*) FROM course_asset ca WHERE ca.course_id = c.course_id) > 0 
                    THEN (SELECT COUNT(*) FROM course_asset ca WHERE ca.course_id = c.course_id)
                  WHEN NVL(p.total_lesson, 0) > 0 THEN p.total_lesson
                  ELSE 5
                END AS total_lesson,
                NVL(p.completed_lesson, 0) AS completed_lesson,
                NVL(p.progress_percentage, 0) AS progress_percentage
         FROM enrolls e
         JOIN course c ON e.course_id = c.course_id
         LEFT JOIN progress p ON c.progress_id = p.progress_id
         WHERE UPPER(TRIM(e.participant_id)) = UPPER(TRIM(:pid))
         ORDER BY e.enroll_date DESC`,
        { pid: actualPid }
      );

      if (result.data) {
        const progressList = result.data.map((row, idx) => {
          const total = Number(row.TOTAL_LESSON) || 1;
          const completed = Number(row.COMPLETED_LESSON) || 0;
          const pct = (total > 0 && completed >= total) ? 100 : Number(row.PROGRESS_PERCENTAGE) || Math.min(100, Math.round((completed / Math.max(1, total)) * 100));
          const status = pct >= 100 ? "Completed" : (completed > 0 ? "In Progress" : "Not Started");
          return {
            id: idx + 1,
            course_id: row.COURSE_ID,
            courseId: row.COURSE_ID,
            course_title: row.COURSE_TITLE || `Course ${idx + 1}`,
            courseTitle: row.COURSE_TITLE || `Course ${idx + 1}`,
            title: row.COURSE_TITLE || `Course ${idx + 1}`,
            level: row.COURSE_LEVEL || "Intermediate",
            progress_id: row.PROGRESS_ID,
            progressId: row.PROGRESS_ID,
            total_lesson: total,
            totalLessons: total,
            completed_lesson: completed,
            completedLessons: completed,
            progress_percentage: pct,
            percentage: pct,
            completion_status: status,
            completionStatus: status
          };
        });

        return res.json({ success: true, count: progressList.length, progress: progressList });
      }
    }
  } catch (e) {
    console.warn("[Progress] Fallback to mock:", e.message);
  }

  const progress = mockStore.enrolls
    .filter(e => e.participant_id === rawPid)
    .map((e, i) => {
      const course = mockStore.courses.find(c => c.course_id === e.course_id);
      return {
        id: i + 1,
        course_id: e.course_id,
        courseId: e.course_id,
        course_title: course ? course.course_title : `Course ${i + 1}`,
        courseTitle: course ? course.course_title : `Course ${i + 1}`,
        title: course ? course.course_title : `Course ${i + 1}`,
        total_lesson: 5,
        totalLessons: 5,
        completed_lesson: 1,
        completedLessons: 1,
        progress_percentage: 20,
        percentage: 20,
        completion_status: "In Progress",
        completionStatus: "In Progress"
      };
    });
  res.json({ success: true, count: progress.length, progress });
});

// ============================================================
// DEDICATED 7 ADVANCED QUERY ENDPOINTS (CRITERIA 2)
// ============================================================

// 1. PL/SQL Function
router.post("/queries/run-function", async (req, res) => {
  try {
    const { functionName, params } = req.body;
    const result = await runFunctionQuery(functionName || "GET_PARTICIPANT_CREDIT_TIER", params || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Subquery
router.post("/queries/run-subquery", async (req, res) => {
  try {
    const { subqueryType } = req.body;
    const result = await runSubquery(subqueryType || "SCALAR_COMPARISON");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Database View
router.get("/queries/run-view", async (req, res) => {
  try {
    const viewName = req.query.name || "v_course_analytics";
    const result = await runViewQuery(viewName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Abstract Datatype (ADT)
router.post("/queries/run-adt", async (req, res) => {
  try {
    const { participantId } = req.body;
    const result = await runAdtQuery(participantId || "P001");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. PL/SQL Anonymous Block / Stored Procedure
router.post("/queries/run-plsql", async (req, res) => {
  try {
    const { participantId, courseId } = req.body;
    const result = await runPlsqlBlock(participantId || "P001", courseId || "C004");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Explicit Cursor Procedure
router.post("/queries/run-cursor", async (req, res) => {
  try {
    const { minPrice } = req.body;
    const result = await runCursorProcedure(minPrice !== undefined ? Number(minPrice) : 1000);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Exception Handling
router.post("/queries/run-exception", async (req, res) => {
  try {
    const { participantId, amount, triggerError } = req.body;
    const result = await runExceptionHandling(participantId || "P001", amount || 100, triggerError);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Custom SQL Query Execution (Live SQL Runner)
router.post("/queries/run-custom", async (req, res) => {
  try {
    const { sql } = req.body;
    const result = await runCustomSqlQuery(sql);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
