-- usecase: UC-001/DA-1 enrolling an existing student in an existing course inserts one row
INSERT INTO enrollments (id, status, enrolled_at, student_id, course_id)
VALUES ('enr_test1', 'enrolled', now(), 'stu_1', 'crs_2');
-- expect: rowcount=1

-- usecase: UC-001/DA-2 enrolling a non-existent student is rejected
INSERT INTO enrollments (id, status, enrolled_at, student_id, course_id)
VALUES ('enr_test2', 'enrolled', now(), 'stu_ghost', 'crs_1');
-- expect: error ~ foreign key

-- usecase: UC-002/DA-1 a student with two enrollments sees two courses
SELECT c.title FROM courses c
JOIN enrollments e ON e.course_id = c.id
WHERE e.student_id = 'stu_1';
-- expect: rows=2

-- usecase: UC-003/DA-1 dropping flips the status of exactly one enrollment
UPDATE enrollments SET status = 'dropped' WHERE id = 'enr_1';
-- expect: rowcount=1

-- usecase: UC-003/DA-2 the dropped enrollment is still readable with its new status
SELECT status FROM enrollments WHERE id = 'enr_1';
-- expect: col:status=dropped
