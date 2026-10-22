// api/mytcas.js
// Vercel Serverless Function — TCAS courses data
// Data source: my-tcas S3 JSON API (no scraping needed!)
// Endpoints:
//   GET /api/mytcas                                        → list of universities
//   GET /api/mytcas?university_id=001                      → faculties of that university
//   GET /api/mytcas?university_id=001&faculty_id=21        → programs of that faculty
//   GET /api/mytcas?program_id=10010121300001A             → single program detail
//   GET /api/mytcas?program_id=10010121300001A&rounds=true → all rounds + score criteria
//   GET /api/mytcas?program_id=10010121300001A&round=3     → round 3 (Admission) only

import {
  MIN_LIVE_ROWS,
  pickCourseSource,
  resolveTcasYear,
  buildRoundsPayload,
} from "./mytcasSource.js";

const S3_URL      = "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json";
const PREVIEW_URL = "https://tcas65.as.r.appspot.com";
const LOGO_BASE   = "https://assets.mytcas.com/i/logo";
const CACHE_TTL   = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_TCAS_YEAR = 2570; // TCAS70 — fallback when meta.json is unreachable

// Fallback snapshot maintained by scripts/refreshTcasSnapshot.mjs (public read
// — see the data/ block in storage.rules).
const STORAGE_BASE =
  "https://firebasestorage.googleapis.com/v0/b/rollercoasterdottodream.firebasestorage.app/o";
const SNAPSHOT_URL = `${STORAGE_BASE}/${encodeURIComponent("data/mytcas/courses-snapshot.json")}?alt=media`;
const META_URL     = `${STORAGE_BASE}/${encodeURIComponent("data/mytcas/meta.json")}?alt=media`;

// Score key → human-readable label (shared module)
import { SCORE_LABELS } from "../src/constants/scoreLabels.js";


// ── Course data caches (live + fallback snapshot) ────────────────────────────
let _live = null;      // { rows, time }
let _snapshot = null;  // { rows, meta, time }

async function fetchJsonOrNull(url) {
  try {
    const res = await fetch(url, { headers: { "Accept-Encoding": "gzip" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getLiveRows() {
  if (_live && Date.now() - _live.time < CACHE_TTL) return _live.rows;
  const rows = await fetchJsonOrNull(S3_URL);
  _live = { rows: Array.isArray(rows) ? rows : [], time: Date.now() };
  return _live.rows;
}

async function getSnapshot() {
  if (_snapshot && Date.now() - _snapshot.time < CACHE_TTL) return _snapshot;
  const [rows, meta] = await Promise.all([
    fetchJsonOrNull(SNAPSHOT_URL),
    fetchJsonOrNull(META_URL),
  ]);
  _snapshot = { rows: Array.isArray(rows) ? rows : [], meta: meta ?? null, time: Date.now() };
  return _snapshot;
}

// Live data when healthy; the Storage snapshot while MyTCAS rebuilds between
// TCAS cycles. The snapshot is only fetched when live fails the sanity check.
async function getCourseData() {
  const liveRows = await getLiveRows();
  if (liveRows.length >= MIN_LIVE_ROWS) {
    return { rows: liveRows, source: "live", tcasYear: await getTcasYear() };
  }
  const snapshot = await getSnapshot();
  const picked = pickCourseSource({ liveRows, snapshotRows: snapshot.rows });
  return { rows: picked.rows, source: picked.source, tcasYear: await getTcasYear() };
}

async function getTcasYear() {
  const snapshot = await getSnapshot();
  return resolveTcasYear(snapshot.meta, DEFAULT_TCAS_YEAR);
}

// Per-program rounds cache — max 500 entries to bound memory usage
const _roundsCache   = new Map(); // key: program_id → { data, time }
const ROUNDS_MAX     = 500;
const ROUNDS_TTL     = 6 * 60 * 60 * 1000;

// ── Data fetchers ─────────────────────────────────────────────────────────────
async function getProgramRounds(program_id) {
  const hit = _roundsCache.get(program_id);
  if (hit && Date.now() - hit.time < ROUNDS_TTL) return hit.data;

  const res = await fetch(
    `${PREVIEW_URL}/program-projects/program-id/${program_id}`
  );
  if (!res.ok) throw new Error(`program-projects fetch failed: ${res.status}`);
  const data = await res.json();

  // Evict oldest entry if over capacity
  if (_roundsCache.size >= ROUNDS_MAX) {
    _roundsCache.delete(_roundsCache.keys().next().value);
  }
  _roundsCache.set(program_id, { data, time: Date.now() });
  return data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Group flat course rows into programs with a majors[] array
function groupToPrograms(rows) {
  const programMap = new Map();
  rows.forEach((c) => {
    if (!programMap.has(c.program_id)) {
      programMap.set(c.program_id, {
        _id:                 c._id,
        program_id:          c.program_id,
        program_name_th:     c.program_name_th,
        program_name_en:     c.program_name_en,
        program_type_name_th:c.program_type_name_th,
        field_name_th:       c.field_name_th,
        field_name_en:       c.field_name_en,
        cost:                c.cost,
        graduate_rate:       c.graduate_rate,
        employment_rate:     c.employment_rate,
        median_salary:       c.median_salary,
        majors:              [],
      });
    }
    if (c.major_id && c.major_name_th && c.major_id !== "0") {
      programMap.get(c.program_id).majors.push({
        major_id:                c.major_id,
        major_name_th:           c.major_name_th,
        major_name_en:           c.major_name_en ?? "",
        major_acceptance_number: c.major_acceptance_number ?? 0,
      });
    }
  });
  return Array.from(programMap.values());
}

// Transform raw project rows into clean round objects
function formatRounds(rawRows) {
  const roundMap = new Map();

  rawRows.forEach((r) => {
    // type format: "{round}_{thai_year}", e.g. "3_2569"
    const [roundNum] = r.type.split("_");
    const roundKey   = `round_${roundNum}`;

    if (!roundMap.has(roundKey)) {
      roundMap.set(roundKey, {
        round:          Number(roundNum),
        round_name_th:  { 1:"Portfolio", 2:"Quota", 3:"Admission", 4:"Direct Admission" }[roundNum] ?? `รอบ ${roundNum}`,
        seats_total:    0,
        projects:       [],
      });
    }

    const entry = roundMap.get(roundKey);
    entry.seats_total += r.receive_student_number ?? 0;

    // Build readable scores array
    const scoreEntries = Object.entries(r.scores ?? {}).map(([key, weight]) => ({
      key,
      label:  SCORE_LABELS[key] ?? key,
      weight, // percentage weight (sum = 100 for round 3)
    }));

    entry.projects.push({
      project_id:            r.project_id === "0" ? null : r.project_id,
      project_name_th:       r.project_name_th === "0" ? null : r.project_name_th,
      seats:                 r.receive_student_number ?? 0,
      min_gpax:              r.min_gpax ?? null,
      min_total_score:       r.min_total_score ?? null,
      scores:                scoreEntries,
      condition:             r.condition !== "-" ? r.condition : null,
      interview_location:    r.interview_location !== "-" ? r.interview_location : null,
      link:                  r.link ?? null,
    });
  });

  return Array.from(roundMap.values()).sort((a, b) => a.round - b.round);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { university_id, faculty_id, program_id, rounds, round } = req.query;

    // ── Ops probe (?status=true) — snapshot freshness + which source is serving ──
    if (req.query.status === "true") {
      const liveRows = await getLiveRows();
      const snapshot = await getSnapshot();
      const picked = pickCourseSource({ liveRows, snapshotRows: snapshot.rows });
      return res.json({
        tcas_year: await getTcasYear(),
        serving: picked.source,
        live_rows: liveRows.length,
        snapshot_rows: snapshot.rows.length,
        snapshot_updated_at: snapshot.meta?.updatedAt ?? null,
      });
    }

    // ── All rounds for a program (?program_id=...&rounds=true) ──────────────
    if (program_id && rounds === "true") {
      const tcasYear = await getTcasYear();
      let rawRows = [];
      try {
        rawRows = await getProgramRounds(program_id);
      } catch {
        // Upstream rounds service unreachable — to a student this is identical
        // to "criteria not yet published", so say that instead of a 500.
        rawRows = [];
      }
      const allRounds = formatRounds(Array.isArray(rawRows) ? rawRows : []);
      return res.json(buildRoundsPayload(program_id, tcasYear, allRounds));
    }

    // ── Single round (?program_id=...&round=3) ───────────────────────────────
    if (program_id && round) {
      const tcasYear = await getTcasYear();
      const roundNum   = Number(round);
      const typePrefix = `${roundNum}_${tcasYear}`;
      const rawRows    = await getProgramRounds(program_id);
      const filtered   = rawRows.filter((r) => r.type === typePrefix);

      if (!filtered.length) {
        return res.status(404).json({
          error: `ไม่พบข้อมูลรอบ ${roundNum} สำหรับ program_id นี้`,
        });
      }

      const [formatted] = formatRounds(filtered);
      return res.json({ program_id, tcas_year: tcasYear, ...formatted });
    }

    // ── Existing: courses data ────────────────────────────────────────────────
    const { rows: courses, source: dataSource, tcasYear } = await getCourseData();

    // 1. Single program detail
    if (program_id) {
      const rows = courses.filter((c) => c.program_id === program_id);
      if (!rows.length) return res.status(404).json({ error: "Program not found" });
      const [program] = groupToPrograms(rows);
      return res.json({ ...program, data_source: dataSource });
    }

    // 2. Programs inside a faculty
    if (university_id && faculty_id) {
      const rawRows = courses.filter(
        (c) => c.university_id === university_id && c.faculty_id === faculty_id
      );
      if (!rawRows.length) return res.status(404).json({ error: "No programs found" });
      return res.json({
        university_id,
        faculty_id,
        faculty_name_th: rawRows[0].faculty_name_th,
        faculty_name_en: rawRows[0].faculty_name_en,
        total:           groupToPrograms(rawRows).length,
        data_source:     dataSource,
        programs:        groupToPrograms(rawRows),
      });
    }

    // 3. Faculties inside a university
    if (university_id) {
      const uniCourses = courses.filter((c) => c.university_id === university_id);
      if (!uniCourses.length) return res.status(404).json({ error: "University not found" });

      const facultyMap = new Map();
      uniCourses.forEach((c) => {
        if (!facultyMap.has(c.faculty_id)) {
          facultyMap.set(c.faculty_id, {
            faculty_id:      c.faculty_id,
            faculty_name_th: c.faculty_name_th,
            faculty_name_en: c.faculty_name_en,
            program_count:   new Set(),
          });
        }
        facultyMap.get(c.faculty_id).program_count.add(c.program_id);
      });

      return res.json({
        university_id,
        university_name_th:      uniCourses[0].university_name_th,
        university_name_en:      uniCourses[0].university_name_en,
        university_type_name_th: uniCourses[0].university_type_name_th,
        logo_url:                `${LOGO_BASE}/${university_id}.png`,
        campus_name_th:          uniCourses[0].campus_name_th,
        total_programs:          new Set(uniCourses.map((c) => c.program_id)).size,
        data_source:             dataSource,
        faculties:               Array.from(facultyMap.values())
          .map((f) => ({ ...f, program_count: f.program_count.size }))
          .sort((a, b) => a.faculty_name_th.localeCompare(b.faculty_name_th, "th")),
      });
    }

    // 4. All universities
    const uniMap = new Map();
    courses.forEach((c) => {
      if (!uniMap.has(c.university_id)) {
        uniMap.set(c.university_id, {
          university_id:          c.university_id,
          university_name_th:     c.university_name_th,
          university_name_en:     c.university_name_en,
          university_type_id:     c.university_type_id,
          university_type_name_th:c.university_type_name_th,
          logo_url:               `${LOGO_BASE}/${c.university_id}.png`,
          program_ids:            new Set(),
          faculty_ids:            new Set(),
        });
      }
      uniMap.get(c.university_id).program_ids.add(c.program_id);
      uniMap.get(c.university_id).faculty_ids.add(c.faculty_id);
    });

    return res.json({
      total:          uniMap.size,
      total_programs: new Set(courses.map((c) => c.program_id)).size,
      data_source:    dataSource,
      tcas_year:      tcasYear,
      universities:   Array.from(uniMap.values())
        .map((u) => ({
          university_id:          u.university_id,
          university_name_th:     u.university_name_th,
          university_name_en:     u.university_name_en,
          university_type_id:     u.university_type_id,
          university_type_name_th:u.university_type_name_th,
          logo_url:               u.logo_url,
          program_count:          u.program_ids.size,
          faculty_count:          u.faculty_ids.size,
        }))
        .sort((a, b) => a.university_name_th.localeCompare(b.university_name_th, "th")),
    });

  } catch (err) {
    console.error("[mytcas api]", err);
    return res.status(500).json({ error: err.message });
  }
}
