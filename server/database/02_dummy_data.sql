-- ============================================================
-- SKILLCHAIN DUMMY DATA INSERTIONS
-- Ordered strictly according to Parent -> Child dependencies
-- ============================================================

-- ============================================================
-- 1. USERS
-- Parent of ADMIN and PARTICIPANT
-- ============================================================
INSERT ALL
    INTO Users (Email, Password) VALUES ('admin1@gmail.com', 'Admin@123')
    INTO Users (Email, Password) VALUES ('admin2@gmail.com', 'Admin@456')
    INTO Users (Email, Password) VALUES ('admin3@gmail.com', 'Admin@789')
    INTO Users (Email, Password) VALUES ('admin4@gmail.com', 'Admin@321')
    INTO Users (Email, Password) VALUES ('admin5@gmail.com', 'Admin@654')
    INTO Users (Email, Password) VALUES ('rahim@gmail.com', 'Rahim@123')
    INTO Users (Email, Password) VALUES ('sadia@gmail.com', 'Sadia@123')
    INTO Users (Email, Password) VALUES ('tanvir@gmail.com', 'Tanvir@123')
    INTO Users (Email, Password) VALUES ('nusrat@gmail.com', 'Nusrat@123')
    INTO Users (Email, Password) VALUES ('fahim@gmail.com', 'Fahim@123')
SELECT * FROM dual;

-- ============================================================
-- 2. ADMIN
-- Parent of SKILL, PARTICIPANT, FEEDBACK, CERTIFICATE, MONITOR, VERIFY
-- ============================================================
INSERT ALL
    INTO Admin (Admin_id, Email) VALUES ('A001', 'admin1@gmail.com')
    INTO Admin (Admin_id, Email) VALUES ('A002', 'admin2@gmail.com')
    INTO Admin (Admin_id, Email) VALUES ('A003', 'admin3@gmail.com')
    INTO Admin (Admin_id, Email) VALUES ('A004', 'admin4@gmail.com')
    INTO Admin (Admin_id, Email) VALUES ('A005', 'admin5@gmail.com')
SELECT * FROM dual;

-- ============================================================
-- 3. SKILL
-- Child of ADMIN, Parent of COURSE
-- ============================================================
INSERT ALL
    INTO Skill (Skill_id, Admin_id, Skill_name, Skill_tier) VALUES ('S001', 'A001', 'C++ Programming', 'Advanced')
    INTO Skill (Skill_id, Admin_id, Skill_name, Skill_tier) VALUES ('S002', 'A002', 'Web Development', 'Intermediate')
    INTO Skill (Skill_id, Admin_id, Skill_name, Skill_tier) VALUES ('S003', 'A003', 'Python Programming', 'Advanced')
    INTO Skill (Skill_id, Admin_id, Skill_name, Skill_tier) VALUES ('S004', 'A004', 'Database Management', 'Intermediate')
    INTO Skill (Skill_id, Admin_id, Skill_name, Skill_tier) VALUES ('S005', 'A005', 'Machine Learning', 'Advanced')
SELECT * FROM dual;

-- ============================================================
-- 4. PROGRESS
-- Parent of COURSE
-- ============================================================
INSERT ALL
    INTO Progress (Progress_id, Total_Lesson, Completed_Lesson) VALUES ('PR001', 20, 18)
    INTO Progress (Progress_id, Total_Lesson, Completed_Lesson) VALUES ('PR002', 15, 10)
    INTO Progress (Progress_id, Total_Lesson, Completed_Lesson) VALUES ('PR003', 25, 20)
    INTO Progress (Progress_id, Total_Lesson, Completed_Lesson) VALUES ('PR004', 30, 15)
    INTO Progress (Progress_id, Total_Lesson, Completed_Lesson) VALUES ('PR005', 10, 10)
SELECT * FROM dual;

-- ============================================================
-- 5. NOTIFICATION
-- Parent of GENERATES
-- ============================================================
INSERT ALL
    INTO Notification (Notification_id, Message, Type) VALUES ('N001', 'Your course progress has been updated.', 'Progress')
    INTO Notification (Notification_id, Message, Type) VALUES ('N002', 'Your exam is now available.', 'Exam')
    INTO Notification (Notification_id, Message, Type) VALUES ('N003', 'You have completed the course successfully.', 'Completion')
    INTO Notification (Notification_id, Message, Type) VALUES ('N004', 'Your certificate has been verified.', 'Certificate')
    INTO Notification (Notification_id, Message, Type) VALUES ('N005', 'New learning content is available.', 'Content')
SELECT * FROM dual;

-- ============================================================
-- 6. PARTICIPANT
-- Child of USERS and ADMIN
-- ============================================================
INSERT ALL
    INTO Participant (Participant_id, Email, Admin_id, First_Name, Last_Name, Credit, Status, Average_Rating, Address_House, Address_Road, Address_Area, Address_City, Address_District, Address_Division, Date_of_Birth)
    VALUES ('P001', 'rahim@gmail.com', 'A001', 'Rahim', 'Ahmed', 500.00, 'Newbie', 4.50, '12', 'Mirpur Road', 'Mirpur', 'Dhaka', 'Dhaka', 'Dhaka', TO_DATE('15-05-2003', 'DD-MM-YYYY'))

    INTO Participant (Participant_id, Email, Admin_id, First_Name, Last_Name, Credit, Status, Average_Rating, Address_House, Address_Road, Address_Area, Address_City, Address_District, Address_Division, Date_of_Birth)
    VALUES ('P002', 'sadia@gmail.com', 'A002', 'Sadia', 'Islam', 350.00, 'Newbie', 4.80, '25', 'Dhanmondi Road', 'Dhanmondi', 'Dhaka', 'Dhaka', 'Dhaka', TO_DATE('21-08-2002', 'DD-MM-YYYY'))

    INTO Participant (Participant_id, Email, Admin_id, First_Name, Last_Name, Credit, Status, Average_Rating, Address_House, Address_Road, Address_Area, Address_City, Address_District, Address_Division, Date_of_Birth)
    VALUES ('P003', 'tanvir@gmail.com', 'A003', 'Tanvir', 'Hossain', 700.00, 'Expert', 4.90, '18', 'Zindabazar Road', 'Zindabazar', 'Sylhet', 'Sylhet', 'Sylhet', TO_DATE('10-02-2004', 'DD-MM-YYYY'))

    INTO Participant (Participant_id, Email, Admin_id, First_Name, Last_Name, Credit, Status, Average_Rating, Address_House, Address_Road, Address_Area, Address_City, Address_District, Address_Division, Date_of_Birth)
    VALUES ('P004', 'nusrat@gmail.com', 'A004', 'Nusrat', 'Jahan', 250.00, 'Expert', 4.20, '7', 'College Road', 'Uttara', 'Dhaka', 'Dhaka', 'Dhaka', TO_DATE('05-11-2003', 'DD-MM-YYYY'))

    INTO Participant (Participant_id, Email, Admin_id, First_Name, Last_Name, Credit, Status, Average_Rating, Address_House, Address_Road, Address_Area, Address_City, Address_District, Address_Division, Date_of_Birth)
    VALUES ('P005', 'fahim@gmail.com', 'A005', 'Fahim', 'Hasan', 900.00, 'Expert', 4.70, '31', 'Station Road', 'Kotwali', 'Chattogram', 'Chattogram', 'Chattogram', TO_DATE('17-12-2001', 'DD-MM-YYYY'))
SELECT * FROM dual;

-- ============================================================
-- 7. PARTICIPANT_PHONE
-- Child of PARTICIPANT
-- ============================================================
INSERT ALL
    INTO Participant_Phone (Participant_id, Phone_Number) VALUES ('P001', '01711111111')
    INTO Participant_Phone (Participant_id, Phone_Number) VALUES ('P002', '01722222222')
    INTO Participant_Phone (Participant_id, Phone_Number) VALUES ('P003', '01733333333')
    INTO Participant_Phone (Participant_id, Phone_Number) VALUES ('P004', '01744444444')
    INTO Participant_Phone (Participant_id, Phone_Number) VALUES ('P005', '01755555555')
SELECT * FROM dual;

-- ============================================================
-- 8. PARTICIPANT_SKILL
-- Child of PARTICIPANT
-- ============================================================
INSERT ALL
    INTO Participant_Skill (Participant_id, Skill) VALUES ('P001', 'C++ Programming')
    INTO Participant_Skill (Participant_id, Skill) VALUES ('P002', 'Web Development')
    INTO Participant_Skill (Participant_id, Skill) VALUES ('P003', 'Python Programming')
    INTO Participant_Skill (Participant_id, Skill) VALUES ('P004', 'Database Management')
    INTO Participant_Skill (Participant_id, Skill) VALUES ('P005', 'Machine Learning')
SELECT * FROM dual;

-- ============================================================
-- 9. COURSE
-- Child of PARTICIPANT, SKILL, PROGRESS
-- ============================================================
INSERT ALL
    INTO Course (Course_id, Course_Title, Course_level, Price, Participant_id, Skill_id, Progress_id)
    VALUES ('C001', 'Advanced C++ Programming', 'Advanced', 1200.00, 'P001', 'S001', 'PR001')

    INTO Course (Course_id, Course_Title, Course_level, Price, Participant_id, Skill_id, Progress_id)
    VALUES ('C002', 'Full Stack Web Development', 'Intermediate', 1500.00, 'P002', 'S002', 'PR002')

    INTO Course (Course_id, Course_Title, Course_level, Price, Participant_id, Skill_id, Progress_id)
    VALUES ('C003', 'Python for Data Science', 'Advanced', 1300.00, 'P003', 'S003', 'PR003')

    INTO Course (Course_id, Course_Title, Course_level, Price, Participant_id, Skill_id, Progress_id)
    VALUES ('C004', 'Oracle Database Management', 'Intermediate', 1000.00, 'P004', 'S004', 'PR004')

    INTO Course (Course_id, Course_Title, Course_level, Price, Participant_id, Skill_id, Progress_id)
    VALUES ('C005', 'Introduction to Machine Learning', 'Advanced', 1800.00, 'P005', 'S005', 'PR005')
SELECT * FROM dual;

-- ============================================================
-- 10. CONTENT
-- Child of PARTICIPANT
-- ============================================================
INSERT ALL
    INTO Content (Content_id, Participant_id, Content_URL, Content_Title, Content_Status, Content_duration)
    VALUES ('CT001', 'P001', 'https://skillchain.com/content/cpp1', 'Advanced C++ Concepts', 'Published', 120)

    INTO Content (Content_id, Participant_id, Content_URL, Content_Title, Content_Status, Content_duration)
    VALUES ('CT002', 'P002', 'https://skillchain.com/content/web1', 'React and Node.js', 'Published', 150)

    INTO Content (Content_id, Participant_id, Content_URL, Content_Title, Content_Status, Content_duration)
    VALUES ('CT003', 'P003', 'https://skillchain.com/content/python1', 'Python Data Analysis', 'Published', 100)

    INTO Content (Content_id, Participant_id, Content_URL, Content_Title, Content_Status, Content_duration)
    VALUES ('CT004', 'P004', 'https://skillchain.com/content/db1', 'Oracle SQL Fundamentals', 'Published', 90)

    INTO Content (Content_id, Participant_id, Content_URL, Content_Title, Content_Status, Content_duration)
    VALUES ('CT005', 'P005', 'https://skillchain.com/content/ml1', 'Machine Learning Basics', 'Published', 180)
SELECT * FROM dual;

-- ============================================================
-- 11. COURSE_ASSET
-- Child of COURSE and CONTENT
-- ============================================================
INSERT ALL
    INTO Course_Asset (Asset_id, Course_id, Asset_Title, Asset_URL, Content_id, Asset_duration)
    VALUES ('AS001', 'C001', 'C++ Lecture Series', 'https://skillchain.com/assets/cpp', 'CT001', 120)

    INTO Course_Asset (Asset_id, Course_id, Asset_Title, Asset_URL, Content_id, Asset_duration)
    VALUES ('AS002', 'C002', 'Full Stack Tutorial', 'https://skillchain.com/assets/web', 'CT002', 150)

    INTO Course_Asset (Asset_id, Course_id, Asset_Title, Asset_URL, Content_id, Asset_duration)
    VALUES ('AS003', 'C003', 'Python Data Science Lessons', 'https://skillchain.com/assets/python', 'CT003', 100)

    INTO Course_Asset (Asset_id, Course_id, Asset_Title, Asset_URL, Content_id, Asset_duration)
    VALUES ('AS004', 'C004', 'Oracle Database Lessons', 'https://skillchain.com/assets/oracle', 'CT004', 90)

    INTO Course_Asset (Asset_id, Course_id, Asset_Title, Asset_URL, Content_id, Asset_duration)
    VALUES ('AS005', 'C005', 'Machine Learning Lessons', 'https://skillchain.com/assets/ml', 'CT005', 180)
SELECT * FROM dual;

-- ============================================================
-- 12. EXAM
-- Child of COURSE
-- ============================================================
INSERT ALL
    INTO Exam (Exam_id, Exam_URL, Course_id, Exam_status, Exam_duration, Result)
    VALUES ('E001', 'https://skillchain.com/exam/cpp', 'C001', 'Completed', 60, '88')

    INTO Exam (Exam_id, Exam_URL, Course_id, Exam_status, Exam_duration, Result)
    VALUES ('E002', 'https://skillchain.com/exam/web', 'C002', 'Completed', 75, '81')

    INTO Exam (Exam_id, Exam_URL, Course_id, Exam_status, Exam_duration, Result)
    VALUES ('E003', 'https://skillchain.com/exam/python', 'C003', 'Completed', 60, '92')

    INTO Exam (Exam_id, Exam_URL, Course_id, Exam_status, Exam_duration, Result)
    VALUES ('E004', 'https://skillchain.com/exam/oracle', 'C004', 'Pending', 60, '0')

    INTO Exam (Exam_id, Exam_URL, Course_id, Exam_status, Exam_duration, Result)
    VALUES ('E005', 'https://skillchain.com/exam/ml', 'C005', 'Completed', 90, '95')
SELECT * FROM dual;

-- ============================================================
-- 13. FEEDBACK
-- Child of ADMIN
-- ============================================================
INSERT ALL
    INTO Feedback (Feedback_id, Comment_Text, Rating, Admin_id)
    VALUES ('F001', 'Excellent course content and examples.', 4.8, 'A001')

    INTO Feedback (Feedback_id, Comment_Text, Rating, Admin_id)
    VALUES ('F002', 'Very useful but some topics were difficult.', 4.2, 'A002')

    INTO Feedback (Feedback_id, Comment_Text, Rating, Admin_id)
    VALUES ('F003', 'Great explanation and practical exercises.', 4.9, 'A003')

    INTO Feedback (Feedback_id, Comment_Text, Rating, Admin_id)
    VALUES ('F004', 'Good database examples.', 4.0, 'A004')

    INTO Feedback (Feedback_id, Comment_Text, Rating, Admin_id)
    VALUES ('F005', 'Very comprehensive course.', 4.7, 'A005')
SELECT * FROM dual;

-- ============================================================
-- 14. GIVES
-- Child of PARTICIPANT, COURSE, FEEDBACK
-- ============================================================
INSERT ALL
    INTO Gives (Participant_id, Course_id, Feedback_id) VALUES ('P001', 'C001', 'F001')
    INTO Gives (Participant_id, Course_id, Feedback_id) VALUES ('P002', 'C002', 'F002')
    INTO Gives (Participant_id, Course_id, Feedback_id) VALUES ('P003', 'C003', 'F003')
    INTO Gives (Participant_id, Course_id, Feedback_id) VALUES ('P004', 'C004', 'F004')
    INTO Gives (Participant_id, Course_id, Feedback_id) VALUES ('P005', 'C005', 'F005')
SELECT * FROM dual;

-- ============================================================
-- 15. ENROLLS
-- Child of PARTICIPANT and COURSE
-- ============================================================
INSERT ALL
    INTO Enrolls (Participant_id, Course_id) VALUES ('P001', 'C001')
    INTO Enrolls (Participant_id, Course_id) VALUES ('P002', 'C002')
    INTO Enrolls (Participant_id, Course_id) VALUES ('P003', 'C003')
    INTO Enrolls (Participant_id, Course_id) VALUES ('P004', 'C004')
    INTO Enrolls (Participant_id, Course_id) VALUES ('P005', 'C005')
SELECT * FROM dual;

-- ============================================================
-- 16. CERTIFICATE
-- Child of ADMIN and PARTICIPANT
-- ============================================================
INSERT ALL
    INTO Certificate (Certificate_id, Certificate_type, Certificate_Asset, Admin_id, Participant_id)
    VALUES ('CERT001', 'C++ Programming', 'https://skillchain.com/certificates/CERT001', 'A001', 'P001')

    INTO Certificate (Certificate_id, Certificate_type, Certificate_Asset, Admin_id, Participant_id)
    VALUES ('CERT002', 'Web Development', 'https://skillchain.com/certificates/CERT002', 'A002', 'P002')

    INTO Certificate (Certificate_id, Certificate_type, Certificate_Asset, Admin_id, Participant_id)
    VALUES ('CERT003', 'Python Programming', 'https://skillchain.com/certificates/CERT003', 'A003', 'P003')

    INTO Certificate (Certificate_id, Certificate_type, Certificate_Asset, Admin_id, Participant_id)
    VALUES ('CERT004', 'Database Management', 'https://skillchain.com/certificates/CERT004', 'A004', 'P004')

    INTO Certificate (Certificate_id, Certificate_type, Certificate_Asset, Admin_id, Participant_id)
    VALUES ('CERT005', 'Machine Learning', 'https://skillchain.com/certificates/CERT005', 'A005', 'P005')
SELECT * FROM dual;

-- ============================================================
-- 17. UPLOADS
-- Child of PARTICIPANT, COURSE, CONTENT
-- ============================================================
INSERT ALL
    INTO Uploads (Participant_id, Course_id, Content_id) VALUES ('P001', 'C001', 'CT001')
    INTO Uploads (Participant_id, Course_id, Content_id) VALUES ('P002', 'C002', 'CT002')
    INTO Uploads (Participant_id, Course_id, Content_id) VALUES ('P003', 'C003', 'CT003')
    INTO Uploads (Participant_id, Course_id, Content_id) VALUES ('P004', 'C004', 'CT004')
    INTO Uploads (Participant_id, Course_id, Content_id) VALUES ('P005', 'C005', 'CT005')
SELECT * FROM dual;

-- ============================================================
-- 18. ATTEMPTS
-- Child of PARTICIPANT, COURSE, EXAM
-- ============================================================
INSERT ALL
    INTO Attempts (Participant_id, Course_id, Exam_id, Score) VALUES ('P001', 'C001', 'E001', 88.0)
    INTO Attempts (Participant_id, Course_id, Exam_id, Score) VALUES ('P002', 'C002', 'E002', 81.0)
    INTO Attempts (Participant_id, Course_id, Exam_id, Score) VALUES ('P003', 'C003', 'E003', 92.0)
    INTO Attempts (Participant_id, Course_id, Exam_id, Score) VALUES ('P004', 'C004', 'E004', 0.0)
    INTO Attempts (Participant_id, Course_id, Exam_id, Score) VALUES ('P005', 'C005', 'E005', 95.0)
SELECT * FROM dual;

-- ============================================================
-- 19. UPDATES
-- Child of CERTIFICATE, PARTICIPANT, SKILL
-- ============================================================
INSERT ALL
    INTO Updates (Certificate_id, Participant_id, Skill_id) VALUES ('CERT001', 'P001', 'S001')
    INTO Updates (Certificate_id, Participant_id, Skill_id) VALUES ('CERT002', 'P002', 'S002')
    INTO Updates (Certificate_id, Participant_id, Skill_id) VALUES ('CERT003', 'P003', 'S003')
    INTO Updates (Certificate_id, Participant_id, Skill_id) VALUES ('CERT004', 'P004', 'S004')
    INTO Updates (Certificate_id, Participant_id, Skill_id) VALUES ('CERT005', 'P005', 'S005')
SELECT * FROM dual;

-- ============================================================
-- 20. GENERATES
-- Child of CONTENT, NOTIFICATION, EXAM
-- ============================================================
INSERT ALL
    INTO Generates (Content_id, Notification_id, Exam_id) VALUES ('CT001', 'N001', 'E001')
    INTO Generates (Content_id, Notification_id, Exam_id) VALUES ('CT002', 'N002', 'E002')
    INTO Generates (Content_id, Notification_id, Exam_id) VALUES ('CT003', 'N003', 'E003')
    INTO Generates (Content_id, Notification_id, Exam_id) VALUES ('CT004', 'N004', 'E004')
    INTO Generates (Content_id, Notification_id, Exam_id) VALUES ('CT005', 'N005', 'E005')
SELECT * FROM dual;

-- ============================================================
-- 21. MONITOR
-- Child of PARTICIPANT and ADMIN
-- ============================================================
INSERT ALL
    INTO Monitor (Participant_id, Admin_id, Monitor_status) VALUES ('P001', 'A001', 'Pending')
    INTO Monitor (Participant_id, Admin_id, Monitor_status) VALUES ('P002', 'A002', 'Accepted')
    INTO Monitor (Participant_id, Admin_id, Monitor_status) VALUES ('P003', 'A003', 'Pending')
    INTO Monitor (Participant_id, Admin_id, Monitor_status) VALUES ('P004', 'A004', 'Accepted')
    INTO Monitor (Participant_id, Admin_id, Monitor_status) VALUES ('P005', 'A005', 'Rejected')
SELECT * FROM dual;

-- ============================================================
-- 22. VERIFY
-- Child of ADMIN and CERTIFICATE
-- ============================================================
INSERT ALL
    INTO Verify (Admin_id, Certificate_id, Verification_status) VALUES ('A001', 'CERT001', 'Accepted')
    INTO Verify (Admin_id, Certificate_id, Verification_status) VALUES ('A002', 'CERT002', 'Accepted')
    INTO Verify (Admin_id, Certificate_id, Verification_status) VALUES ('A003', 'CERT003', 'Accepted')
    INTO Verify (Admin_id, Certificate_id, Verification_status) VALUES ('A004', 'CERT004', 'Pending')
    INTO Verify (Admin_id, Certificate_id, Verification_status) VALUES ('A005', 'CERT005', 'Accepted')
SELECT * FROM dual;

-- ============================================================
-- COMMIT ALL INSERTIONS
-- ============================================================
COMMIT;
