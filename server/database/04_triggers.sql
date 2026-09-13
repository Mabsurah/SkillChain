-- ============================================================
-- SKILLCHAIN DATABASE TRIGGERS
-- Covers:
-- 1. Stored Procedure: recalculate_instructor_rating
-- 2. Compound Trigger: trg_sync_rating_on_gives (on GIVES)
-- 3. Compound Trigger: trg_sync_rating_on_feedback (on FEEDBACK)
-- 4. Initial Sync Block
--
-- Mutating Table (ORA-04091) Safety:
-- Uses Oracle 11g+ COMPOUND TRIGGERS to collect affected keys at row-level
-- and perform aggregate SELECT AVG and UPDATE at statement-level.
-- ============================================================

SET ECHO ON;
SET FEEDBACK ON;
SET SERVEROUTPUT ON;

-- 1. Helper Procedure: Recalculates and updates participant.average_rating for a given instructor
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

    DBMS_OUTPUT.PUT_LINE('Updated instructor ' || p_instructor_id || ' average rating to: ' || v_avg_rating);
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error recalculating instructor rating for ' || p_instructor_id || ': ' || SQLERRM);
END recalculate_instructor_rating;
/


-- 2. Compound Trigger on GIVES:
-- Fires when reviews are linked, reassigned, or unlinked to courses.
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


-- 3. Compound Trigger on FEEDBACK:
-- Fires when an existing review rating is updated or deleted.
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


-- 4. Initial synchronization for all existing instructors
BEGIN
    FOR inst IN (SELECT DISTINCT participant_id FROM course WHERE participant_id IS NOT NULL) LOOP
        recalculate_instructor_rating(inst.participant_id);
    END LOOP;
END;
/

COMMIT;
EXIT;

