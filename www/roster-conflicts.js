/**
 * CiaraLink — Rostering conflict detection (PURE, browser-safe).
 *
 * Mirrors the authoritative Postgres function public.roster_detect_conflicts()
 * (supabase/migrations/20260629120100_rostering.sql) so the drag-and-drop
 * roster can show INSTANT feedback while dragging, without a round-trip. The
 * server function remains the source of truth (called via /api/roster-conflicts
 * and enforced in /api/roster-assign before any write).
 *
 * No network, no Supabase, no secrets — just data in, conflicts out. Exposed as
 * window.RosterConflicts.
 *
 * Conflict object shape (matches the SQL):
 *   { type, severity: 'error'|'warning', message, shift_id?, credential? }
 *   types: double_booking | time_off | outside_availability
 *          | credential_missing | credential_expired
 *
 * NOTE on timezones: local time-of-day comparisons use the BROWSER's local
 * timezone (providers roster in their own region). The server function uses the
 * shift's stored timezone and is authoritative.
 */
(function () {
  "use strict";

  function toDate(v) {
    if (v instanceof Date) return v;
    if (typeof v === "number") return new Date(v);
    if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
    return null;
  }

  // Half-open interval overlap: [aStart,aEnd) intersects [bStart,bEnd)
  function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && aEnd > bStart;
  }

  // "HH:MM" or "HH:MM:SS" → minutes since midnight (or null)
  function parseClock(t) {
    if (typeof t !== "string") return null;
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function fmtWhen(d) {
    try {
      return d.toLocaleString(undefined, {
        weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch (e) { return d.toISOString(); }
  }

  function dateOnly(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Detect conflicts for rostering a worker into a proposed window.
   *
   * @param {Object} candidate
   *   @param {string} candidate.workerId
   *   @param {Date|string|number} candidate.start
   *   @param {Date|string|number} candidate.end
   *   @param {string[]} [candidate.requiredCredentials]
   *   @param {string} [candidate.excludeShiftId]  ignore this shift in overlap scan
   * @param {Object} ctx
   *   @param {Array}  ctx.shifts          all known shifts (need worker_id,start_time,end_time,status,id,title)
   *   @param {Object} ctx.worker          { credentials:[{type,expiry,verified}],
   *                                          availability:[{weekday,start_local_time,end_local_time,is_available,effective_from,effective_until}],
   *                                          unavailability:[{start_time,end_time,reason}] }
   * @returns {Array} conflicts
   */
  function detect(candidate, ctx) {
    const out = [];
    if (!candidate) return out;
    const workerId = candidate.workerId;
    const start = toDate(candidate.start);
    const end = toDate(candidate.end);
    if (!workerId || !start || !end || end <= start) return out;

    ctx = ctx || {};
    const worker = ctx.worker || {};
    const allShifts = Array.isArray(ctx.shifts) ? ctx.shifts : [];
    const required = Array.isArray(candidate.requiredCredentials) ? candidate.requiredCredentials : [];

    // (1) DOUBLE-BOOKING
    for (const s of allShifts) {
      if (!s || s.worker_id !== workerId) continue;
      if (s.status === "cancelled") continue;
      if (candidate.excludeShiftId && s.id === candidate.excludeShiftId) continue;
      const ss = toDate(s.start_time), se = toDate(s.end_time);
      if (!ss || !se) continue;
      if (overlaps(start, end, ss, se)) {
        out.push({
          type: "double_booking", severity: "error", shift_id: s.id,
          message: 'Double-booked: overlaps "' + (s.title || "(untitled shift)") + '" at ' + fmtWhen(ss),
        });
      }
    }

    // (2) ONE-OFF UNAVAILABILITY / TIME OFF
    const unavail = Array.isArray(worker.unavailability) ? worker.unavailability : [];
    for (const u of unavail) {
      const us = toDate(u.start_time), ue = toDate(u.end_time);
      if (!us || !ue) continue;
      if (overlaps(start, end, us, ue)) {
        out.push({
          type: "time_off", severity: "error",
          message: "Worker is unavailable (" + (u.reason || "time off") + ")",
        });
      }
    }

    // (3) OUTSIDE WEEKLY AVAILABILITY (only if windows exist for that weekday)
    const avail = Array.isArray(worker.availability) ? worker.availability : [];
    const dow = start.getDay(); // 0=Sun..6=Sat
    const shiftDate = dateOnly(start);
    const dayWindows = avail.filter((a) => {
      if (!a || !a.is_available) return false;
      if (Number(a.weekday) !== dow) return false;
      if (a.effective_from && dateOnly(new Date(a.effective_from)) > shiftDate) return false;
      if (a.effective_until && dateOnly(new Date(a.effective_until)) < shiftDate) return false;
      return true;
    });
    if (dayWindows.length > 0) {
      const startMin = start.getHours() * 60 + start.getMinutes();
      const endMin = end.getHours() * 60 + end.getMinutes();
      const inside = dayWindows.some((a) => {
        const ws = parseClock(a.start_local_time), we = parseClock(a.end_local_time);
        return ws != null && we != null && ws <= startMin && we >= endMin;
      });
      if (!inside) {
        out.push({
          type: "outside_availability", severity: "warning",
          message: "Outside the worker's stated availability for this day",
        });
      }
    }

    // (4) REQUIRED CREDENTIALS — missing / expired / unverified
    const creds = Array.isArray(worker.credentials) ? worker.credentials : [];
    const endDate = dateOnly(end);
    for (const credType of required) {
      if (typeof credType !== "string" || !credType.trim()) continue;
      const matching = creds.filter((c) => c && c.type === credType);
      const valid = matching.some((c) => {
        if (!c.verified) return false;
        if (!c.expiry) return true;
        return dateOnly(new Date(c.expiry)) >= endDate;
      });
      if (!valid) {
        const existsButBad = matching.length > 0;
        out.push({
          type: existsButBad ? "credential_expired" : "credential_missing",
          severity: "error", credential: credType,
          message: existsButBad
            ? 'Credential "' + credType + '" is expired or not verified'
            : 'Missing required credential: "' + credType + '"',
        });
      }
    }

    return out;
  }

  function summarise(conflicts) {
    const list = Array.isArray(conflicts) ? conflicts : [];
    return {
      hard: list.filter((c) => c && c.severity === "error").length,
      soft: list.filter((c) => c && c.severity === "warning").length,
      total: list.length,
    };
  }

  window.RosterConflicts = { detect: detect, summarise: summarise, overlaps: overlaps };
})();
