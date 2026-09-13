-- ============================================================
-- SKILLCHAIN ADVANCED ORACLE SQL & PL/SQL COMPONENTS
-- Covers:
-- 1. Abstract Datatype (ADT / Object Type)
-- 2. Views (Complex Analytical Views)
-- 3. Functions (PL/SQL Stored Functions)
-- 4. Subqueries (Scalar, Nested, Correlated)
-- 5. PL/SQL (Procedures & Anonymous Blocks)
-- 6. Cursors (Explicit Cursor Traversal)
-- 7. Exception Handling (User-defined & Built-in Exceptions)
-- 8. Triggers (Compound Triggers for Live Rating Synchronization)
-- ============================================================

-- ============================================================
-- 1. ABSTRACT DATATYPE (ADT / OBJECT TYPES)
-- ============================================================

-- Drop types if already exist
BEGIN
    EXECUTE IMMEDIATE 'DROP TYPE t_participant_address FORCE';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

CREATE OR REPLACE TYPE t_participant_address AS OBJECT (
    house_no     VARCHAR2(50),
    road_no      VARCHAR2(50),
    area         VARCHAR2(50),
    city         VARCHAR2(50),
    district     VARCHAR2(50),
    division     VARCHAR2(50),
    MEMBER FUNCTION get_formatted_address RETURN VARCHAR2,
    MEMBER FUNCTION get_short_location RETURN VARCHAR2
);
/

CREATE OR REPLACE TYPE BODY t_participant_address AS
    MEMBER FUNCTION get_formatted_address RETURN VARCHAR2 IS
    BEGIN
        RETURN 'House #' || NVL(self.house_no, 'N/A') || ', Road #' || NVL(self.road_no, 'N/A') || 
               ', ' || NVL(self.area, 'N/A') || ', ' || NVL(self.city, 'N/A') || 
               ', ' || NVL(self.district, 'N/A') || ' (' || NVL(self.division, 'N/A') || ' Div.)';
    END get_formatted_address;

    MEMBER FUNCTION get_short_location RETURN VARCHAR2 IS
    BEGIN
        RETURN NVL(self.area, 'N/A') || ', ' || NVL(self.city, 'N/A');
    END get_short_location;
END;
/


-- ============================================================
-- 2. VIEWS
-- ============================================================

-- View 1: Course Analytics Overview (Joins Course, Participant, Skill, Progress, Feedback)
CREATE OR REPLACE VIEW v_course_analytics AS
SELECT 
    c.course_id,
    c.course_title,
    c.course_level,
    c.price,
    s.skill_name,
    s.skill_tier,
    p.first_name || ' ' || p.last_name AS instructor_name,
    p.email AS instructor_email,
    pr.total_lesson,
    pr.completed_lesson,
    pr.progress_percentage,
    NVL((SELECT ROUND(AVG(f.rating), 2) 
         FROM gives g 
         JOIN feedback f ON g.feedback_id = f.feedback_id 
         WHERE g.course_id = c.course_id), 0.0) AS avg_course_rating,
    NVL(p.average_rating, 0.0) AS instructor_avg_rating,
    (SELECT COUNT(*) FROM enrolls e WHERE e.course_id = c.course_id) AS total_enrolled_students
FROM course c
LEFT JOIN skill s ON c.skill_id = s.skill_id
LEFT JOIN participant p ON c.participant_id = p.participant_id
LEFT JOIN progress pr ON c.progress_id = pr.progress_id;


-- View 2: Participant Performance Overview (Joins Participant, Enrolls, Exam Attempts, Certs)
CREATE OR REPLACE VIEW v_participant_overview AS
SELECT 
    p.participant_id,
    p.first_name || ' ' || p.last_name AS full_name,
    p.email,
    p.credit,
    p.status AS account_status,
    p.average_rating,
    (SELECT COUNT(*) FROM enrolls e WHERE e.participant_id = p.participant_id) AS enrolled_courses_count,
    (SELECT COUNT(*) FROM certificate cert WHERE cert.participant_id = p.participant_id) AS verified_certs_count,
    NVL((SELECT ROUND(AVG(att.score), 2) FROM attempts att WHERE att.participant_id = p.participant_id), 0.0) AS avg_exam_score
FROM participant p;


-- ============================================================
-- 3. FUNCTIONS (PL/SQL FUNCTIONS)
-- ============================================================

-- Function 1: Determine Participant Credit Tier & Reward Multiplier
CREATE OR REPLACE FUNCTION get_participant_credit_tier (
    p_pid IN VARCHAR2
) RETURN VARCHAR2 IS
    v_credit NUMBER(10, 2);
    v_tier   VARCHAR2(50);
BEGIN
    SELECT credit INTO v_credit
    FROM participant
    WHERE participant_id = p_pid;

    IF v_credit >= 800 THEN
        v_tier := 'PLATINUM ELITE (3x Multiplier)';
    ELSIF v_credit >= 500 THEN
        v_tier := 'GOLD PRO (2x Multiplier)';
    ELSIF v_credit >= 300 THEN
        v_tier := 'SILVER SCHOLAR (1.5x Multiplier)';
    ELSE
        v_tier := 'BRONZE NEWBIE (1x Standard)';
    END IF;

    RETURN v_tier;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'UNKNOWN PARTICIPANT';
    WHEN OTHERS THEN
        RETURN 'ERROR CALCULATING TIER';
END get_participant_credit_tier;
/

-- Function 2: Calculate Discounted Course Price based on custom promotion percentage
CREATE OR REPLACE FUNCTION calculate_course_discount (
    p_course_id     IN VARCHAR2,
    p_discount_pct  IN NUMBER
) RETURN NUMBER IS
    v_original_price NUMBER(8, 2);
    v_discounted     NUMBER(8, 2);
BEGIN
    SELECT price INTO v_original_price
    FROM course
    WHERE course_id = p_course_id;

    IF p_discount_pct < 0 OR p_discount_pct > 100 THEN
        RETURN v_original_price;
    END IF;

    v_discounted := v_original_price - (v_original_price * (p_discount_pct / 100));
    RETURN ROUND(v_discounted, 2);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 0.00;
    WHEN OTHERS THEN
        RETURN 0.00;
END calculate_course_discount;
/


-- ============================================================
-- 4. SUBQUERIES (COMPLEX ANALYTICAL SUBQUERIES)
-- ============================================================

-- Subquery A: Scalar Comparison Subquery (Find high-credit participants above platform average)
-- SELECT participant_id, first_name || ' ' || last_name AS name, credit 
-- FROM participant 
-- WHERE credit > (SELECT AVG(credit) FROM participant);

-- Subquery B: Correlated Subquery (Find courses priced above average for their specific Skill category)
-- SELECT c.course_id, c.course_title, c.price, c.skill_id
-- FROM course c
-- WHERE c.price >= (
--     SELECT AVG(c2.price) 
--     FROM course c2 
--     WHERE c2.skill_id = c.skill_id
-- );

-- Subquery C: Set Membership Subquery with NOT EXISTS (Find skills with no active courses enrolled)
-- SELECT s.skill_id, s.skill_name, s.skill_tier
-- FROM skill s
-- WHERE NOT EXISTS (
--     SELECT 1 FROM course c 
--     JOIN enrolls e ON c.course_id = e.course_id 
--     WHERE c.skill_id = s.skill_id
-- );


-- ============================================================
-- 5. PL/SQL STORED PROCEDURES & ANONYMOUS BLOCKS
-- ============================================================

-- Procedure 1: Safe Course Enrollment with transaction check
CREATE OR REPLACE PROCEDURE enroll_participant_proc (
    p_pid    IN  VARCHAR2,
    p_cid    IN  VARCHAR2,
    p_status OUT VARCHAR2,
    p_msg    OUT VARCHAR2
) IS
    v_already_enrolled NUMBER := 0;
    v_course_title     VARCHAR2(150);
    v_course_price     NUMBER(8, 2);
    v_participant_cr   NUMBER(10, 2);
    v_instructor_pid   VARCHAR2(50);
BEGIN
    -- 1. Check if participant exists
    SELECT credit INTO v_participant_cr
    FROM participant
    WHERE participant_id = p_pid;

    -- 2. Check if course exists
    SELECT course_title, price, participant_id INTO v_course_title, v_course_price, v_instructor_pid
    FROM course
    WHERE course_id = p_cid;

    -- 3. Check if already enrolled
    SELECT COUNT(*) INTO v_already_enrolled
    FROM enrolls
    WHERE participant_id = p_pid AND course_id = p_cid;

    IF v_already_enrolled > 0 THEN
        p_status := 'ALREADY_ENROLLED';
        p_msg    := 'Participant ' || p_pid || ' is already enrolled in ' || v_course_title;
        RETURN;
    END IF;

    -- 4. Check if participant has sufficient credits
    IF v_participant_cr < v_course_price THEN
        p_status := 'INSUFFICIENT_CREDITS';
        p_msg    := 'Insufficient credits! You have ' || v_participant_cr || ' Credits, but this course requires ' || v_course_price || ' Credits. Earn credits by contributing content or uploading verified certificates.';
        RETURN;
    END IF;

    -- 5. Deduct course price from participant's credits
    UPDATE participant
    SET credit = credit - v_course_price
    WHERE participant_id = p_pid;

    -- 6. Credit the course instructor (if different from student)
    IF v_instructor_pid IS NOT NULL AND v_instructor_pid <> p_pid THEN
        UPDATE participant
        SET credit = credit + v_course_price
        WHERE participant_id = v_instructor_pid;
    END IF;

    -- 7. Insert enrollment record
    INSERT INTO enrolls (participant_id, course_id, enroll_date)
    VALUES (p_pid, p_cid, SYSDATE);

    -- 8. Insert system notification for enrolled student
    INSERT INTO notification (notification_id, message, type)
    VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), '[Participant: ' || p_pid || '] Successfully enrolled into ' || v_course_title || ' (-' || v_course_price || ' Credits spent).', 'Enrollment');

    COMMIT;

    p_status := 'SUCCESS';
    p_msg    := 'Successfully enrolled into ' || v_course_title || '! ' || v_course_price || ' Credits spent. Remaining balance: ' || (v_participant_cr - v_course_price) || ' Credits.';
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_status := 'NOT_FOUND';
        p_msg    := 'Invalid Participant ID or Course ID.';
        ROLLBACK;
    WHEN OTHERS THEN
        p_status := 'ERROR';
        p_msg    := 'Enrollment failed: ' || SQLERRM;
        ROLLBACK;
END enroll_participant_proc;
/


-- ============================================================
-- 6. EXPLICIT CURSOR PROCEDURE
-- ============================================================

CREATE OR REPLACE PROCEDURE generate_course_audit_cursor (
    p_min_price       IN  NUMBER,
    p_processed_count OUT NUMBER,
    p_audit_summary   OUT VARCHAR2
) IS
    -- Explicit Cursor Declaration
    CURSOR c_course_audit IS
        SELECT 
            c.course_id,
            c.course_title,
            c.course_level,
            c.price,
            NVL(s.skill_name, 'Unassigned') AS skill_name
        FROM course c
        LEFT JOIN skill s ON c.skill_id = s.skill_id
        WHERE c.price >= p_min_price
        ORDER BY c.price DESC;

    v_rec            c_course_audit%ROWTYPE;
    v_total_price    NUMBER(12, 2) := 0;
    v_count          NUMBER := 0;
    v_log_buffer     VARCHAR2(4000) := '';
BEGIN
    -- Open explicit cursor
    OPEN c_course_audit;
    
    LOOP
        -- Fetch record from cursor
        FETCH c_course_audit INTO v_rec;
        EXIT WHEN c_course_audit%NOTFOUND;

        v_count := v_count + 1;
        v_total_price := v_total_price + v_rec.price;
        
        IF v_count <= 5 THEN
            v_log_buffer := v_log_buffer || '[' || v_rec.course_id || '] ' || 
                            v_rec.course_title || ' (' || TO_CHAR(v_rec.price) || ' Credits); ';
        END IF;
    END LOOP;

    -- Close explicit cursor
    CLOSE c_course_audit;

    p_processed_count := v_count;
    p_audit_summary := 'Audit Processed ' || v_count || ' courses with total value ' || 
                       TO_CHAR(v_total_price, '999,990.00') || ' Credits. Details: ' || v_log_buffer;
EXCEPTION
    WHEN OTHERS THEN
        IF c_course_audit%ISOPEN THEN
            CLOSE c_course_audit;
        END IF;
        p_processed_count := 0;
        p_audit_summary := 'Cursor error: ' || SQLERRM;
END generate_course_audit_cursor;
/


-- ============================================================
-- 7. EXCEPTION HANDLING PROCEDURE (USER-DEFINED & BUILT-IN)
-- ============================================================

CREATE OR REPLACE PROCEDURE deduct_participant_credit (
    p_pid       IN  VARCHAR2,
    p_amount    IN  NUMBER,
    p_status    OUT VARCHAR2,
    p_msg       OUT VARCHAR2
) IS
    -- User-defined Exception declarations
    insufficient_credit_ex EXCEPTION;
    negative_amount_ex     EXCEPTION;
    account_frozen_ex      EXCEPTION;

    v_current_credit NUMBER(10, 2);
    v_status         VARCHAR2(50);
BEGIN
    -- Validation 1: Negative amount check
    IF p_amount <= 0 THEN
        RAISE negative_amount_ex;
    END IF;

    -- Built-in NO_DATA_FOUND will be triggered if p_pid does not exist
    SELECT credit, status INTO v_current_credit, v_status
    FROM participant
    WHERE participant_id = p_pid;

    -- Validation 2: Account status check
    IF v_status = 'Rejected' THEN
        RAISE account_frozen_ex;
    END IF;

    -- Validation 3: Insufficient credit check
    IF v_current_credit < p_amount THEN
        RAISE insufficient_credit_ex;
    END IF;

    -- Perform Deduction
    UPDATE participant
    SET credit = credit - p_amount
    WHERE participant_id = p_pid;

    COMMIT;

    p_status := 'SUCCESS';
    p_msg    := 'Successfully deducted ' || p_amount || ' credits. Remaining balance: ' || 
                (v_current_credit - p_amount) || ' credits.';

EXCEPTION
    -- Catch user-defined exception 1
    WHEN negative_amount_ex THEN
        p_status := 'INVALID_AMOUNT_ERROR';
        p_msg    := 'Exception Handled: Deduction amount must be greater than zero.';
        ROLLBACK;

    -- Catch user-defined exception 2
    WHEN insufficient_credit_ex THEN
        p_status := 'INSUFFICIENT_CREDIT_ERROR';
        p_msg    := 'Exception Handled: Participant has insufficient credit (' || 
                    v_current_credit || ') for requested deduction of ' || p_amount || '.';
        ROLLBACK;

    -- Catch user-defined exception 3
    WHEN account_frozen_ex THEN
        p_status := 'ACCOUNT_FROZEN_ERROR';
        p_msg    := 'Exception Handled: Account for ' || p_pid || ' is Rejected/Frozen. Transaction denied.';
        ROLLBACK;

    -- Catch built-in exception: NO_DATA_FOUND
    WHEN NO_DATA_FOUND THEN
        p_status := 'NO_DATA_FOUND_ERROR';
        p_msg    := 'Exception Handled: Participant ID "' || p_pid || '" was not found in the database.';
        ROLLBACK;

    -- Catch built-in exception: VALUE_ERROR
    WHEN VALUE_ERROR THEN
        p_status := 'VALUE_ERROR';
        p_msg    := 'Exception Handled: Numeric or value error in parameters.';
        ROLLBACK;

    -- Catch all other unhandled exceptions
    WHEN OTHERS THEN
        p_status := 'DATABASE_ERROR';
        p_msg    := 'Exception Handled [Code ' || SQLCODE || ']: ' || SQLERRM;
        ROLLBACK;
END deduct_participant_credit;
/


-- ============================================================
-- 8. TRIGGERS (AUTOMATED RATING SYNCHRONIZATION)
-- ============================================================

-- Helper Procedure: Recalculates and updates participant.average_rating for a given instructor
CREATE OR REPLACE PROCEDURE recalculate_instructor_rating (
    p_instructor_id IN VARCHAR2
) IS
    v_avg_rating NUMBER(3, 2);
BEGIN
    IF p_instructor_id IS NULL THEN
        RETURN;
    END IF;

    -- Compute aggregate arithmetic mean rating across all courses created by this instructor
    SELECT NVL(ROUND(AVG(f.rating), 2), 0.00)
    INTO v_avg_rating
    FROM feedback f
    JOIN gives g ON g.feedback_id = f.feedback_id
    WHERE g.course_id IN (
        SELECT course_id FROM course WHERE participant_id = p_instructor_id
    );

    -- Update instructor's average_rating in PARTICIPANT table
    UPDATE participant
    SET average_rating = v_avg_rating
    WHERE participant_id = p_instructor_id;

EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error recalculating instructor rating for ' || p_instructor_id || ': ' || SQLERRM);
END recalculate_instructor_rating;
/


-- Compound Trigger on GIVES:
-- Fires when reviews are linked, reassigned, or unlinked to courses.
-- Uses Compound Trigger to safely avoid ORA-04091 mutating table errors.
CREATE OR REPLACE TRIGGER trg_sync_rating_on_gives
FOR INSERT OR UPDATE OR DELETE ON gives
COMPOUND TRIGGER

    TYPE t_course_list IS TABLE OF VARCHAR2(50) INDEX BY PLS_INTEGER;
    g_courses t_course_list;
    g_idx     PLS_INTEGER := 0;

    BEFORE STATEMENT IS
    BEGIN
        g_courses.DELETE;
        g_idx := 0;
    END BEFORE STATEMENT;

    AFTER EACH ROW IS
    BEGIN
        IF INSERTING OR UPDATING THEN
            IF :NEW.course_id IS NOT NULL THEN
                g_idx := g_idx + 1;
                g_courses(g_idx) := :NEW.course_id;
            END IF;
        END IF;

        IF DELETING OR UPDATING THEN
            IF :OLD.course_id IS NOT NULL THEN
                g_idx := g_idx + 1;
                g_courses(g_idx) := :OLD.course_id;
            END IF;
        END IF;
    END AFTER EACH ROW;

    AFTER STATEMENT IS
        TYPE t_inst_set IS TABLE OF BOOLEAN INDEX BY VARCHAR2(50);
        v_instructors t_inst_set;
        v_inst_id     VARCHAR2(50);
        v_course_id   VARCHAR2(50);
    BEGIN
        -- Find distinct instructors for all affected courses
        FOR i IN 1..g_courses.COUNT LOOP
            v_course_id := g_courses(i);
            FOR c IN (SELECT participant_id FROM course WHERE course_id = v_course_id AND participant_id IS NOT NULL) LOOP
                v_instructors(c.participant_id) := TRUE;
            END LOOP;
        END LOOP;

        -- Recalculate average rating for each affected instructor
        v_inst_id := v_instructors.FIRST;
        WHILE v_inst_id IS NOT NULL LOOP
            recalculate_instructor_rating(v_inst_id);
            v_inst_id := v_instructors.NEXT(v_inst_id);
        END LOOP;
    END AFTER STATEMENT;

END trg_sync_rating_on_gives;
/


-- Compound Trigger on FEEDBACK:
-- Fires when an existing review rating is updated or deleted.
-- Uses Compound Trigger to safely avoid ORA-04091 mutating table errors.
CREATE OR REPLACE TRIGGER trg_sync_rating_on_feedback
FOR UPDATE OF rating OR DELETE ON feedback
COMPOUND TRIGGER

    TYPE t_fb_list IS TABLE OF VARCHAR2(50) INDEX BY PLS_INTEGER;
    g_feedbacks t_fb_list;
    g_idx       PLS_INTEGER := 0;

    BEFORE STATEMENT IS
    BEGIN
        g_feedbacks.DELETE;
        g_idx := 0;
    END BEFORE STATEMENT;

    AFTER EACH ROW IS
    BEGIN
        IF UPDATING THEN
            IF :NEW.feedback_id IS NOT NULL THEN
                g_idx := g_idx + 1;
                g_feedbacks(g_idx) := :NEW.feedback_id;
            END IF;
        END IF;

        IF DELETING THEN
            IF :OLD.feedback_id IS NOT NULL THEN
                g_idx := g_idx + 1;
                g_feedbacks(g_idx) := :OLD.feedback_id;
            END IF;
        END IF;
    END AFTER EACH ROW;

    AFTER STATEMENT IS
        TYPE t_inst_set IS TABLE OF BOOLEAN INDEX BY VARCHAR2(50);
        v_instructors t_inst_set;
        v_inst_id     VARCHAR2(50);
        v_fb_id       VARCHAR2(50);
    BEGIN
        -- Find instructors of courses associated with these feedback IDs
        FOR i IN 1..g_feedbacks.COUNT LOOP
            v_fb_id := g_feedbacks(i);
            FOR rec IN (
                SELECT c.participant_id
                FROM gives g
                JOIN course c ON g.course_id = c.course_id
                WHERE g.feedback_id = v_fb_id
                  AND c.participant_id IS NOT NULL
            ) LOOP
                v_instructors(rec.participant_id) := TRUE;
            END LOOP;
        END LOOP;

        -- Recalculate average rating for each affected instructor
        v_inst_id := v_instructors.FIRST;
        WHILE v_inst_id IS NOT NULL LOOP
            recalculate_instructor_rating(v_inst_id);
            v_inst_id := v_instructors.NEXT(v_inst_id);
        END LOOP;
    END AFTER STATEMENT;

END trg_sync_rating_on_feedback;
/


-- Initial synchronization for all existing instructors
BEGIN
    FOR inst IN (SELECT DISTINCT participant_id FROM course WHERE participant_id IS NOT NULL) LOOP
        recalculate_instructor_rating(inst.participant_id);
    END LOOP;
END;
/

