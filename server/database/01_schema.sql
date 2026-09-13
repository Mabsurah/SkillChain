-- ============================================================
-- SKILLCHAIN ORACLE DATABASE SCHEMA DDL
-- Table creation order strictly respects foreign key dependencies
-- ============================================================

-- Drop existing tables in reverse dependency order (Child -> Parent)
BEGIN
    FOR t IN (SELECT table_name FROM user_tables WHERE table_name IN (
        'VERIFY', 'MONITOR', 'GENERATES', 'UPDATES', 'ATTEMPTS', 'UPLOADS',
        'CERTIFICATE', 'ENROLLS', 'GIVES', 'FEEDBACK', 'EXAM', 'COURSE_ASSET',
        'CONTENT', 'COURSE', 'PARTICIPANT_SKILL', 'PARTICIPANT_PHONE',
        'PARTICIPANT', 'NOTIFICATION', 'PROGRESS', 'SKILL', 'ADMIN', 'USERS'
    )) LOOP
        EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS';
    END LOOP;
END;
/

-- Drop and re-create Sequences
BEGIN
    FOR s IN (SELECT sequence_name FROM user_sequences WHERE sequence_name = 'SEQ_PARTICIPANT_ID') LOOP
        EXECUTE IMMEDIATE 'DROP SEQUENCE ' || s.sequence_name;
    END LOOP;
END;
/

CREATE SEQUENCE seq_participant_id
START WITH 35
INCREMENT BY 1
NOCACHE
NOCYCLE;

-- ============================================================
-- 1. USERS
-- Parent of ADMIN and PARTICIPANT
-- ============================================================
CREATE TABLE users (
    email    VARCHAR2(100) NOT NULL,
    password VARCHAR2(255) NOT NULL,
    CONSTRAINT users_email_pk PRIMARY KEY ( email )
);

-- ============================================================
-- 2. ADMIN
-- Parent of SKILL, PARTICIPANT, FEEDBACK, CERTIFICATE, MONITOR, VERIFY
-- ============================================================
CREATE TABLE admin (
    admin_id VARCHAR2(50) NOT NULL,
    email    VARCHAR2(100) NOT NULL,
    CONSTRAINT admin_admin_id_pk PRIMARY KEY ( admin_id ),
    CONSTRAINT admin_email_fk FOREIGN KEY ( email )
        REFERENCES users ( email )
            ON DELETE CASCADE
);

-- ============================================================
-- 3. SKILL
-- Child of ADMIN, Parent of COURSE and UPDATES
-- ============================================================
CREATE TABLE skill (
    skill_id   VARCHAR2(50) NOT NULL,
    admin_id   VARCHAR2(50),
    skill_name VARCHAR2(100) NOT NULL,
    skill_tier VARCHAR2(20),
    CONSTRAINT skill_skill_id_pk PRIMARY KEY ( skill_id ),
    CONSTRAINT skill_admin_id_fk FOREIGN KEY ( admin_id )
        REFERENCES admin ( admin_id )
            ON DELETE SET NULL
);

-- ============================================================
-- 4. PROGRESS
-- Parent of COURSE
-- ============================================================
CREATE TABLE progress (
    progress_id         VARCHAR2(50) NOT NULL,
    total_lesson        NUMBER(5, 0),
    completed_lesson    NUMBER(5, 0),
    progress_percentage NUMBER(5, 2) GENERATED ALWAYS AS (
        CASE
            WHEN total_lesson > 0 THEN
                ( completed_lesson / total_lesson ) * 100
            ELSE
                0
        END
    ),
    CONSTRAINT progress_progress_id_pk PRIMARY KEY ( progress_id )
);

-- ============================================================
-- 5. NOTIFICATION
-- Parent of GENERATES
-- ============================================================
CREATE TABLE notification (
    notification_id VARCHAR2(50) NOT NULL,
    message         VARCHAR2(500) NOT NULL,
    generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type            VARCHAR2(50),
    CONSTRAINT notif_nid_pk PRIMARY KEY ( notification_id )
);

-- ============================================================
-- 6. PARTICIPANT
-- Child of USERS & ADMIN
-- Parent of PARTICIPANT_PHONE, PARTICIPANT_SKILL, COURSE,
-- CONTENT, GIVES, ENROLLS, CERTIFICATE, UPLOADS, ATTEMPTS,
-- UPDATES, MONITOR
-- ============================================================
CREATE TABLE participant (
    participant_id   VARCHAR2(50) NOT NULL,
    email            VARCHAR2(100) NOT NULL,
    admin_id         VARCHAR2(50),
    first_name       VARCHAR2(50),
    last_name        VARCHAR2(50),
    credit           NUMBER(10, 2) DEFAULT 0.00,
    status           VARCHAR2(50) DEFAULT 'Pending',
    average_rating   NUMBER(3, 2) DEFAULT 0.00,
    address_house    VARCHAR2(50),
    address_road     VARCHAR2(50),
    address_area     VARCHAR2(50),
    address_city     VARCHAR2(50),
    address_district VARCHAR2(50),
    address_division VARCHAR2(50),
    date_of_birth    DATE,
    CONSTRAINT participant_participant_id_pk PRIMARY KEY ( participant_id ),
    CONSTRAINT participant_email_fk FOREIGN KEY ( email )
        REFERENCES users ( email )
            ON DELETE CASCADE,
    CONSTRAINT participant_admin_id_fk FOREIGN KEY ( admin_id )
        REFERENCES admin ( admin_id )
            ON DELETE SET NULL
);

-- ============================================================
-- 7. PARTICIPANT_PHONE
-- Child of PARTICIPANT
-- ============================================================
CREATE TABLE participant_phone (
    participant_id VARCHAR2(50) NOT NULL,
    phone_number   VARCHAR2(20) NOT NULL,
    CONSTRAINT participant_phone_pid_phone_pk PRIMARY KEY ( participant_id, phone_number ),
    CONSTRAINT participant_phone_pid_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 8. PARTICIPANT_SKILL
-- Child of PARTICIPANT
-- ============================================================
CREATE TABLE participant_skill (
    participant_id VARCHAR2(50) NOT NULL,
    skill          VARCHAR2(100) NOT NULL,
    CONSTRAINT part_skill_pid_skill_pk PRIMARY KEY ( participant_id, skill ),
    CONSTRAINT part_skill_pid_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 9. COURSE
-- Child of PARTICIPANT, SKILL, PROGRESS
-- Parent of ENROLLS, COURSE_ASSET, EXAM, GIVES, UPLOADS, ATTEMPTS
-- ============================================================
CREATE TABLE course (
    course_id      VARCHAR2(50) NOT NULL,
    course_title   VARCHAR2(150) NOT NULL,
    course_level   VARCHAR2(50),
    price          NUMBER(8, 2) DEFAULT 0.00,
    participant_id VARCHAR2(50),
    skill_id       VARCHAR2(50),
    progress_id    VARCHAR2(50),
    CONSTRAINT course_course_id_pk PRIMARY KEY ( course_id ),
    CONSTRAINT course_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE SET NULL,
    CONSTRAINT course_skill_id_fk FOREIGN KEY ( skill_id )
        REFERENCES skill ( skill_id )
            ON DELETE SET NULL,
    CONSTRAINT course_progress_id_fk FOREIGN KEY ( progress_id )
        REFERENCES progress ( progress_id )
            ON DELETE SET NULL
);

-- ============================================================
-- 10. CONTENT
-- Child of PARTICIPANT
-- Parent of COURSE_ASSET, UPLOADS, GENERATES
-- (Created BEFORE course_asset to satisfy foreign key requirement)
-- ============================================================
CREATE TABLE content (
    content_id       VARCHAR2(50) NOT NULL,
    participant_id   VARCHAR2(50),
    content_url      VARCHAR2(255),
    content_title    VARCHAR2(150),
    content_status   VARCHAR2(50) DEFAULT 'Published',
    content_duration NUMBER,
    CONSTRAINT content_content_id_pk PRIMARY KEY ( content_id ),
    CONSTRAINT content_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE SET NULL
);

-- ============================================================
-- 11. COURSE_ASSET
-- Child of COURSE and CONTENT
-- ============================================================
CREATE TABLE course_asset (
    asset_id       VARCHAR2(50) NOT NULL,
    course_id      VARCHAR2(50) NOT NULL,
    asset_title    VARCHAR2(150),
    asset_url      VARCHAR2(255),
    content_id     VARCHAR2(50),
    asset_duration NUMBER,
    CONSTRAINT course_asset_asset_id_cid_pk PRIMARY KEY ( asset_id, course_id ),
    CONSTRAINT course_asset_course_id_fk FOREIGN KEY ( course_id )
        REFERENCES course ( course_id )
            ON DELETE CASCADE,
    CONSTRAINT course_asset_content_id_fk FOREIGN KEY ( content_id )
        REFERENCES content ( content_id )
            ON DELETE SET NULL
);

-- ============================================================
-- 12. EXAM
-- Child of COURSE
-- Parent of ATTEMPTS, GENERATES
-- ============================================================
CREATE TABLE exam (
    exam_id       VARCHAR2(50) NOT NULL,
    exam_url      VARCHAR2(255),
    course_id     VARCHAR2(50) NOT NULL,
    exam_status   VARCHAR2(20) DEFAULT 'Pending',
    exam_duration NUMBER,
    result        VARCHAR2(50),
    CONSTRAINT exam_exam_id_pk PRIMARY KEY ( exam_id ),
    CONSTRAINT exam_course_id_fk FOREIGN KEY ( course_id )
        REFERENCES course ( course_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 13. FEEDBACK
-- Child of ADMIN, Parent of GIVES
-- ============================================================
CREATE TABLE feedback (
    feedback_id  VARCHAR2(50) NOT NULL,
    comment_text VARCHAR2(500),
    rating       NUMBER(2, 1),
    admin_id     VARCHAR2(50),
    CONSTRAINT feedback_feedback_id_pk PRIMARY KEY ( feedback_id ),
    CONSTRAINT feedback_rating_chk CHECK ( rating >= 0 AND rating <= 5 ),
    CONSTRAINT feedback_admin_id_fk FOREIGN KEY ( admin_id )
        REFERENCES admin ( admin_id )
            ON DELETE SET NULL
);

-- ============================================================
-- 14. GIVES
-- Child of PARTICIPANT, COURSE, FEEDBACK
-- ============================================================
CREATE TABLE gives (
    participant_id VARCHAR2(50) NOT NULL,
    course_id      VARCHAR2(50) NOT NULL,
    feedback_id    VARCHAR2(50) NOT NULL,
    CONSTRAINT gives_pid_cid_fid_pk PRIMARY KEY ( participant_id, course_id, feedback_id ),
    CONSTRAINT gives_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE,
    CONSTRAINT gives_course_id_fk FOREIGN KEY ( course_id )
        REFERENCES course ( course_id )
            ON DELETE CASCADE,
    CONSTRAINT gives_feedback_id_fk FOREIGN KEY ( feedback_id )
        REFERENCES feedback ( feedback_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 15. ENROLLS
-- Child of PARTICIPANT and COURSE
-- ============================================================
CREATE TABLE enrolls (
    participant_id VARCHAR2(50) NOT NULL,
    course_id      VARCHAR2(50) NOT NULL,
    enroll_date    DATE DEFAULT SYSDATE,
    CONSTRAINT enrolls_pid_cid_pk PRIMARY KEY ( participant_id, course_id ),
    CONSTRAINT enrolls_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE,
    CONSTRAINT enrolls_course_id_fk FOREIGN KEY ( course_id )
        REFERENCES course ( course_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 16. CERTIFICATE
-- Child of ADMIN and PARTICIPANT
-- Parent of UPDATES and VERIFY
-- ============================================================
CREATE TABLE certificate (
    certificate_id    VARCHAR2(50) NOT NULL,
    certificate_type  VARCHAR2(100),
    certificate_asset VARCHAR2(255),
    admin_id          VARCHAR2(50),
    participant_id    VARCHAR2(50),
    issue_date        DATE DEFAULT SYSDATE,
    CONSTRAINT certificate_certificate_id_pk PRIMARY KEY ( certificate_id ),
    CONSTRAINT certificate_admin_id_fk FOREIGN KEY ( admin_id )
        REFERENCES admin ( admin_id )
            ON DELETE SET NULL,
    CONSTRAINT certificate_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 17. UPLOADS
-- Child of PARTICIPANT, COURSE, CONTENT
-- ============================================================
CREATE TABLE uploads (
    participant_id VARCHAR2(50) NOT NULL,
    course_id      VARCHAR2(50) NOT NULL,
    content_id     VARCHAR2(50) NOT NULL,
    CONSTRAINT uploads_pid_cid_content_id_pk PRIMARY KEY ( participant_id, course_id, content_id ),
    CONSTRAINT uploads_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE,
    CONSTRAINT uploads_course_id_fk FOREIGN KEY ( course_id )
        REFERENCES course ( course_id )
            ON DELETE CASCADE,
    CONSTRAINT uploads_content_id_fk FOREIGN KEY ( content_id )
        REFERENCES content ( content_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 18. ATTEMPTS
-- Child of PARTICIPANT, COURSE, EXAM
-- ============================================================
CREATE TABLE attempts (
    participant_id VARCHAR2(50) NOT NULL,
    course_id      VARCHAR2(50) NOT NULL,
    exam_id        VARCHAR2(50) NOT NULL,
    attempt_date   DATE DEFAULT SYSDATE,
    score          NUMBER(5, 2),
    CONSTRAINT attempts_pid_cid_exam_id_pk PRIMARY KEY ( participant_id, course_id, exam_id ),
    CONSTRAINT attempts_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE,
    CONSTRAINT attempts_course_id_fk FOREIGN KEY ( course_id )
        REFERENCES course ( course_id )
            ON DELETE CASCADE,
    CONSTRAINT attempts_exam_id_fk FOREIGN KEY ( exam_id )
        REFERENCES exam ( exam_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 19. UPDATES
-- Child of CERTIFICATE, PARTICIPANT, SKILL
-- ============================================================
CREATE TABLE updates (
    certificate_id VARCHAR2(50) NOT NULL,
    participant_id VARCHAR2(50) NOT NULL,
    skill_id       VARCHAR2(50) NOT NULL,
    CONSTRAINT updates_cid_pid_skill_id_pk PRIMARY KEY ( certificate_id, participant_id, skill_id ),
    CONSTRAINT updates_certificate_id_fk FOREIGN KEY ( certificate_id )
        REFERENCES certificate ( certificate_id )
            ON DELETE CASCADE,
    CONSTRAINT updates_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE,
    CONSTRAINT updates_skill_id_fk FOREIGN KEY ( skill_id )
        REFERENCES skill ( skill_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 20. GENERATES
-- Child of CONTENT, NOTIFICATION, EXAM
-- ============================================================
CREATE TABLE generates (
    content_id      VARCHAR2(50) NOT NULL,
    notification_id VARCHAR2(50) NOT NULL,
    exam_id         VARCHAR2(50) NOT NULL,
    CONSTRAINT generates_con_id_nid_eid_pk PRIMARY KEY ( content_id, notification_id, exam_id ),
    CONSTRAINT generates_content_id_fk FOREIGN KEY ( content_id )
        REFERENCES content ( content_id )
            ON DELETE CASCADE,
    CONSTRAINT generates_nid_fk FOREIGN KEY ( notification_id )
        REFERENCES notification ( notification_id )
            ON DELETE CASCADE,
    CONSTRAINT generates_exam_id_fk FOREIGN KEY ( exam_id )
        REFERENCES exam ( exam_id )
            ON DELETE CASCADE
);

-- ============================================================
-- 21. MONITOR
-- Child of PARTICIPANT and ADMIN
-- Note: admin_id is NULLABLE to support ON DELETE SET NULL
-- ============================================================
CREATE TABLE monitor (
    participant_id VARCHAR2(50) NOT NULL,
    admin_id       VARCHAR2(50),
    monitor_status VARCHAR2(20) DEFAULT 'Pending',
    monitored_at   DATE DEFAULT SYSDATE,
    CONSTRAINT monitor_participant_id_fk FOREIGN KEY ( participant_id )
        REFERENCES participant ( participant_id )
            ON DELETE CASCADE,
    CONSTRAINT monitor_admin_id_fk FOREIGN KEY ( admin_id )
        REFERENCES admin ( admin_id )
            ON DELETE SET NULL
);

-- ============================================================
-- 22. VERIFY
-- Child of ADMIN and CERTIFICATE
-- Note: admin_id is NULLABLE to support ON DELETE SET NULL
-- ============================================================
CREATE TABLE verify (
    admin_id            VARCHAR2(50),
    certificate_id      VARCHAR2(50) NOT NULL,
    verification_status VARCHAR2(20) DEFAULT 'Pending',
    verified_at         DATE DEFAULT SYSDATE,
    CONSTRAINT verify_admin_id_fk FOREIGN KEY ( admin_id )
        REFERENCES admin ( admin_id )
            ON DELETE SET NULL,
    CONSTRAINT verify_certificate_id_fk FOREIGN KEY ( certificate_id )
        REFERENCES certificate ( certificate_id )
            ON DELETE CASCADE
);
