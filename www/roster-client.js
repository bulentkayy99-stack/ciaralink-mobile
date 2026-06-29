/**
 * CiaraLink — Rostering data + API client (browser).
 *
 * Thin helper layer for Roster.dc.html. Reuses the EXISTING global Supabase
 * client (window.getSupabaseClient from supabase-client.js — which this file
 * never edits) for RLS-scoped reads/writes, and calls the service-role API
 * endpoints (/api/roster-*) for the authoritative conflict guard + recurrence
 * expansion.
 *
 * Exposed as window.RosterData. All methods return { ...data, error } and never
 * throw, matching the supabase-client.js convention.
 */
(function () {
  "use strict";

  var WORKER_ROLES = ["support_worker", "abn_worker"];

  function client() {
    return (window.getSupabaseClient && window.getSupabaseClient()) || null;
  }
  function isConfigured() {
    return !!(window.isSupabaseConfigured && window.isSupabaseConfigured());
  }

  async function getAccessToken() {
    var c = client();
    if (!c) return null;
    try {
      var res = await c.auth.getSession();
      return (res && res.data && res.data.session && res.data.session.access_token) || null;
    } catch (e) { return null; }
  }

  async function apiPost(path, body) {
    var token = await getAccessToken();
    try {
      var r = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? "Bearer " + token : "",
        },
        body: JSON.stringify(body || {}),
      });
      var data = null;
      try { data = await r.json(); } catch (e) { data = null; }
      return { ok: r.ok, status: r.status, data: data };
    } catch (e) {
      return { ok: false, status: 0, data: null, networkError: e && e.message };
    }
  }

  // ---- Context -------------------------------------------------------------
  async function loadContext() {
    if (typeof window.loadCurrentUserContext === "function") {
      try {
        var ctx = await window.loadCurrentUserContext();
        if (ctx && !ctx.error) {
          return {
            userId: ctx.user && ctx.user.id,
            orgId: ctx.organisationId,
            orgName: ctx.organisationName,
            role: ctx.primaryRole,
            error: null,
          };
        }
        return { userId: null, orgId: null, role: null, error: ctx && ctx.error };
      } catch (e) { return { userId: null, orgId: null, role: null, error: e.message }; }
    }
    return { userId: null, orgId: null, role: null, error: "context helper unavailable" };
  }

  // ---- Workers (with credentials + availability) ---------------------------
  async function loadOrgWorkers(orgId) {
    var c = client();
    if (!c) return { workers: [], error: "Supabase not configured" };
    try {
      // 1) org members that are workers
      var mem = await c
        .from("organisation_members")
        .select("user_id, role, status")
        .eq("org_id", orgId)
        .eq("status", "active")
        .in("role", WORKER_ROLES);
      if (mem.error) return { workers: [], error: mem.error.message };
      var members = mem.data || [];
      var userIds = members.map(function (m) { return m.user_id; });
      if (userIds.length === 0) return { workers: [], error: null };

      // 2) names from user_profiles (no FK to org members → fetch separately)
      var profs = await c
        .from("user_profiles")
        .select("user_id, full_name, preferred_name, skills, languages")
        .in("user_id", userIds);
      var profById = {};
      (profs.data || []).forEach(function (p) { profById[p.user_id] = p; });

      // 3) worker_profiles (org-scoped) to bridge to credentials
      var wprofs = await c
        .from("worker_profiles")
        .select("id, user_id, employment_type, ndis_check_status, ndis_check_expiry")
        .eq("org_id", orgId);
      var wpByUser = {}, wpIdToUser = {};
      (wprofs.data || []).forEach(function (w) { wpByUser[w.user_id] = w; wpIdToUser[w.id] = w.user_id; });

      // 4) credentials for those worker_profiles
      var wpIds = Object.keys(wpIdToUser);
      var credsByUser = {};
      if (wpIds.length) {
        var creds = await c
          .from("worker_credentials")
          .select("worker_id, type, expiry, verified")
          .in("worker_id", wpIds);
        (creds.data || []).forEach(function (cr) {
          var uid = wpIdToUser[cr.worker_id];
          if (!uid) return;
          (credsByUser[uid] = credsByUser[uid] || []).push(cr);
        });
      }

      // 5) availability + unavailability (org-scoped read policies)
      var availByUser = {}, unavailByUser = {};
      var av = await c
        .from("worker_availability")
        .select("user_id, weekday, start_local_time, end_local_time, is_available, effective_from, effective_until")
        .eq("org_id", orgId);
      (av.data || []).forEach(function (a) { (availByUser[a.user_id] = availByUser[a.user_id] || []).push(a); });
      var un = await c
        .from("worker_unavailability")
        .select("user_id, start_time, end_time, reason")
        .eq("org_id", orgId);
      (un.data || []).forEach(function (u) { (unavailByUser[u.user_id] = unavailByUser[u.user_id] || []).push(u); });

      var workers = members.map(function (m) {
        var p = profById[m.user_id] || {};
        var wp = wpByUser[m.user_id] || {};
        return {
          user_id: m.user_id,
          role: m.role,
          full_name: p.full_name || "Unnamed worker",
          preferred_name: p.preferred_name || null,
          skills: p.skills || [],
          employment_type: wp.employment_type || null,
          credentials: credsByUser[m.user_id] || [],
          availability: availByUser[m.user_id] || [],
          unavailability: unavailByUser[m.user_id] || [],
        };
      });
      workers.sort(function (a, b) { return (a.full_name || "").localeCompare(b.full_name || ""); });
      return { workers: workers, error: null };
    } catch (e) {
      return { workers: [], error: e.message };
    }
  }

  // ---- Shifts for a week (org view) ---------------------------------------
  async function loadWeekShifts(orgId, fromIso, toIso) {
    var c = client();
    if (!c) return { shifts: [], error: "Supabase not configured" };
    try {
      var q = await c
        .from("shifts")
        .select("id, org_id, participant_id, worker_id, title, location, start_time, end_time, status, support_type, required_credentials, recurrence_id, participants ( full_name, preferred_name )")
        .eq("org_id", orgId)
        .gte("start_time", fromIso)
        .lt("start_time", toIso)
        .order("start_time", { ascending: true })
        .limit(500);
      if (q.error) return { shifts: [], error: q.error.message };
      return { shifts: q.data || [], error: null };
    } catch (e) { return { shifts: [], error: e.message }; }
  }

  // ---- Shifts for a week (worker's own view) ------------------------------
  async function loadMyWeekShifts(fromIso, toIso) {
    var c = client();
    if (!c) return { shifts: [], error: "Supabase not configured" };
    try {
      var u = await c.auth.getUser();
      var uid = u && u.data && u.data.user && u.data.user.id;
      if (!uid) return { shifts: [], error: "No user logged in" };
      var q = await c
        .from("shifts")
        .select("id, org_id, participant_id, worker_id, title, location, start_time, end_time, status, support_type, required_credentials, participants ( full_name, preferred_name )")
        .eq("worker_id", uid)
        .gte("start_time", fromIso)
        .lt("start_time", toIso)
        .order("start_time", { ascending: true })
        .limit(500);
      if (q.error) return { shifts: [], error: q.error.message };
      return { shifts: q.data || [], error: null };
    } catch (e) { return { shifts: [], error: e.message }; }
  }

  // ---- Participants (RLS, reuse existing helper if present) ----------------
  async function loadParticipants() {
    if (typeof window.loadParticipantsForCurrentUser === "function") {
      try {
        var res = await window.loadParticipantsForCurrentUser();
        return { participants: (res && res.participants) || [], error: res && res.error };
      } catch (e) { return { participants: [], error: e.message }; }
    }
    return { participants: [], error: "participants helper unavailable" };
  }

  // ---- Create a shift (RLS: provider owner/admin/staff FOR ALL) ------------
  async function createShift(input) {
    var c = client();
    if (!c) return { shift: null, error: "Supabase not configured" };
    try {
      var row = {
        org_id: input.org_id,
        participant_id: input.participant_id,
        worker_id: input.worker_id || null,
        title: input.title || null,
        location: input.location || null,
        start_time: input.start_time,
        end_time: input.end_time,
        support_type: input.support_type || null,
        required_credentials: input.required_credentials || [],
        status: input.status || (input.worker_id ? "offered" : "draft"),
      };
      var q = await c.from("shifts").insert(row).select(
        "id, org_id, participant_id, worker_id, title, location, start_time, end_time, status, support_type, required_credentials, participants ( full_name, preferred_name )"
      ).single();
      if (q.error) return { shift: null, error: q.error.message };
      return { shift: q.data, error: null };
    } catch (e) { return { shift: null, error: e.message }; }
  }

  // Direct RLS update fallback (used when the API is unavailable).
  async function patchShiftDirect(shiftId, patch) {
    var c = client();
    if (!c) return { shift: null, error: "Supabase not configured" };
    try {
      var q = await c.from("shifts").update(patch).eq("id", shiftId).select().single();
      if (q.error) return { shift: null, error: q.error.message };
      return { shift: q.data, error: null };
    } catch (e) { return { shift: null, error: e.message }; }
  }

  // ---- Assign / move (server conflict guard, RLS fallback) -----------------
  async function assign(opts) {
    var body = {
      action: "assign",
      shift_id: opts.shiftId,
      worker_id: opts.workerId,
      force: !!opts.force,
    };
    if (opts.startIso) body.start_time = opts.startIso;
    if (opts.endIso) body.end_time = opts.endIso;

    var r = await apiPost("/api/roster-assign", body);
    if (r.ok && r.data) return { ok: true, shift: r.data.shift, conflicts: r.data.conflicts || [], forced: r.data.forced, error: null };
    if (r.status === 409 && r.data) return { ok: false, blocked: true, conflicts: r.data.conflicts || [], error: "conflicts" };

    // API missing / not configured / network → fall back to a direct RLS write.
    if (r.status === 0 || r.status === 404 || r.status === 405 || r.status === 500) {
      var patch = { worker_id: opts.workerId };
      if (opts.startIso) patch.start_time = opts.startIso;
      if (opts.endIso) patch.end_time = opts.endIso;
      patch.status = "offered";
      var d = await patchShiftDirect(opts.shiftId, patch);
      if (d.error) return { ok: false, error: d.error };
      return { ok: true, shift: d.shift, conflicts: [], fallback: true, error: null };
    }
    return { ok: false, error: (r.data && r.data.error) || ("assign failed (" + r.status + ")") };
  }

  async function unassign(shiftId) {
    var r = await apiPost("/api/roster-assign", { action: "unassign", shift_id: shiftId });
    if (r.ok && r.data) return { ok: true, shift: r.data.shift, error: null };
    if (r.status === 0 || r.status === 404 || r.status === 405 || r.status === 500) {
      var d = await patchShiftDirect(shiftId, { worker_id: null, status: "draft" });
      if (d.error) return { ok: false, error: d.error };
      return { ok: true, shift: d.shift, fallback: true, error: null };
    }
    return { ok: false, error: (r.data && r.data.error) || ("unassign failed (" + r.status + ")") };
  }

  // ---- Remote authoritative conflict check (optional) ----------------------
  async function checkConflictsRemote(payload) {
    var r = await apiPost("/api/roster-conflicts", payload);
    if (r.ok && r.data) return { ok: true, conflicts: r.data.conflicts, results: r.data.results, error: null };
    return { ok: false, conflicts: null, error: (r.data && r.data.error) || ("check failed (" + r.status + ")") };
  }

  // ---- Recurring shifts ----------------------------------------------------
  async function createRecurrence(input) {
    var r = await apiPost("/api/roster-recurrence", input);
    if (r.ok && r.data) return { ok: true, recurrence: r.data.recurrence, created: r.data.created, created_count: r.data.created_count, error: null };
    return { ok: false, error: (r.data && r.data.error) || ("recurrence failed (" + r.status + ")") };
  }

  window.RosterData = {
    isConfigured: isConfigured,
    getAccessToken: getAccessToken,
    loadContext: loadContext,
    loadOrgWorkers: loadOrgWorkers,
    loadWeekShifts: loadWeekShifts,
    loadMyWeekShifts: loadMyWeekShifts,
    loadParticipants: loadParticipants,
    createShift: createShift,
    assign: assign,
    unassign: unassign,
    checkConflictsRemote: checkConflictsRemote,
    createRecurrence: createRecurrence,
    WORKER_ROLES: WORKER_ROLES,
  };
})();
