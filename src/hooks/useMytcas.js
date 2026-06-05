// hooks/useMytcas.js
// React hooks for TCAS course data
// Uses /api/mytcas serverless function

import { useState, useEffect } from "react";

const BASE = "/api/mytcas";

const clientCache = new Map();

// Deterministic CDN logo URL — single source of truth, reused by pages + profile.
export const tcasLogoUrl = (id) => `https://assets.mytcas.com/i/logo/${id}.png`;

async function fetchTcas(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${BASE}?${query}` : BASE;
  if (clientCache.has(url)) return clientCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TCAS API error: ${res.status}`);
  const data = await res.json();
  clientCache.set(url, data);
  return data;
}

// ── Hook: list all universities ──────────────────────────────────────────────
export function useTcasUniversities() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchTcas()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { universities: data?.universities ?? [], total: data?.total ?? 0, loading, error };
}

// ── Hook: faculties of a university ─────────────────────────────────────────
export function useTcasFaculties(university_id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!university_id) return;
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    fetchTcas({ university_id })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [university_id]);

  return { faculties: data?.faculties ?? [], data, loading, error };
}

// ── Hook: programs inside a faculty ─────────────────────────────────────────
export function useTcasPrograms(university_id, faculty_id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!university_id || !faculty_id) return;
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    fetchTcas({ university_id, faculty_id })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [university_id, faculty_id]);

  return { programs: data?.programs ?? [], data, loading, error };
}

// ── Hook: single program detail ──────────────────────────────────────────────
export function useTcasProgram(program_id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!program_id) return;
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    fetchTcas({ program_id })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [program_id]);

  return { program: data, loading, error };
}

// ── Hook: admission rounds for a program ─────────────────────────────────────
export function useTcasRounds(program_id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!program_id) return;
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    fetchTcas({ program_id, rounds: "true" })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [program_id]);

  return { rounds: data?.rounds ?? [], loading, error };
}
