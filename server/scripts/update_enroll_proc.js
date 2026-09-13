const { executeOracle } = require("../config/database");

async function main() {
  const plsql = `
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
    v_instructor_pid   VARCHAR2(20);
BEGIN
    -- 1. Check if participant exists
    SELECT credit INTO v_participant_cr
    FROM participant
    WHERE participant_id = p_pid;

    -- 2. Check if course exists
    SELECT course_title, price, participant_id INTO v_course_title, v_course_price, v_instructor_pid
    FROM course
    WHERE course_id = p_cid;

    -- 2b. Check if participant is the course instructor
    IF v_instructor_pid IS NOT NULL AND v_instructor_pid = p_pid THEN
        p_status := 'OWN_COURSE';
        p_msg    := 'Instructors cannot enroll in their own course.';
        RETURN;
    END IF;

    -- 3. Check if already enrolled
    SELECT COUNT(*) INTO v_already_enrolled
    FROM enrolls
    WHERE participant_id = p_pid AND course_id = p_cid;

    IF v_already_enrolled > 0 THEN
        p_status := 'ALREADY_ENROLLED';
        p_msg    := 'You are already enrolled in ' || v_course_title || '.';
        RETURN;
    END IF;

    -- 4. Check if participant has sufficient credit
    IF v_participant_cr < v_course_price THEN
        p_status := 'INSUFFICIENT_CREDITS';
        p_msg    := 'Insufficient credits! You have ' || v_participant_cr || ' credits, but this course requires ' || v_course_price || ' credits. Earn credits by contributing content or uploading verified certificates.';
        RETURN;
    END IF;

    -- 5. Deduct course price from participant
    UPDATE participant
    SET credit = credit - v_course_price
    WHERE participant_id = p_pid;

    -- 6. Award credit to instructor if different from participant
    IF v_instructor_pid IS NOT NULL AND v_instructor_pid <> p_pid THEN
        UPDATE participant
        SET credit = credit + v_course_price
        WHERE participant_id = v_instructor_pid;
    END IF;

    -- 7. Insert enrollment record
    INSERT INTO enrolls (participant_id, course_id, enroll_date)
    VALUES (p_pid, p_cid, SYSDATE);

    -- 8. Insert system notification for enrolled student
    INSERT INTO notification (notification_id, message, type, generated_at)
    VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), '[Participant: ' || p_pid || '] Successfully enrolled into ' || v_course_title || ' (-' || v_course_price || ' Credits spent).', 'Enrollment', SYSDATE);

    -- 9. Insert system notification for course instructor (if different)
    IF v_instructor_pid IS NOT NULL AND v_instructor_pid <> p_pid THEN
        INSERT INTO notification (notification_id, message, type, generated_at)
        VALUES ('N' || TO_CHAR(SYSTIMESTAMP, 'YYYYMMDDHH24MISSFF6') || DBMS_RANDOM.STRING('X', 4), '[Participant: ' || v_instructor_pid || '] New student enrolled in your course "' || v_course_title || '" (+' || v_course_price || ' Credits earned)!', 'success', SYSDATE);
    END IF;

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
`;

  const res = await executeOracle(plsql);
  console.log("Procedure updated successfully in Oracle DB:", res);
}

main().catch(console.error);
