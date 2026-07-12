-- seed.sql — deterministic fixture data for usecases.sql (explicit TypeID-style ids,
-- never DB-generated, so assertions stay stable).
--
-- Layout the assertions depend on:
--   stu_1 has exactly TWO enrollments (UC-002/DA-1 expects rows=2) and is NOT
--   enrolled in crs_2 (UC-001/DA-1 inserts that pair against the unique index).
--   enr_1 is seeded with status 'dropped': each use-case block runs in its own
--   rolled-back transaction, so UC-003/DA-2 reads the SEEDED status — UC-003/DA-1's
--   UPDATE (which still reports rowcount=1) has been rolled back by then.

INSERT INTO students (id, full_name, email) VALUES
  ('stu_1', 'Ada Lovelace', 'ada@example.edu'),
  ('stu_2', 'Alan Turing', 'alan@example.edu');

INSERT INTO courses (id, title, capacity) VALUES
  ('crs_1', 'Databases 101', 30),
  ('crs_2', 'Distributed Systems', 25),
  ('crs_3', 'Compilers', 20);

INSERT INTO enrollments (id, status, enrolled_at, student_id, course_id) VALUES
  ('enr_1', 'dropped', now(), 'stu_1', 'crs_1'),
  ('enr_2', 'enrolled', now(), 'stu_1', 'crs_3');
