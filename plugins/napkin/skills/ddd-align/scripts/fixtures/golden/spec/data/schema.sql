-- schema.sql — mechanically exported from model.dbml via @dbml/core (exporter.export(dbml, 'postgres'))
-- Regenerate after any model.dbml change: the live-test harness must test exactly what the model declares.

CREATE TYPE "enrollment_status" AS ENUM (
  'enrolled',
  'completed',
  'dropped'
);

CREATE TABLE "students" (
  "id" text PRIMARY KEY,
  "full_name" text NOT NULL,
  "email" text UNIQUE NOT NULL
);

CREATE TABLE "courses" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "capacity" int NOT NULL
);

CREATE TABLE "enrollments" (
  "id" text PRIMARY KEY,
  "status" enrollment_status NOT NULL,
  "enrolled_at" timestamptz NOT NULL,
  "student_id" text NOT NULL,
  "course_id" text NOT NULL
);

CREATE INDEX ON "enrollments" ("student_id");

CREATE INDEX ON "enrollments" ("course_id");

CREATE UNIQUE INDEX ON "enrollments" ("student_id", "course_id");

COMMENT ON TABLE "students" IS 'TypeID prefix: stu';

COMMENT ON TABLE "courses" IS 'TypeID prefix: crs';

COMMENT ON TABLE "enrollments" IS 'TypeID prefix: enr';

ALTER TABLE "enrollments" ADD FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "enrollments" ADD FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE;
