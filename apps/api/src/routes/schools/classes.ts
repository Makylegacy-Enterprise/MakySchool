import { Router } from "express";
import { pool } from "../../db/pool.js";
import { USER_LEARNER_ROLE_SQL } from "../../db/userSql.js";
import type { TenantRequest } from "../../middleware/tenant.js";
import {
  buildLevelOrderCase,
  findDuplicateClass,
  formatClassLabel,
  getAllowedLevelsSqlParam,
  getSchoolType,
  isLevelAllowedForSchoolType,
} from "../../utils/classes.js";

export const classesRouter = Router();

classesRouter.get("/", async (req: TenantRequest, res) => {
  const schoolId = req.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  const schoolType = await getSchoolType(schoolId);
  const allowedLevels = getAllowedLevelsSqlParam(schoolType);
  const levelOrder = buildLevelOrderCase("c.level", schoolType);

  const result = await pool.query(
    `SELECT
       c.id,
       c.level,
       c.stream,
       c.capacity,
       c.sort_order,
       COALESCE((
         SELECT COUNT(*)::int
         FROM users u
         WHERE u.school_id = c.school_id
           AND ${USER_LEARNER_ROLE_SQL}
           AND u.school_class_id = c.id
       ), 0) AS student_count,
       COALESCE((
         SELECT json_agg(json_build_object('id', s.id, 'name', s.name))
         FROM school_class_subjects cs
         JOIN school_subjects s ON s.id = cs.subject_id
         WHERE cs.class_id = c.id
       ), '[]'::json) AS subjects
     FROM school_classes c
     WHERE c.school_id = $1
       AND c.level = ANY($2::text[])
     ORDER BY ${levelOrder}, COALESCE(c.sort_order, 9999), COALESCE(c.stream, ''), c.created_at ASC`,
    [schoolId, allowedLevels],
  );

  return res.json({ data: result.rows });
});

classesRouter.post("/", async (req: TenantRequest, res) => {
  const schoolId = req.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  const { level, stream, capacity } = req.body as { level?: string; stream?: string; capacity?: number };
  if (!level) {
    return res.status(400).json({ error: "Level is required" });
  }

  const normalizedStream = stream?.trim() ? stream.trim() : null;
  const schoolType = await getSchoolType(schoolId);

  if (!isLevelAllowedForSchoolType(level, schoolType)) {
    return res.status(400).json({
      error: "This class level is not allowed for your school type.",
      code: "INVALID_LEVEL",
    });
  }

  if (await findDuplicateClass(schoolId, level, normalizedStream)) {
    return res.status(409).json({
      error: `${formatClassLabel(level, normalizedStream)} already exists.`,
      code: "DUPLICATE_CLASS",
    });
  }

  const result = await pool.query(
    `INSERT INTO school_classes (id, school_id, level, stream, capacity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [crypto.randomUUID(), schoolId, level, normalizedStream, capacity ?? null],
  );

  return res.status(201).json({ data: result.rows[0] });
});

classesRouter.patch("/:id", async (req: TenantRequest, res) => {
  const schoolId = req.schoolId;
  const id = String(req.params.id);
  if (!schoolId) {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  const { level, stream, capacity } = req.body as {
    level?: string;
    stream?: string | null;
    capacity?: number | null;
  };

  const existing = await pool.query<{ level: string; stream: string | null; capacity: number | null }>(
    "SELECT level, stream, capacity FROM school_classes WHERE id = $1 AND school_id = $2",
    [id, schoolId],
  );

  if (!existing.rowCount) {
    return res.status(404).json({ error: "Class not found" });
  }

  const nextLevel = level ?? existing.rows[0].level;
  const nextStream =
    stream === undefined ? existing.rows[0].stream : stream?.trim() ? stream.trim() : null;
  const schoolType = await getSchoolType(schoolId);

  if (!isLevelAllowedForSchoolType(nextLevel, schoolType)) {
    return res.status(400).json({
      error: "This class level is not allowed for your school type.",
      code: "INVALID_LEVEL",
    });
  }

  if (await findDuplicateClass(schoolId, nextLevel, nextStream, id)) {
    return res.status(409).json({
      error: `${formatClassLabel(nextLevel, nextStream)} already exists.`,
      code: "DUPLICATE_CLASS",
    });
  }

  const result = await pool.query(
    `UPDATE school_classes
     SET level = $1,
         stream = $2,
         capacity = $3,
         updated_at = NOW()
     WHERE id = $4 AND school_id = $5
     RETURNING *`,
    [nextLevel, nextStream, capacity === undefined ? existing.rows[0].capacity : capacity, id, schoolId],
  );

  return res.json({ data: result.rows[0] });
});

classesRouter.delete("/:id", async (req: TenantRequest, res) => {
  const schoolId = req.schoolId;
  const id = String(req.params.id);
  if (!schoolId) {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  const classRow = await pool.query<{ level: string; stream: string | null }>(
    "SELECT level, stream FROM school_classes WHERE id = $1 AND school_id = $2",
    [id, schoolId],
  );

  if (!classRow.rowCount) {
    return res.status(404).json({ error: "Class not found" });
  }

  const studentCount = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM users u
     WHERE u.school_id = $1
       AND ${USER_LEARNER_ROLE_SQL}
       AND u.school_class_id = $2`,
    [schoolId, id],
  );

  const count = Number(studentCount.rows[0]?.count ?? 0);
  const classLabel = formatClassLabel(classRow.rows[0].level, classRow.rows[0].stream);

  if (count > 0) {
    return res.status(409).json({
      error: `Cannot delete ${classLabel}. ${count} student${count === 1 ? "" : "s"} are currently enrolled. Please move them first.`,
      code: "CLASS_HAS_STUDENTS",
      studentCount: count,
    });
  }

  await pool.query("DELETE FROM school_classes WHERE id = $1 AND school_id = $2", [id, schoolId]);
  return res.json({ data: { ok: true, label: classLabel } });
});

classesRouter.post("/:id/subjects", async (req: TenantRequest, res) => {
  const schoolId = req.schoolId;
  const id = String(req.params.id);
  const { subjectId } = req.body as { subjectId?: string };

  if (!schoolId || !subjectId) {
    return res.status(400).json({ error: "Missing tenant context or subject id" });
  }

  await pool.query(
    `INSERT INTO school_class_subjects (id, school_id, class_id, subject_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (class_id, subject_id) DO NOTHING`,
    [crypto.randomUUID(), schoolId, id, subjectId],
  );

  return res.status(201).json({ data: { ok: true } });
});

classesRouter.delete("/:id/subjects/:subjectId", async (req: TenantRequest, res) => {
  const schoolId = req.schoolId;
  const id = String(req.params.id);
  const subjectId = String(req.params.subjectId);
  if (!schoolId) {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  await pool.query(
    "DELETE FROM school_class_subjects WHERE school_id = $1 AND class_id = $2 AND subject_id = $3",
    [schoolId, id, subjectId],
  );
  return res.json({ data: { ok: true } });
});
