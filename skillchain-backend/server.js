const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Enable "Thick" mode for Oracle 11g
try {
    oracledb.initOracleClient({ libDir: 'D:\\oracle instant client\\instantclient_19_32' }); 
} catch (err) {
    console.error('Error initializing Oracle Client:', err);
    process.exit(1);
}

// Database Connection Helper
async function getDbConnection() {
    return await oracledb.getConnection({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectionString: process.env.DB_CONNECTION_STRING,
    });
}

// ==========================================
// TEST ENDPOINT
// ==========================================
app.get('/api/test-connection', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        const result = await connection.execute(`SELECT 'Oracle 11g Connected Successfully!' AS status FROM DUAL`);
        res.status(200).json({ success: true, message: result.rows[0][0] });
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ success: false, error: 'Database connection failed' });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 1. SKILLHUB API (Requirement: SUBQUERY)
// ==========================================
app.get('/api/courses', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        
        // Ekhane Subquery use kore total class count kora hocche
        const sql = `
            SELECT 
                c.course_id, 
                c.course_title, 
                c.course_level, 
                c.price,
                (SELECT COUNT(*) FROM course_asset ca WHERE ca.course_id = c.course_id) AS total_classes
            FROM course c
            ORDER BY c.course_id ASC
        `;
        
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json(result.rows); 
        
    } catch (err) {
        console.error('Error fetching courses:', err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 2. MODAL API (Requirement: VIEW + FUNCTION)
// ==========================================
app.get('/api/course-details/:id', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        
        // Ekhane amra Verify table JOIN korechi jate shudhu 'Verified' certificate gulo ashe
        const sql = `
            SELECT 
                v.instructor_name, v.email, v.address_city,
                get_course_avg_rating(:id) AS avg_rating,
                (SELECT LISTAGG(phone_number, ', ') WITHIN GROUP (ORDER BY phone_number) FROM participant_phone WHERE participant_id = v.participant_id) as phone,
                NVL((SELECT LISTAGG(s.skill_name, ',') WITHIN GROUP (ORDER BY s.skill_name) 
                 FROM certificate c 
                 JOIN updates u ON c.certificate_id = u.certificate_id 
                 JOIN skill s ON u.skill_id = s.skill_id 
                 JOIN verify vf ON c.certificate_id = vf.certificate_id
                 WHERE c.participant_id = v.participant_id AND vf.verification_status = 'Verified'), '') as certificates
            FROM course_instructor_view v
            WHERE v.course_id = :id
        `;
        
        const result = await connection.execute(sql, [req.params.id], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json(result.rows[0]); 
    } catch (err) {
        console.error('Error fetching course details:', err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 3. LESSON LIST API (Requirement: PL/SQL, CURSOR, EXCEPTION)
// ==========================================
app.get('/api/lessons/:id', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        
        // Ekhane PL/SQL procedure call kora hocche
        const sql = `BEGIN get_course_lessons(:id, :cursor); END;`;
        const result = await connection.execute(sql, {
            id: req.params.id,
            cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
        });
        
        const resultSet = result.outBinds.cursor;
        const rows = await resultSet.getRows();
        await resultSet.close();
        
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error fetching lessons:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 4. ADMIN MONITOR API
// ==========================================
app.get('/api/admin/monitor', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        const sql = `
            SELECT 
                p.participant_id, p.first_name, p.last_name, p.email, 
                TO_CHAR(p.date_of_birth, 'DD/MM/YYYY') AS dob,
                p.address_house, p.address_road, p.address_area, p.address_city, p.address_district, p.address_division,
                m.monitor_status,
                (SELECT LISTAGG(phone_number, ', ') WITHIN GROUP (ORDER BY phone_number) 
                 FROM participant_phone pp WHERE pp.participant_id = p.participant_id) AS phone_numbers
            FROM participant p
            JOIN monitor m ON p.participant_id = m.participant_id
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json(result.rows); 
    } catch (err) {
        console.error('Error fetching monitor data:', err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 5. ADMIN VERIFY CERTIFICATES API
// ==========================================
app.get('/api/admin/certificates', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        const sql = `
            SELECT 
                c.certificate_id AS cert_id,
                NVL(s.skill_name, '') AS skill_name,
                CASE 
                    WHEN v.verification_status = 'Verified' THEN 'Accepted'
                    WHEN v.verification_status IS NULL THEN 'Pending'
                    ELSE v.verification_status 
                END AS status,
                c.certificate_asset AS asset_url
            FROM certificate c
            LEFT JOIN verify v ON c.certificate_id = v.certificate_id
            LEFT JOIN updates u ON c.certificate_id = u.certificate_id
            LEFT JOIN skill s ON u.skill_id = s.skill_id
            ORDER BY c.certificate_id ASC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json(result.rows); 
    } catch (err) {
        console.error('Error fetching certificates:', err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) await connection.close();
    }
});



// ==========================================
// 6. ADMIN REPORT API (Requirement: VIEW)
// ==========================================
app.get('/api/admin/reports', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        
        // Tomar toiri kora VIEW theke data ana hocche
        const sql = `SELECT * FROM course_report_view`;
        
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json(result.rows); 
        
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

// ==========================================
// 7. GET SKILLS API
// ==========================================
app.get('/api/skills', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        // Database theke sob skill_name anchi dropdown e dekhanor jonno
        const sql = `SELECT skill_name FROM skill ORDER BY skill_name ASC`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 8. APPROVAL LIST API
// ==========================================
app.get('/api/admin/approval-list', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        const sql = `
            SELECT 
                c.course_id, c.course_title, c.course_level, 
                p.first_name || ' ' || p.last_name AS instructor_name,
                NVL(s.skill_name, 'None') as current_skill
            FROM course c
            JOIN participant p ON c.participant_id = p.participant_id
            LEFT JOIN skill s ON c.skill_id = s.skill_id
            ORDER BY c.course_id ASC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// 9. APPROVE COURSE API (Requirement: ADT - Abstract Datatype)
// ==========================================
app.post('/api/admin/approve-course', async (req, res) => {
    let connection;
    try {
        const { courseId, courseName, courseLevel, skillName } = req.body;
        connection = await getDbConnection();
        
        // Oracle 11g Compatible PL/SQL Block
        const sql = `
            DECLARE
                v_course course_info_obj;
                v_skill_id VARCHAR2(50);
            BEGIN
                -- 1. ADT Object Initialize kora
                v_course := course_info_obj(:c_name, :c_level);
                
                -- 2. Selected Skill er ID ber kora (Oracle 11g support er jonno ROWNUM <= 1 use kora holo)
                SELECT skill_id INTO v_skill_id FROM skill WHERE skill_name = :s_name AND ROWNUM <= 1;
                
                -- 3. Course Table e Skill update kora
                UPDATE course SET skill_id = v_skill_id WHERE course_id = :c_id;
                
                -- 4. ADT theke value niye return kora
                :ret_msg := 'Success! ADT Object Processed: ' || v_course.course_name || ' (' || v_course.course_level || ')';
            END;
        `;
        
        const result = await connection.execute(sql, {
            c_name: courseName,
            c_level: courseLevel,
            s_name: skillName,
            c_id: courseId,
            ret_msg: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
        }, { autoCommit: true }); 
        
        res.status(200).json({ success: true, message: result.outBinds.ret_msg });
    } catch (err) {
        console.error('Error approving course:', err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});



// ==========================================
// 10. ADMIN DASHBOARD STATS API
// ==========================================
app.get('/api/admin/dashboard-stats', async (req, res) => {
    let connection;
    try {
        connection = await getDbConnection();
        
        const sql = `
            SELECT 
                (SELECT COUNT(*) FROM participant) AS total_users,
                (SELECT COUNT(DISTINCT participant_id) FROM course) AS total_instructors,
                (SELECT COUNT(*) FROM course WHERE skill_id IS NOT NULL) AS active_courses,
                (SELECT COUNT(*) FROM verify WHERE verification_status = 'Verified') AS verified_certs,
                (SELECT COUNT(*) FROM monitor WHERE monitor_status = 'Pending') AS pending_users,
                (SELECT COUNT(*) FROM skill) AS total_skills,
                (SELECT COUNT(*) FROM course WHERE skill_id IS NULL) AS pending_courses,
                (SELECT COUNT(*) FROM verify WHERE verification_status = 'Pending') AS pending_certs,
                (SELECT COUNT(*) FROM course WHERE course_level = 'Beginner') AS beginner_courses,
                (SELECT COUNT(*) FROM course WHERE course_level = 'Intermediate') AS intermediate_courses,
                (SELECT COUNT(*) FROM course WHERE course_level = 'Advanced') AS expert_courses
            FROM DUAL
        `;
        
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.status(200).json(result.rows[0]); // Shudhu prothom row ta return korchi
        
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (connection) await connection.close();
    }
});



// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});