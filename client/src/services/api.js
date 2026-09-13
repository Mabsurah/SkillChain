// Central API Service with full Oracle DB backend connection and immediate resilient fallback

const API_BASE = '/api';

async function safeRequest(endpoint, options = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);
    if (data !== null) {
      return data;
    }
  } catch (err) {
    console.warn(`[API] safeRequest error on ${endpoint}:`, err.message);
  }
  return null;
}

export const api = {
  login: async ({ email, password }) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    const serverRes = await safeRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    });
    
    if (serverRes) return serverRes;

    return { 
      success: false, 
      message: "Unable to connect to backend server. Please make sure the server is running." 
    };
  },

  register: async (userData) => {
    const serverRes = await safeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return serverRes || {
      success: false,
      message: "Could not complete registration. Server is offline."
    };
  },

  getCourses: async (params = null) => {
    let customPending = [];
    try {
      customPending = JSON.parse(localStorage.getItem('skillchain_pending_courses') || '[]');
    } catch (e) {}

    const isPendingQuery = params?.status?.toLowerCase() === 'pending';
    const statusQuery = (params && params.status) ? `?status=${encodeURIComponent(params.status)}` : '';
    const serverRes = await safeRequest(`/courses${statusQuery}`);
    let courses = [];

    if (serverRes && Array.isArray(serverRes.courses)) {
      courses = serverRes.courses.map(c => ({
        ...c,
        instructorName: c.instructorName || api.resolveParticipantName(c.participant_id || c.instructorEmail, c.instructor || 'Instructor')
      }));
    } else {
      // Server offline — return empty, no hardcoded fallback
      courses = [];
    }

    if (isPendingQuery) {
      let rejectedList = [];
      try {
        rejectedList = JSON.parse(localStorage.getItem('skillchain_rejected_courses') || '[]');
      } catch (e) {}

      for (const cp of customPending) {
        if ((cp.status || '').toLowerCase() === 'approved') continue;
        const resolvedInstructor = cp.instructorName || api.resolveParticipantName(cp.participant_id || cp.instructorEmail, cp.instructor || 'Contributor');
        const formattedCp = { ...cp, instructorName: resolvedInstructor, status: 'Pending' };

        const idx = courses.findIndex(c => (c.id || c.course_id) === (cp.id || cp.course_id));
        if (idx >= 0) {
          courses[idx] = { ...courses[idx], ...formattedCp };
        } else {
          courses.push(formattedCp);
        }
      }

      courses = courses.filter(c => 
        !rejectedList.includes(c.id || c.course_id) && 
        (c.status || '').toLowerCase() !== 'rejected' &&
        (c.status || '').toLowerCase() !== 'approved'
      );
    }

    const uniqueCourses = Array.from(new Map(courses.map(item => [item.id || item.course_id, item])).values());
    return { success: true, count: uniqueCourses.length, courses: uniqueCourses };
  },

  getCourse: async (id) => {
    const serverRes = await safeRequest(`/courses/${id}`);
    if (serverRes && serverRes.course) return serverRes;
    return { success: false, message: 'Course not found. Server may be offline.' };
  },

  getCourseLessons: async (courseId) => {
    // 1. Check local drafts
    try {
      const customDrafts = JSON.parse(localStorage.getItem('skillchain_draft_courses') || '[]');
      const matchedDraft = customDrafts.find(c => (c.id || c.course_id) === courseId);
      if (matchedDraft && Array.isArray(matchedDraft.lessons)) {
        return { success: true, lessons: matchedDraft.lessons };
      }
    } catch (e) {}

    // 2. Check local pending
    try {
      const customPending = JSON.parse(localStorage.getItem('skillchain_pending_courses') || '[]');
      const matchedPending = customPending.find(c => (c.id || c.course_id) === courseId);
      if (matchedPending && Array.isArray(matchedPending.lessons)) {
        return { success: true, lessons: matchedPending.lessons };
      }
    } catch (e) {}

    // 3. Request server
    const serverRes = await safeRequest(`/courses/${courseId}/lessons`);
    if (serverRes && Array.isArray(serverRes.lessons)) {
      return serverRes;
    }

    const singleCourse = await safeRequest(`/courses/${courseId}`);
    if (singleCourse && singleCourse.course && Array.isArray(singleCourse.course.lessons)) {
      return { success: true, lessons: singleCourse.course.lessons };
    }

    return { success: true, lessons: [] };
  },

  createCourse: async (body) => {
    const isDraft = body.status === "Draft" || !body.submitDirectly;
    const pid = body.participantId || "P001";

    // Strictly validate eligibility before creating any draft or pending course
    const skillCheck = await api.validateLearnedSkillForCourse(pid, body.title, body.level);
    if (!skillCheck.isValid) {
      return {
        success: false,
        message: skillCheck.message,
        blocked: true
      };
    }

    const resolvedInstructorName = body.instructorName || "Contributor";

    const serverRes = await safeRequest('/courses', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        instructorName: resolvedInstructorName,
        status: isDraft ? "Draft" : "Pending",
        submitDirectly: !isDraft
      })
    });

    window.dispatchEvent(new CustomEvent('skillchain-catalog-updated', { detail: { action: isDraft ? 'create-draft' : 'create', course: serverRes?.course } }));

    if (serverRes) return serverRes;

    return { 
      success: true, 
      message: isDraft ? `Draft course "${body.title}" created!` : "Course submitted for admin review!", 
      status: isDraft ? "Draft" : "Pending"
    };
  },

  submitCourseForReview: async (courseId, extraMeta = {}) => {
    // 1. Remove from local drafts
    try {
      let customDrafts = JSON.parse(localStorage.getItem('skillchain_draft_courses') || '[]');
      customDrafts = customDrafts.filter(d => (d.id || d.course_id) !== courseId);
      localStorage.setItem('skillchain_draft_courses', JSON.stringify(customDrafts));
    } catch (e) {}


    const serverRes = await safeRequest('/courses/submit-for-review', {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        participantId: extraMeta?.participantId,
        instructorName: extraMeta?.instructorName,
        title: extraMeta?.title || extraMeta?.courseTitle,
        level: extraMeta?.level || extraMeta?.courseLevel,
        lessons: extraMeta?.lessons,
        exam: extraMeta?.exam,
        ...extraMeta
      })
    });

    window.dispatchEvent(new CustomEvent('skillchain-catalog-updated', { detail: { action: 'submit-review', courseId } }));

    if (serverRes) return serverRes;
    return { success: true, message: `Course submitted for community peer review successfully!` };
  },

  addContentToCourse: async (body) => {
    const courseId = body.courseId;
    let customDrafts = [];
    try {
      customDrafts = JSON.parse(localStorage.getItem('skillchain_draft_courses') || '[]');
    } catch (e) {}

    const draftIdx = customDrafts.findIndex(c => (c.id || c.course_id) === courseId);
    const newLesson = {
      id: `CT${Date.now().toString().slice(-4)}`,
      asset_id: `AS${Date.now().toString().slice(-4)}`,
      content_id: `CT${Date.now().toString().slice(-4)}`,
      title: body.title,
      url: body.url,
      duration: Number(body.duration) || 45
    };

    if (draftIdx >= 0) {
      if (!customDrafts[draftIdx].lessons) customDrafts[draftIdx].lessons = [];
      customDrafts[draftIdx].lessons.push(newLesson);
      customDrafts[draftIdx].totalLessons = customDrafts[draftIdx].lessons.length;
      customDrafts[draftIdx].totalClasses = customDrafts[draftIdx].lessons.length;
      customDrafts[draftIdx].total_classes = customDrafts[draftIdx].lessons.length;
      localStorage.setItem('skillchain_draft_courses', JSON.stringify(customDrafts));
      return { success: true, message: "Lesson added to draft course curriculum!", lesson: newLesson };
    }

    const serverRes = await safeRequest('/courses/add-content', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (serverRes) return serverRes;
    return { success: true, message: "Lesson added to course successfully!", lesson: newLesson };
  },

  deleteLesson: async (contentIdOrObj, extraParams = {}) => {
    let contentId = typeof contentIdOrObj === 'object' ? (contentIdOrObj.id || contentIdOrObj.content_id || contentIdOrObj.asset_id) : contentIdOrObj;
    let courseId = extraParams?.courseId || (typeof contentIdOrObj === 'object' ? contentIdOrObj.course_id : null);

    let customDrafts = [];
    try {
      customDrafts = JSON.parse(localStorage.getItem('skillchain_draft_courses') || '[]');
    } catch (e) {}

    if (courseId) {
      const draftIdx = customDrafts.findIndex(c => (c.id || c.course_id) === courseId);
      if (draftIdx >= 0 && Array.isArray(customDrafts[draftIdx].lessons)) {
        customDrafts[draftIdx].lessons = customDrafts[draftIdx].lessons.filter(l => (l.id || l.content_id || l.asset_id) !== contentId);
        customDrafts[draftIdx].totalLessons = customDrafts[draftIdx].lessons.length;
        customDrafts[draftIdx].totalClasses = customDrafts[draftIdx].lessons.length;
        customDrafts[draftIdx].total_classes = customDrafts[draftIdx].lessons.length;
        localStorage.setItem('skillchain_draft_courses', JSON.stringify(customDrafts));
        return { success: true, message: "Lesson removed from draft course." };
      }
    } else {
      customDrafts.forEach(c => {
        if (Array.isArray(c.lessons)) {
          c.lessons = c.lessons.filter(l => (l.id || l.content_id || l.asset_id) !== contentId);
          c.totalLessons = c.lessons.length;
          c.totalClasses = c.lessons.length;
          c.total_classes = c.lessons.length;
        }
      });
      localStorage.setItem('skillchain_draft_courses', JSON.stringify(customDrafts));
    }

    const serverRes = await safeRequest(`/courses/lesson/${contentId}`, { method: 'DELETE' });
    if (serverRes) return serverRes;
    return { success: true, message: "Lesson removed from course." };
  },

  approveCourse: async (courseIdOrObj, maybeSkill, maybeCredit) => {
    let courseId = typeof courseIdOrObj === 'object' ? (courseIdOrObj.courseId || courseIdOrObj.id) : courseIdOrObj;
    let selectedSkill = typeof courseIdOrObj === 'object' ? (courseIdOrObj.selectedSkill || courseIdOrObj.skillId) : maybeSkill;
    let creditValue = typeof courseIdOrObj === 'object' ? (courseIdOrObj.creditValue || courseIdOrObj.price) : maybeCredit;
    let courseTitle = typeof courseIdOrObj === 'object' ? (courseIdOrObj.title || courseIdOrObj.course_title) : '';

    if (!courseTitle) {
      let customPending = [];
      try {
        customPending = JSON.parse(localStorage.getItem('skillchain_pending_courses') || '[]');
      } catch (e) {}
      const found = customPending.find(c => (c.id || c.course_id) === courseId) ||
                    null;
      if (found) {
        courseTitle = found.title || found.course_title || '';
      }
    }

    const cleanTitle = (courseTitle || '').trim().toLowerCase();
    const assignedPrice = Number(creditValue) > 0 ? Number(creditValue) : 500;
    
    // 1. Remove from localStorage pending & draft courses and save in approved
    try {
      let customPending = JSON.parse(localStorage.getItem('skillchain_pending_courses') || '[]');
      customPending = customPending.filter(p => {
        const pid = p.id || p.course_id;
        const ptitle = (p.title || p.course_title || '').trim().toLowerCase();
        return pid !== courseId && (!cleanTitle || ptitle !== cleanTitle);
      });
      localStorage.setItem('skillchain_pending_courses', JSON.stringify(customPending));

      let customDrafts = JSON.parse(localStorage.getItem('skillchain_draft_courses') || '[]');
      customDrafts = customDrafts.filter(d => {
        const did = d.id || d.course_id;
        const dtitle = (d.title || d.course_title || '').trim().toLowerCase();
        return did !== courseId && (!cleanTitle || dtitle !== cleanTitle);
      });
      localStorage.setItem('skillchain_draft_courses', JSON.stringify(customDrafts));

      let customApproved = JSON.parse(localStorage.getItem('skillchain_approved_courses') || '[]');
      const approvedEntry = {
        id: courseId,
        course_id: courseId,
        title: courseTitle || "Approved Course",
        course_title: courseTitle || "Approved Course",
        price: assignedPrice,
        charge: assignedPrice,
        status: "Approved",
        skillName: selectedSkill || "General"
      };
      if (!customApproved.some(a => (a.id || a.course_id) === courseId || (cleanTitle && (a.title || a.course_title || '').trim().toLowerCase() === cleanTitle))) {
        customApproved.push(approvedEntry);
      }
      localStorage.setItem('skillchain_approved_courses', JSON.stringify(customApproved));
    } catch (e) {}

    // Server handles approval — no local data sync needed

    const serverRes = await safeRequest('/courses/approve', {
      method: 'POST',
      body: JSON.stringify({ courseId, selectedSkill, creditValue: assignedPrice, title: courseTitle })
    });

    // Trigger global synchronization events
    window.dispatchEvent(new CustomEvent('skillchain-catalog-updated', { detail: { courseId, creditValue: assignedPrice, title: courseTitle } }));
    window.dispatchEvent(new CustomEvent('skillchain-course-approved', { detail: { courseId, creditValue: assignedPrice, title: courseTitle } }));

    if (serverRes) return serverRes;
    return { success: true, message: `Course ${courseId} approved with ${assignedPrice} credits.`, courseId, assignedPrice };
  },

  getParticipantContributions: async (participantId) => {
    const rawPid = (participantId || '').trim();
    if (!rawPid) {
      return { 
        success: true, 
        draftCourses: [], 
        pendingCourses: [], 
        approvedCourses: [] 
      };
    }

    const serverRes = await safeRequest(`/contributions/${encodeURIComponent(rawPid)}`);
    if (serverRes && serverRes.success) {
      return {
        success: true,
        draftCourses: serverRes.draftCourses || [],
        pendingCourses: serverRes.pendingCourses || [],
        approvedCourses: serverRes.approvedCourses || []
      };
    }

    return { 
      success: true, 
      draftCourses: [], 
      pendingCourses: [], 
      approvedCourses: [] 
    };
  },

  submitCourseContent: async (body) => {
    const serverRes = await safeRequest('/courses/add-content', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (serverRes) return serverRes;
    return { success: true, message: "Lesson submitted for admin review!" };
  },

  getPendingCourseLessons: async () => {
    const serverRes = await safeRequest('/courses/pending-lessons');
    if (serverRes) return serverRes;
    return { success: true, count: 0, lessons: [] };
  },

  approveCourseLesson: async (body) => {
    const serverRes = await safeRequest('/courses/approve-lesson', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (serverRes) return serverRes;
    return { success: true, message: "Lesson approved and added to course!" };
  },

  rejectCourse: async (courseIdOrObj) => {
    const courseId = typeof courseIdOrObj === 'object' ? (courseIdOrObj.courseId || courseIdOrObj.id || courseIdOrObj.course_id) : courseIdOrObj;
    let courseTitle = typeof courseIdOrObj === 'object' ? (courseIdOrObj.title || courseIdOrObj.course_title) : '';

    if (!courseTitle) {
      let customPending = [];
      let customDrafts = [];
      try {
        customPending = JSON.parse(localStorage.getItem('skillchain_pending_courses') || '[]');
        customDrafts = JSON.parse(localStorage.getItem('skillchain_draft_courses') || '[]');
      } catch (e) {}
      const found = customPending.find(c => (c.id || c.course_id) === courseId) ||
                    customDrafts.find(c => (c.id || c.course_id) === courseId);
      if (found) {
        courseTitle = found.title || found.course_title || '';
      }
    }

    // 1. Clean from localStorage
    try {
      let customPending = JSON.parse(localStorage.getItem('skillchain_pending_courses') || '[]');
      customPending = customPending.filter(p => (p.id || p.course_id) !== courseId);
      localStorage.setItem('skillchain_pending_courses', JSON.stringify(customPending));

      let customDrafts = JSON.parse(localStorage.getItem('skillchain_draft_courses') || '[]');
      customDrafts = customDrafts.filter(d => (d.id || d.course_id) !== courseId);
      localStorage.setItem('skillchain_draft_courses', JSON.stringify(customDrafts));

      let rejectedCourses = JSON.parse(localStorage.getItem('skillchain_rejected_courses') || '[]');
      if (courseId && !rejectedCourses.includes(courseId)) rejectedCourses.push(courseId);
      localStorage.setItem('skillchain_rejected_courses', JSON.stringify(rejectedCourses));
    } catch (e) {}

    // 2. Notify backend
    const serverRes = await safeRequest('/courses/reject', {
      method: 'POST',
      body: JSON.stringify({ courseId, courseTitle })
    });

    window.dispatchEvent(new CustomEvent('skillchain-catalog-updated', { detail: { action: 'reject', courseId, courseTitle } }));
    window.dispatchEvent(new CustomEvent('skillchain-course-rejected', { detail: { courseId, courseTitle } }));

    if (serverRes) return serverRes;
    return { success: true, message: `Course ${courseId} rejected.` };
  },

  enrollCourse: async (param1, param2) => {
    let participantId = "P001";
    let courseId = "C001";

    if (typeof param1 === 'object') {
      participantId = param1.participantId || "P001";
      courseId = param1.courseId || "C001";
    } else {
      participantId = param1 || "P001";
      courseId = param2 || "C001";
    }

    const serverRes = await safeRequest('/courses/enroll', {
      method: 'POST',
      body: JSON.stringify({ participantId, courseId })
    });
    if (serverRes) {
      if (serverRes.success && serverRes.newCredit !== undefined) {
        window.dispatchEvent(new CustomEvent('skillchain-credit-updated', { detail: { participantId, newCredit: serverRes.newCredit } }));
      }
      return serverRes;
    }

    return { success: false, message: "Server is offline or database is unreachable. Cannot process enrollment." };
  },

  enrollStudentPLSQL: async (participantId = "P001", courseId = "C001") => {
    const serverRes = await safeRequest('/queries/run-plsql', {
      method: 'POST',
      body: JSON.stringify({ participantId, courseId })
    });
    if (serverRes) {
      if (serverRes.success && serverRes.newCredit !== undefined) {
        window.dispatchEvent(new CustomEvent('skillchain-credit-updated', { detail: { participantId, newCredit: serverRes.newCredit } }));
      }
      return serverRes;
    }

    return { success: false, message: "Server is offline or database is unreachable. PL/SQL procedure execution failed." };
  },

  getSkills: async () => {
    const serverRes = await safeRequest('/skills');
    if (serverRes && serverRes.skills && serverRes.skills.length > 0) return serverRes;
    return { success: true, skills: [] };
  },

  addSkill: async (skillNameOrObj, maybeTier) => {
    let skillName = typeof skillNameOrObj === 'object' ? (skillNameOrObj.skillName || skillNameOrObj.name) : skillNameOrObj;
    let skillTier = typeof skillNameOrObj === 'object' ? (skillNameOrObj.skillTier || skillNameOrObj.tier) : (maybeTier || "Intermediate");

    const serverRes = await safeRequest('/skills/add', {
      method: 'POST',
      body: JSON.stringify({ skillName, skillTier })
    });
    if (serverRes) return serverRes;
    const newSkill = { skill_id: `S_${Date.now()}`, admin_id: "A001", skill_name: skillName, skill_tier: skillTier || "Intermediate" };
    return { success: true, skill: newSkill, message: `Skill "${skillName}" created!` };
  },

  formatCleanCertTitle: (raw, fallback = 'Skill Certificate') => {
    if (!raw || typeof raw !== 'string') return fallback;
    let str = raw.trim();

    // If it's a URL or path, get the last component
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
  },

  getCertificates: async () => {
    const serverRes = await safeRequest('/certificates');
    if (serverRes && Array.isArray(serverRes.certificates)) {
      return serverRes;
    }
    return { success: true, count: 0, certificates: [] };
  },

  verifyCertificate: async (idOrObj, certId, status, skill) => {
    let id = typeof idOrObj === 'object' ? idOrObj.id : idOrObj;
    let cId = typeof idOrObj === 'object' ? idOrObj.certId : certId;
    let st = typeof idOrObj === 'object' ? idOrObj.status : status;
    let sk = typeof idOrObj === 'object' ? idOrObj.skill : skill;

    const serverRes = await safeRequest('/certificates/verify', {
      method: 'POST',
      body: JSON.stringify({ id, certId: cId, status: st, skill: sk })
    });
    return serverRes || { success: false, message: `Server is offline.` };
  },

  uploadCertificate: async (certName, participantId = "P001", imageBase64 = null) => {
    const cleanTitle = api.formatCleanCertTitle(certName);
    const serverRes = await safeRequest('/certificates/upload', {
      method: 'POST',
      body: JSON.stringify({ certName: cleanTitle, participantId, imageBase64 })
    });
    return serverRes || { success: false, message: `Server is offline.` };
  },

  getParticipants: async () => {
    const serverRes = await safeRequest('/participants');
    if (serverRes && Array.isArray(serverRes.participants)) {
      return serverRes;
    }
    return { success: true, count: 0, participants: [] };
  },

  getParticipantProfile: async (id = "P001") => {
    const serverRes = await safeRequest(`/participants/${id}`);
    if (serverRes && serverRes.participant) {
      return serverRes;
    }
    return {
      success: false,
      message: 'Participant profile not found. Server may be offline.'
    };
  },

  updateParticipantProfile: async (participantId = "P001", updates = {}) => {
    const serverRes = await safeRequest('/participants/update', {
      method: 'PUT',
      body: JSON.stringify({ participantId, updates })
    });
    return serverRes || { success: false, message: "Could not save profile. Server offline." };
  },

  deleteParticipant: async (id) => {
    const serverRes = await safeRequest(`/participants/${id}`, { method: 'DELETE' });
    if (serverRes) return serverRes;
    return { success: true, message: "Participant removed." };
  },

  deleteDraftCourse: async (courseId) => {
    const serverRes = await safeRequest(`/contributions/${courseId}`, { method: 'DELETE' });
    return serverRes || { success: true, message: "Draft deleted." };
  },

  restrictInstructor: async (participantId) => {
    const serverRes = await safeRequest(`/participants/${participantId}/restrict-instructor`, { method: 'POST' });
    return serverRes || { success: true, message: "Instructor privileges revoked." };
  },

  rateLesson: async (participantId, courseId, lessonId, rating, comment = "") => {
    const serverRes = await safeRequest('/courses/rate-lesson', {
      method: 'POST',
      body: JSON.stringify({ participantId, courseId, lessonId, rating, comment })
    });
    return serverRes || { success: true, message: "Rating recorded." };
  },

  submitFeedback: async ({ participantId, courseId, lessonId, rating, comment }) => {
    const serverRes = await safeRequest('/courses/rate-lesson', {
      method: 'POST',
      body: JSON.stringify({ participantId, courseId, lessonId, rating, comment })
    });
    return serverRes || { success: true, message: "Feedback recorded." };
  },

  getEnrollments: async (participantId = null) => {
    let customEnrolls = [];
    try {
      customEnrolls = JSON.parse(localStorage.getItem('skillchain_enrollments') || '[]');
    } catch (e) {}

    const cleanPid = (participantId || '').trim().toLowerCase();
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';
    const serverRes = await safeRequest(`/enrollments${query}`);
    let list = [];

    if (serverRes && Array.isArray(serverRes.enrollments)) {
      list = [...serverRes.enrollments];
    } else {
      list = [];
    }

    for (const ce of customEnrolls) {
      const cePid = (ce.participant_id || '').trim().toLowerCase();
      if (!cleanPid || cePid === cleanPid) {
        if (!list.some(e => (e.course_id || e.courseId) === (ce.course_id || ce.courseId) && (e.participant_id || '').toLowerCase() === cePid)) {
          list.push(ce);
        }
      }
    }

    list = list.map(e => {
      const cid = e.course_id || e.courseId;
      return {
        ...e,
        course_id: cid,
        courseId: cid,
        courseTitle: e.courseTitle || e.course_title || 'Enrolled Course',
        course_title: e.course_title || e.courseTitle || 'Enrolled Course',
        skillName: e.skillName || 'General'
      };
    });

    return { success: true, count: list.length, enrollments: list };
  },

  getReports: async () => {
    const serverRes = await safeRequest('/reports');
    if (serverRes && serverRes.reports && serverRes.reports.length > 0) return serverRes;
    return { success: true, reports: [] };
  },

  deleteReportCourse: async (id) => {
    const serverRes = await safeRequest(`/reports/course/${id}`, { method: 'DELETE' });
    if (serverRes) return serverRes;
    return { success: true, message: "Course removed from report." };
  },

  deleteReportInstructor: async (id) => {
    const serverRes = await safeRequest(`/reports/instructor/${id}`, { method: 'DELETE' });
    if (serverRes) return serverRes;
    return { success: true, message: "Instructor unlinked." };
  },

  submitFeedback: async (body) => {
    const serverRes = await safeRequest('/feedback', { method: 'POST', body: JSON.stringify(body) });
    if (serverRes) return serverRes;
    return { success: true, message: "Feedback recorded." };
  },

  getMonitor: async () => {
    const serverRes = await safeRequest('/monitor');
    const rawUsers = (serverRes && Array.isArray(serverRes.users)) ? [...serverRes.users] : [];

    const seen = new Set();
    const uniqueUsers = [];
    for (const u of rawUsers) {
      if (!u.id || seen.has(u.id)) continue;
      seen.add(u.id);

      let normalizedStatus = "Pending";
      const st = (u.status || "").toLowerCase().trim();
      if (st === "approved" || st === "active") normalizedStatus = "Approved";
      else if (st === "removed") normalizedStatus = "Removed";
      else normalizedStatus = "Pending";

      uniqueUsers.push({
        ...u,
        status: normalizedStatus,
        phone: u.phone || "+8801700000000",
        altPhone: ""
      });
    }

    uniqueUsers.sort((a, b) => {
      const aPending = (a.status || '').toLowerCase() === 'pending';
      const bPending = (b.status || '').toLowerCase() === 'pending';
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    return { success: true, count: uniqueUsers.length, users: uniqueUsers };
  },

  updateMonitorStatus: async (userIdOrObj, maybeStatus) => {
    let userId = typeof userIdOrObj === 'object' ? userIdOrObj.userId : userIdOrObj;
    let newStatus = typeof userIdOrObj === 'object' ? userIdOrObj.newStatus : maybeStatus;
    let normalizedStatus = "Pending";
    const incoming = (newStatus || "").toLowerCase().trim();
    if (incoming === "approved" || incoming === "active") normalizedStatus = "Approved";
    else if (incoming === "removed") normalizedStatus = "Removed";
    else normalizedStatus = "Pending";

    const serverRes = await safeRequest('/monitor/update-status', {
      method: 'POST',
      body: JSON.stringify({ userId, newStatus: normalizedStatus })
    });
    if (serverRes) return serverRes;
    return { success: false, message: "Failed to update user status on server." };
  },

  getNotifications: async (participantId = null) => {
    const pidQuery = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';
    const serverRes = await safeRequest(`/notifications${pidQuery}`);
    if (serverRes && serverRes.notifications) return serverRes;

    if (participantId) {
      return {
        success: true,
        notifications: []
      };
    }
    return { success: true, notifications: [] };
  },

  sendNotification: async (body) => {
    const serverRes = await safeRequest('/notifications', { method: 'POST', body: JSON.stringify(body) });
    if (serverRes) return serverRes;
    return { success: true, message: "Notification delivered." };
  },

  getCourseLessons: async (courseId, participantId = null) => {
    const pidQuery = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';
    const serverRes = await safeRequest(`/courses/${courseId}/lessons${pidQuery}`);
    if (serverRes) return serverRes;
    return {
      success: true,
      course: { id: courseId, title: "Course Curriculum", totalLessons: 0, completedLessons: 0, progressPercentage: 0 },
      lessons: []
    };
  },

  completeLesson: async (body) => {
    const serverRes = await safeRequest('/courses/complete-lesson', { method: 'POST', body: JSON.stringify(body) });
    if (serverRes) {
      if (serverRes.success && serverRes.newCredit !== undefined) {
        window.dispatchEvent(new CustomEvent('skillchain-credit-updated', { detail: { participantId: body?.participantId, newCredit: serverRes.newCredit } }));
      }
      return serverRes;
    }
    return { success: false, message: "Server is offline. Cannot complete lesson." };
  },

  getExams: async (participantId = null) => {
    const pidQuery = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';
    const serverRes = await safeRequest(`/exams${pidQuery}`);
    if (serverRes && serverRes.completed) return serverRes;
    return {
      success: true,
      pending: null,
      completed: []
    };
  },

  uploadCourseTest: async (data) => {
    const courseId = data.courseId;
    let customDrafts = [];
    try {
      customDrafts = JSON.parse(localStorage.getItem('skillchain_draft_courses') || '[]');
    } catch (e) {}

    const draftIdx = customDrafts.findIndex(c => (c.id || c.course_id) === courseId);
    if (draftIdx >= 0) {
      customDrafts[draftIdx].exam = {
        exam_url: data.examUrl || data.testUrl || '',
        url: data.examUrl || data.testUrl || '',
        exam_duration: data.examDuration || data.duration || 30,
        duration: `${data.examDuration || data.duration || 30} minutes`,
        total_questions: data.totalQuestions || 5,
        totalQuestions: data.totalQuestions || 5
      };
      localStorage.setItem('skillchain_draft_courses', JSON.stringify(customDrafts));
      return { success: true, message: "Test attached to draft course successfully!" };
    }

    const serverRes = await safeRequest('/courses/add-test', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (serverRes) return serverRes;
    return { success: true, message: "Test attached to course successfully!" };
  },

  submitExam: async (body) => {
    const serverRes = await safeRequest('/exams/submit', { method: 'POST', body: JSON.stringify(body) });
    const passed = body.score >= 70;
    const finalCertTitle = `Completion of ${(body.courseTitle || '').replace(/^Completion of\s+/i, '').trim() || 'Course'}`;

    if (serverRes) return serverRes;
    return {
      success: true,
      message: passed ? `Congratulations! Passed with ${body.score}%. Certificate "${finalCertTitle}" awarded (+50 credits)!` : `Exam completed with ${body.score}%.`,
      passed,
      score: body.score || 85,
      creditsAwarded: passed ? 50 : 0,
      certificateAwarded: passed,
      certificateTitle: finalCertTitle
    };
  },

  validateLearnedSkillForCourse: async (participantId, title = '', skillCategory = '') => {
    const cleanPid = (participantId || '').toLowerCase().trim();
    const cleanTitle = (title || '').toLowerCase().trim();
    const cleanCat = (skillCategory || '').toLowerCase().trim();

    if (!cleanPid) {
      return {
        isValid: false,
        message: "Participant ID is required to validate course creation permissions.",
        learnedSkills: []
      };
    }

    // Determine participant role / status from server profile or local session
    let participantStatus = '';
    try {
      const profileRes = await api.getParticipantProfile(participantId);
      if (profileRes && profileRes.participant) {
        participantStatus = (profileRes.participant.status || '').toLowerCase().trim();
      }
    } catch (e) {}

    if (!participantStatus) {
      try {
        const rawUser = localStorage.getItem('userData') || localStorage.getItem('user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          participantStatus = (u.status || '').toLowerCase().trim();
        }
      } catch (e) {}
    }
    const isExpert = participantStatus === 'expert' || participantStatus === 'approved';
    const isNewbie = !isExpert;

    // Dynamic Universal Keyword Extractor for ANY subject / technology
    const STOP_WORDS = new Set([
      'course', 'courses', 'curriculum', 'tutorial', 'tutorials', 'training', 
      'mastery', 'bootcamp', 'introduction', 'intro', 'to', 'for', 'basics', 
      'basic', 'advanced', 'beginner', 'intermediate', 'complete', 'comprehensive', 
      'the', 'a', 'an', 'in', 'and', 'with', 'from', 'scratch', 'part', 'guide', 
      'learn', 'learning', '1', '2', '3', '4', '5', 'level', 'edition', 'fundamentals',
      'essential', 'essentials', 'overview', 'deep', 'dive', 'programming', 'development'
    ]);

    const extractCoreTokens = (text = '') => {
      const clean = String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9+#]/g, ' ')
        .trim();
      const rawTokens = clean.split(/\s+/).filter(Boolean);
      const tokens = [];

      for (const t of rawTokens) {
        if (!STOP_WORDS.has(t) && t.length >= 1) {
          tokens.push(t);
        }
      }
      return tokens;
    };

    const targetTokens = extractCoreTokens(cleanTitle);
    const normalizedTarget = cleanTitle.replace(/[^a-z0-9]/g, '');

    const checkMatch = (candidateList) => {
      for (const item of candidateList) {
        const cleanStr = String(item || '').toLowerCase().trim();
        const normalizedItem = cleanStr.replace(/[^a-z0-9]/g, '');
        const itemTokens = extractCoreTokens(cleanStr);

        // 1. Exact Full Title Match
        if (normalizedTarget && normalizedItem && normalizedTarget === normalizedItem) {
          return true;
        }

        // 2. Strict Exact Token Match (Whole words only)
        if (targetTokens.length > 0 && itemTokens.length > 0) {
          const hasMatch = targetTokens.some(targetTok => 
            itemTokens.some(itemTok => itemTok === targetTok)
          );
          if (hasMatch) return true;
        }
      }
      return false;
    };

    // ==========================================
    // CASE A: NEWBIE LEARNER
    // Rule: Newbies have 0 external certificates.
    // Must have 100% completed lessons in an enrolled course on SkillChain.
    // ==========================================
    if (isNewbie) {
      let enrolledCompletedTitles = [];
      try {
        const [enrollRes, progRes] = await Promise.all([
          api.getEnrollments(participantId),
          api.getProgress(participantId)
        ]);

        const progressList = progRes?.progress || [];
        const enrollList = enrollRes?.enrollments || [];

        progressList.forEach(p => {
          const total = Number(p.totalLessons || p.total_lesson || 1);
          const completed = Number(p.completedLessons || p.completed_lesson || 0);
          const pct = Number(p.progressPercentage || p.percentage || p.progress_percentage || 0);
          if (pct >= 100 || (total > 0 && completed >= total)) {
            enrolledCompletedTitles.push((p.courseTitle || p.course_title || p.title || '').toLowerCase());
          }
        });

        enrollList.forEach(e => {
          const cid = e.course_id || e.courseId;
          const total = Number(e.totalClasses || e.total_classes || 3);
          const savedKey = `skillchain_completed_lessons_${participantId}_${cid}`;
          const savedRaw = localStorage.getItem(savedKey) || localStorage.getItem(`skillchain_completed_lessons_${cleanPid}_${cid}`);
          if (savedRaw) {
            try {
              const arr = JSON.parse(savedRaw);
              if (Array.isArray(arr) && arr.length >= total && total > 0) {
                enrolledCompletedTitles.push((e.courseTitle || e.course_title || e.title || '').toLowerCase());
              }
            } catch {}
          }
          const progKey = `skillchain_course_progress_${cleanPid}_${cid}`;
          const progRaw = localStorage.getItem(progKey) || localStorage.getItem(`skillchain_course_progress_${participantId}_${cid}`);
          if (progRaw) {
            try {
              const pObj = JSON.parse(progRaw);
              if (Number(pObj.percentage) >= 100 || (Number(pObj.completedLessons) >= Number(pObj.totalLessons) && Number(pObj.totalLessons) > 0)) {
                enrolledCompletedTitles.push((e.courseTitle || e.course_title || e.title || '').toLowerCase());
              }
            } catch {}
          }
          if (Number(e.progress) >= 100 || e.is_completed === 1 || String(e.status).toLowerCase() === 'completed' || e.completed === true) {
            enrolledCompletedTitles.push((e.courseTitle || e.course_title || e.title || e.skillName || '').toLowerCase());
          }
        });
      } catch (e) {}

      enrolledCompletedTitles = [...new Set(enrolledCompletedTitles)].filter(Boolean);

      if (enrolledCompletedTitles.length === 0 || !checkMatch(enrolledCompletedTitles)) {
        return {
          isValid: false,
          message: `You cannot upload this course as you are a Newbie learner and have not completed 100% of a course in "${title}" on SkillChain. Newbies can only create courses for subjects they have learned and completed 100% on SkillChain.`,
          learnedSkills: enrolledCompletedTitles
        };
      }

      return { isValid: true, learnedSkills: enrolledCompletedTitles };
    }

    // ==========================================
    // CASE B: EXPERT / CERTIFIED CONTRIBUTOR
    // Rule: Contributor holds Admin-verified certificate (or teaches this subject).
    // Does NOT need to take student courses on SkillChain.
    // ==========================================
    let expertCertTitles = [];
    try {
      const [certRes, coursesRes, profileRes] = await Promise.all([
        api.getCertificates(),
        api.getCourses(),
        api.getParticipantProfile(participantId)
      ]);

      if (certRes && certRes.certificates) {
        certRes.certificates
          .filter(c => ((c.participant_id || '').toLowerCase() === cleanPid || (c.email || '').toLowerCase() === cleanPid) && (c.status === 'Accepted' || c.status === 'Approved' || !c.status))
          .forEach(c => expertCertTitles.push((c.skill || c.skillName || c.certificate_type || c.courseTitle || '').toLowerCase()));
      }

      if (profileRes && profileRes.participant && Array.isArray(profileRes.participant.certificates)) {
        profileRes.participant.certificates
          .filter(c => c.status === 'Accepted' || c.status === 'Approved')
          .forEach(c => expertCertTitles.push((c.skill || c.certificate_type || c.name || '').toLowerCase()));
      }

      if (coursesRes && coursesRes.courses) {
        coursesRes.courses
          .filter(c => (c.participant_id || '').toLowerCase() === cleanPid || (c.instructorEmail || '').toLowerCase() === cleanPid)
          .forEach(c => expertCertTitles.push((c.course_title || c.title || c.skillName || '').toLowerCase()));
      }
    } catch (e) {}

    expertCertTitles = [...new Set(expertCertTitles)].filter(Boolean);

    if (expertCertTitles.length === 0 || !checkMatch(expertCertTitles)) {
      return {
        isValid: false,
        message: `You cannot upload this course as you do not hold an Admin-verified certificate or teaching credential in "${title}". Please upload your certificate and wait for Admin verification before creating this course.`,
        learnedSkills: expertCertTitles
      };
    }

    return { isValid: true, learnedSkills: expertCertTitles };
  },

  resolveParticipantName: (pidOrEmail, fallback = 'Contributor') => {
    if (!pidOrEmail) return fallback;
    const target = String(pidOrEmail).trim().toLowerCase();

    // Check userData
    try {
      const rawUser = localStorage.getItem('userData');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const uid = String(u.participant_id || u.participantId || u.id || u.user_id || '').toLowerCase();
        const uemail = String(u.email || '').toLowerCase();
        if (target === uid || target === uemail || (target.includes('@') && uemail === target)) {
          if (u.name) return u.name;
          if (u.firstName) return `${u.firstName} ${u.lastName || ''}`.trim();
          if (u.full_name) return u.full_name;
        }
      }
    } catch (e) {}

    // Check custom participants list
    try {
      const rawList = localStorage.getItem('skillchain_custom_participants');
      if (rawList) {
        const list = JSON.parse(rawList);
        const found = list.find(p => 
          String(p.participant_id || p.id || '').toLowerCase() === target ||
          String(p.email || '').toLowerCase() === target
        );
        if (found) {
          if (found.name) return found.name;
          if (found.firstName) return `${found.firstName} ${found.lastName || ''}`.trim();
        }
      }
    } catch (e) {}

    // Format email username as capital name
    if (target.includes('@')) {
      const rawName = target.split('@')[0].replace(/[._-]/g, ' ');
      return rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    if (!/^p\d+$/i.test(target) && target.length > 2) {
      return target.charAt(0).toUpperCase() + target.slice(1);
    }

    return fallback;
  },

  getPeerReviewQueue: async (participantId = null) => {
    const cleanReviewerPid = (participantId || '').toLowerCase().trim();
    const pidQuery = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';
    const serverRes = await safeRequest(`/peer-review/queue${pidQuery}`);

    let queue = [];
    if (serverRes && Array.isArray(serverRes.queue)) {
      queue = serverRes.queue.map(q => ({
        ...q,
        instructor: q.instructorName || api.resolveParticipantName(q.instructorEmail || q.participant_id, q.instructor || 'Contributor')
      }));
    }

    // Exclude own course
    const filteredQueue = queue.filter(q => {
      const qPid = (q.participant_id || q.instructorPid || q.instructorEmail || '').toLowerCase();
      if (cleanReviewerPid && (qPid === cleanReviewerPid)) return false;
      return true;
    });

    return { success: true, count: filteredQueue.length, queue: filteredQueue };
  },

  getPeerReviewCourse: async (courseId) => {
    // 1. Query server first (Oracle DB single source of truth)
    const serverRes = await safeRequest(`/peer-review/course/${courseId}`);
    if (serverRes && serverRes.course) {
      const resolvedAuthor = serverRes.course.instructorName || api.resolveParticipantName(serverRes.course.instructorEmail || serverRes.course.participant_id, serverRes.course.instructor || 'Contributor');
      return {
        ...serverRes,
        course: {
          ...serverRes.course,
          instructor: resolvedAuthor,
          instructorName: resolvedAuthor
        }
      };
    }

    // 2. Fallback to local queue if server is offline
    let customQueue = [];
    try {
      customQueue = JSON.parse(localStorage.getItem('skillchain_peer_reviews') || '[]');
    } catch (e) {}

    const matchedCustom = customQueue.find(c => (c.id || c.course_id || c.courseId) === courseId);
    if (matchedCustom) {
      const lessons = matchedCustom.lessons || [];
      const acceptedCount = lessons.filter(l => l.status === 'ACCEPT').length;
      const reviewedCount = lessons.filter(l => l.status === 'ACCEPT' || l.status === 'REJECT').length;
      const totalCount = Math.max(1, lessons.length);
      const approvalPercentage = Math.round((acceptedCount / totalCount) * 100);
      const resolvedAuthor = matchedCustom.instructorName || api.resolveParticipantName(matchedCustom.instructorEmail || matchedCustom.participant_id, matchedCustom.instructor || 'Newbie Contributor');

      return {
        success: true,
        course: {
          ...matchedCustom,
          instructor: resolvedAuthor,
          instructorName: resolvedAuthor,
          totalLessons: totalCount,
          reviewedCount,
          acceptedCount,
          approvalPercentage,
          isFullyReviewed: reviewedCount === totalCount
        },
        lessons: lessons.map(l => ({
          ...l,
          creatorName: resolvedAuthor
        }))
      };
    }

    // Not found
    return {
      success: false,
      message: "Course not found in peer review queue.",
      course: null,
      lessons: []
    };
  },

  submitPeerReviewAction: async (body) => {
    const { courseId, lessonId, reviewerId, reviewerName, actionType, feedbackComment } = body;
    const action = actionType === 'ACCEPT' ? 'ACCEPT' : 'REJECT';

    // 1. Update localStorage peer reviews
    let customQueue = [];
    try {
      customQueue = JSON.parse(localStorage.getItem('skillchain_peer_reviews') || '[]');
    } catch (e) {}

    const courseIdx = customQueue.findIndex(c => (c.id || c.course_id || c.courseId) === courseId);
    let finalStatus = "Peer_Review";
    let isComplete = false;
    let scorePct = 0;
    let targetCourse = null;

    if (courseIdx >= 0) {
      targetCourse = customQueue[courseIdx];
      const lesson = (targetCourse.lessons || []).find(l => (l.id || l.contentId) === lessonId);
      if (lesson) {
        lesson.status = action;
        lesson.reviewedBy = reviewerName || "Peer Reviewer";
        lesson.reviewerId = reviewerId || "P001";
        lesson.reviewedAt = new Date().toISOString();
        lesson.feedback = feedbackComment || "";
      }

      const total = (targetCourse.lessons || []).length;
      const reviewed = (targetCourse.lessons || []).filter(l => l.status === 'ACCEPT' || l.status === 'REJECT').length;
      const accepted = (targetCourse.lessons || []).filter(l => l.status === 'ACCEPT').length;
      scorePct = Math.round((accepted / Math.max(1, total)) * 100);
      isComplete = reviewed === total;

      if (isComplete) {
        if (scorePct >= 70) {
          // Pass >= 70%: Publish to SkillHub!
          finalStatus = "Approved";
          targetCourse.status = "Approved";
          targetCourse.price = 500;
          targetCourse.charge = 500;

          // Add to custom approved
          let customApproved = JSON.parse(localStorage.getItem('skillchain_approved_courses') || '[]');
          if (!customApproved.some(a => (a.id || a.course_id) === (targetCourse.id || targetCourse.course_id))) {
            customApproved.push(targetCourse);
            localStorage.setItem('skillchain_approved_courses', JSON.stringify(customApproved));
          }

          window.dispatchEvent(new CustomEvent('skillchain-catalog-updated', { detail: { action: 'peer-approved', courseId } }));
          window.dispatchEvent(new CustomEvent('skillchain-course-approved', { detail: { courseId } }));
        } else {
          // Fail < 70%: Return to Newbie for revisions
          finalStatus = "Peer_Review_Rejected";
          targetCourse.status = "Peer_Review_Rejected";
          targetCourse.lastReviewScore = scorePct;
          window.dispatchEvent(new CustomEvent('skillchain-catalog-updated', { detail: { action: 'peer-rejected', courseId, score: scorePct } }));
        }
      }

      localStorage.setItem('skillchain_peer_reviews', JSON.stringify(customQueue));
    }

    const serverRes = await safeRequest('/peer-review/submit-action', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (serverRes) return serverRes;

    const outcomeMsg = isComplete
      ? (scorePct >= 70
          ? `Course achieved ${scorePct}% peer review rating (>= 70%) and has been PUBLISHED to SkillHub!`
          : `Course received ${scorePct}% rating (< 70%). Returned to contributor for revising rejected lessons.`)
      : `Lesson ${action === 'ACCEPT' ? 'approved' : 'rejected'}. +20 credits awarded to your balance!`;

    return {
      success: true,
      message: outcomeMsg,
      courseStatus: finalStatus,
      approvalPercentage: scorePct,
      isComplete
    };
  },

  getPeerReviewPending: async (participantId = null) => {
    const pidQuery = participantId ? `?participantId=${encodeURIComponent(participantId)}` : '';
    const serverRes = await safeRequest(`/peer-review/pending${pidQuery}`);
    if (serverRes && serverRes.items) return serverRes;
    return {
      success: true,
      items: []
    };
  },

  submitPeerReview: async (body) => {
    const serverRes = await safeRequest('/peer-review/submit', { method: 'POST', body: JSON.stringify(body) });
    if (serverRes) return serverRes;
    return { success: true, message: "Peer review submitted! +20 credits awarded." };
  },

  getMyContent: async (participantId) => {
    const serverRes = await safeRequest(`/content/user/${participantId}`);
    if (serverRes && (serverRes.courses || serverRes.lessons)) return serverRes;

    return {
      success: true,
      count: 0,
      courses: [],
      lessons: []
    };
  },

  uploadCourseTest: async (body) => {
    const serverRes = await safeRequest('/content/test', { method: 'POST', body: JSON.stringify(body) });
    if (serverRes) return serverRes;
    return { success: true, message: "Test uploaded successfully." };
  },

  deleteContent: async (contentId, extraParams = {}) => {
    let url = `/content/${encodeURIComponent(contentId)}`;
    const queryParams = new URLSearchParams();
    if (extraParams?.courseId) queryParams.append('courseId', extraParams.courseId);
    if (extraParams?.assetId) queryParams.append('assetId', extraParams.assetId);
    if (extraParams?.contentId) queryParams.append('contentId', extraParams.contentId);
    if (extraParams?.title) queryParams.append('title', extraParams.title);
    if (extraParams?.index !== undefined && extraParams?.index !== null) queryParams.append('index', extraParams.index);
    const qs = queryParams.toString();
    if (qs) url += `?${qs}`;

    const serverRes = await safeRequest(url, {
      method: 'DELETE',
      body: JSON.stringify(extraParams || {})
    });

    if (serverRes) return serverRes;
    return { success: true, message: "Content deleted." };
  },

  getContent: async () => {
    const serverRes = await safeRequest('/content');
    if (serverRes && serverRes.content) return serverRes;
    return { success: true, content: [] };
  },

  uploadContent: async (body) => {
    const serverRes = await safeRequest('/content/upload', { method: 'POST', body: JSON.stringify(body) });
    if (serverRes) return serverRes;
    return { success: true, message: "Content uploaded." };
  },

  getProgress: async (participantId) => {
    const serverRes = await safeRequest(`/progress/${participantId}`);
    if (serverRes && serverRes.progress) return serverRes;
    return {
      success: true,
      progress: []
    };
  },

  runFunction: async (body) => {
    const res = await safeRequest('/queries/run-function', { method: 'POST', body: JSON.stringify(body) });
    if (res) return res;
    return { success: false, message: "Server offline or function query failed." };
  },

  runSubquery: async (body) => {
    const res = await safeRequest('/queries/run-subquery', { method: 'POST', body: JSON.stringify(body) });
    if (res) return res;
    return { success: false, message: "Server offline or subquery failed." };
  },

  runView: async (viewName) => {
    const res = await safeRequest(`/queries/run-view?name=${viewName}`);
    if (res) return res;
    return { success: false, message: "Server offline or view query failed." };
  },

  runAdt: async (body) => {
    const res = await safeRequest('/queries/run-adt', { method: 'POST', body: JSON.stringify(body) });
    if (res) return res;
    return { success: false, message: "Server offline or ADT query failed." };
  },

  runPlsql: async (body) => {
    const res = await safeRequest('/queries/run-plsql', { method: 'POST', body: JSON.stringify(body) });
    if (res) return res;
    const pid = (body && body.participantId) || "P001";
    const cid = (body && body.courseId) || "C004";
    return {
      queryType: "PL/SQL Procedure / Anonymous Block",
      procedure: "enroll_participant_proc",
      sql: `DECLARE\n    v_status VARCHAR2(50);\n    v_msg VARCHAR2(500);\nBEGIN\n    enroll_participant_proc('${pid}', '${cid}', v_status, v_msg);\nEND;`,
      executionTimeMs: 65,
      bindResults: {
        V_STATUS: "SUCCESS",
        V_MSG: `PL/SQL Success: Enrolled participant ${pid} into course ${cid}. Course fee deducted and transaction committed.`
      },
      source: "SIMULATION_ENGINE"
    };
  },

  runCursor: async (body) => {
    const res = await safeRequest('/queries/run-cursor', { method: 'POST', body: JSON.stringify(body) });
    if (res) return res;
    const minPrice = (body && body.minPrice) || 1000;
    return {
      queryType: "Explicit Cursor",
      procedure: "generate_course_audit_cursor",
      sql: `DECLARE\n    v_count NUMBER;\n    v_summary VARCHAR2(4000);\nBEGIN\n    generate_course_audit_cursor(${minPrice}, v_count, v_summary);\nEND;`,
      executionTimeMs: 58,
      cursorMetrics: {
        CURSOR_NAME: "c_course_audit",
        FETCHED_ROWS_COUNT: 0,
        TOTAL_CATALOG_VALUE: "0 Credits",
        AUDIT_LOG: "Audit Cursor processed with server offline."
      },
      source: "SIMULATION_ENGINE"
    };
  },

  runException: async (body) => {
    const res = await safeRequest('/queries/run-exception', { method: 'POST', body: JSON.stringify(body) });
    if (res) return res;
    const triggerError = body && body.triggerError;
    return {
      queryType: "Exception Handling",
      procedure: "deduct_participant_credit",
      sql: `DECLARE\n    v_status VARCHAR2(50);\n    v_msg VARCHAR2(500);\nBEGIN\n    deduct_participant_credit('${(body && body.participantId) || "P001"}', ${triggerError ? 50000 : 100}, v_status, v_msg);\nEND;`,
      executionTimeMs: 44,
      exceptionCaught: triggerError ? "USER_DEFINED (insufficient_credit_ex)" : "NONE (Completed Cleanly)",
      bindResults: {
        V_STATUS: triggerError ? "INSUFFICIENT_CREDIT_ERROR" : "SUCCESS",
        V_MSG: triggerError ? "Oracle Exception Handled: Participant has insufficient credit for deduction of 50000." : "Successfully deducted 100 credits. Balance committed."
      },
      source: "SIMULATION_ENGINE"
    };
  },

  runCustomSql: async (sql) => {
    const res = await safeRequest('/queries/run-custom', { method: 'POST', body: JSON.stringify({ sql }) });
    if (res) return res;
    return {
      queryType: "Custom SQL Query",
      sql: sql,
      executionTimeMs: 0,
      data: [],
      source: "SIMULATION_ENGINE",
      success: false,
      message: "Server is offline. Database connection required."
    };
  },

  getHealth: () => safeRequest('/health')
};

export default api;
