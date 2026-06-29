/**
 * CiaraLink — Incident Management / SIRS client helpers
 * ----------------------------------------------------------------------------
 * Frontend-safe. Uses ONLY the public anon client exposed by supabase-client.js
 * (window.getSupabaseClient) plus window.getCurrentUser / loadCurrentUserContext.
 * NEVER add the service-role key here — RLS (migration 20260629150000_incidents.sql)
 * enforces who can read/write.
 *
 * Loaded by:  Incident Report.dc.html (worker quick report)
 *             Incident Centre.dc.html (provider tracking dashboard)
 * Load order in <helmet>: AFTER supabase-client.js.
 *
 * Exposes:
 *   window.IncidentSIRS  — pure classification + SIRS reference data (no network)
 *   window.createIncident / addIncidentInvolved / uploadIncidentEvidence
 *   window.loadIncidents / loadMyReportedIncidents / loadIncidentById
 *   window.updateIncidentStatus / resolveIncident / logIncidentAudit
 *   window.getIncidentEvidenceUrl / incidentDeadlineState
 */
(function () {
  'use strict';

  var BUCKET = 'incident-evidence';

  function client() {
    return (typeof window !== 'undefined' && window.getSupabaseClient)
      ? window.getSupabaseClient()
      : null;
  }

  // ==========================================================================
  // SIRS REFERENCE DATA + PURE CLASSIFICATION (no network — safe for previews)
  // ==========================================================================

  // The 5 NDIS SIRS reportable categories and their Commission notification
  // timeframe. Restrictive practice = 5 business days; all others = 24 hours.
  var SIRS_CATEGORIES = {
    death: { label: 'Death of a person with disability', timeframe: '24_hours' },
    serious_injury: { label: 'Serious injury of a person with disability', timeframe: '24_hours' },
    abuse_neglect: { label: 'Abuse or neglect of a person with disability', timeframe: '24_hours' },
    unlawful_sexual_physical_contact: { label: 'Unlawful sexual or physical contact / assault', timeframe: '24_hours' },
    unauthorised_restrictive_practice: { label: 'Unauthorised use of a restrictive practice', timeframe: '5_business_days' }
  };

  // incident_type (what the worker picks) -> SIRS category (null = not reportable).
  // Mirrors the SQL trigger incident_apply_classification() exactly.
  var TYPE_TO_SIRS = {
    death: 'death',
    serious_injury: 'serious_injury',
    abuse: 'abuse_neglect',
    neglect: 'abuse_neglect',
    unlawful_sexual_contact: 'unlawful_sexual_physical_contact',
    unlawful_physical_contact: 'unlawful_sexual_physical_contact',
    sexual_misconduct: 'unlawful_sexual_physical_contact',
    restrictive_practice: 'unauthorised_restrictive_practice'
  };

  // Worker-facing incident type options (label + whether SIRS reportable).
  var TYPE_OPTIONS = [
    { value: 'serious_injury', label: 'Serious injury', group: 'Reportable (SIRS)' },
    { value: 'death', label: 'Death of a participant', group: 'Reportable (SIRS)' },
    { value: 'abuse', label: 'Abuse', group: 'Reportable (SIRS)' },
    { value: 'neglect', label: 'Neglect', group: 'Reportable (SIRS)' },
    { value: 'unlawful_sexual_contact', label: 'Unlawful sexual contact / assault', group: 'Reportable (SIRS)' },
    { value: 'unlawful_physical_contact', label: 'Unlawful physical contact / assault', group: 'Reportable (SIRS)' },
    { value: 'sexual_misconduct', label: 'Sexual misconduct', group: 'Reportable (SIRS)' },
    { value: 'restrictive_practice', label: 'Unauthorised restrictive practice', group: 'Reportable (SIRS)' },
    { value: 'injury', label: 'Minor injury', group: 'Operational' },
    { value: 'illness', label: 'Illness / medical', group: 'Operational' },
    { value: 'medication_error', label: 'Medication error', group: 'Operational' },
    { value: 'behaviour_of_concern', label: 'Behaviour of concern', group: 'Operational' },
    { value: 'absconding', label: 'Absconding', group: 'Operational' },
    { value: 'missing_person', label: 'Missing person', group: 'Operational' },
    { value: 'property_damage', label: 'Property damage', group: 'Operational' },
    { value: 'near_miss', label: 'Near miss', group: 'Operational' },
    { value: 'other', label: 'Other', group: 'Operational' }
  ];

  var SEVERITY_OPTIONS = [
    { value: 'critical', label: 'Critical', hint: 'Life-threatening / death / police involved' },
    { value: 'major', label: 'Major', hint: 'Serious harm, hospitalisation' },
    { value: 'moderate', label: 'Moderate', hint: 'Treatment needed, no lasting harm' },
    { value: 'minor', label: 'Minor', hint: 'First aid / no injury' }
  ];

  // Add N business days (Mon–Fri) — mirrors SQL add_business_days().
  function addBusinessDays(from, days) {
    var result = new Date(from.getTime());
    var added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      var dow = result.getDay(); // 0=Sun … 6=Sat
      if (dow !== 0 && dow !== 6) added++;
    }
    return result;
  }

  // Pure classification — returns the same fields the DB trigger will compute.
  // occurredAt: ISO string or Date (defaults to now). Used for preview in the UI.
  function classifyIncident(type, occurredAt) {
    var base = occurredAt ? new Date(occurredAt) : new Date();
    if (isNaN(base.getTime())) base = new Date();
    var category = TYPE_TO_SIRS[type] || null;
    var reportable = !!category;
    var meta = category ? SIRS_CATEGORIES[category] : null;
    var timeframe = meta ? meta.timeframe : null;
    var deadline = null;
    if (reportable) {
      deadline = timeframe === '5_business_days'
        ? addBusinessDays(base, 5)
        : new Date(base.getTime() + 24 * 60 * 60 * 1000);
    }
    return {
      sirs_reportable: reportable,
      sirs_category: category,
      sirs_category_label: meta ? meta.label : null,
      reporting_timeframe: timeframe,
      reporting_deadline: deadline ? deadline.toISOString() : null,
      deadline_label: timeframe === '5_business_days'
        ? '5 business days'
        : (timeframe === '24_hours' ? '24 hours' : null)
    };
  }

  // Deadline urgency for a stored incident row. Returns null when not reportable
  // or already notified to the Commission.
  function incidentDeadlineState(incident) {
    if (!incident || !incident.sirs_reportable || !incident.reporting_deadline) return null;
    if (incident.commission_notified_at) return { state: 'notified', label: 'Commission notified', overdue: false };
    var now = Date.now();
    var due = new Date(incident.reporting_deadline).getTime();
    var hoursLeft = (due - now) / 36e5;
    if (hoursLeft < 0) return { state: 'overdue', label: 'Overdue', overdue: true, hoursLeft: hoursLeft };
    if (hoursLeft <= 6) return { state: 'critical', label: 'Due within ' + Math.max(0, Math.round(hoursLeft)) + 'h', overdue: false, hoursLeft: hoursLeft };
    if (hoursLeft <= 24) return { state: 'soon', label: 'Due in ' + Math.round(hoursLeft) + 'h', overdue: false, hoursLeft: hoursLeft };
    return { state: 'ok', label: 'Due ' + new Date(incident.reporting_deadline).toLocaleDateString(), overdue: false, hoursLeft: hoursLeft };
  }

  window.IncidentSIRS = {
    SIRS_CATEGORIES: SIRS_CATEGORIES,
    TYPE_TO_SIRS: TYPE_TO_SIRS,
    TYPE_OPTIONS: TYPE_OPTIONS,
    SEVERITY_OPTIONS: SEVERITY_OPTIONS,
    classifyIncident: classifyIncident,
    addBusinessDays: addBusinessDays,
    incidentDeadlineState: incidentDeadlineState
  };
  window.classifyIncident = classifyIncident;
  window.incidentDeadlineState = incidentDeadlineState;

  // ==========================================================================
  // DATA ACCESS (RLS-protected)
  // ==========================================================================

  // Create an incident. Classification (SIRS category / deadline) is applied
  // authoritatively by the DB trigger, so the client only sends the facts.
  // input: { org_id?, participant_id?, shift_id?, incident_type, severity,
  //          title, description, location?, occurred_at?, immediate_actions? }
  async function createIncident(input) {
    input = input || {};
    var c = client();
    if (!c) return { incident: null, error: 'Supabase not configured' };
    try {
      var who = await window.getCurrentUser();
      if (who.error || !who.user) return { incident: null, error: 'No user logged in' };

      var orgId = input.org_id || null;
      var reporterLabel = input.reporter_label || null;
      if (!orgId || !reporterLabel) {
        var ctx = await window.loadCurrentUserContext();
        orgId = orgId || (ctx && ctx.organisationId) || null;
        reporterLabel = reporterLabel || (ctx && ctx.profile && ctx.profile.full_name) || null;
      }
      if (!orgId) return { incident: null, error: 'No organisation found for current user' };
      if (!input.incident_type || !input.title || !input.description) {
        return { incident: null, error: 'incident_type, title and description are required' };
      }

      var row = {
        org_id: orgId,
        reported_by: who.user.id,
        reporter_label: reporterLabel,
        incident_type: input.incident_type,
        severity: input.severity || 'moderate',
        title: input.title,
        description: input.description,
        location: input.location || null,
        immediate_actions: input.immediate_actions || null,
        status: 'reported'
      };
      if (input.participant_id) row.participant_id = input.participant_id;
      if (input.shift_id) row.shift_id = input.shift_id;
      if (input.occurred_at) row.occurred_at = input.occurred_at;

      var res = await c.from('incidents').insert(row).select().single();
      if (res.error) return { incident: null, error: res.error.message };

      // First audit-trail entry (best-effort).
      await logIncidentAudit({
        incident_id: res.data.id, org_id: orgId,
        action: 'reported', to_status: 'reported',
        actor_label: reporterLabel,
        detail: (res.data.sirs_reportable ? 'SIRS reportable — ' : '') + 'Reported by ' + (reporterLabel || 'worker')
      }).catch(function () {});

      return { incident: res.data, error: null };
    } catch (e) {
      return { incident: null, error: e.message };
    }
  }

  // Add involved people. involved: array of
  // { person_type, participant_id?, user_id?, name?, involvement, notes? }
  async function addIncidentInvolved(incidentId, involved) {
    var c = client();
    if (!c) return { ok: false, error: 'Supabase not configured' };
    if (!incidentId || !Array.isArray(involved) || !involved.length) return { ok: true, error: null };
    try {
      var who = await window.getCurrentUser();
      if (who.error || !who.user) return { ok: false, error: 'No user logged in' };
      var rows = involved.map(function (p) {
        return {
          incident_id: incidentId,
          person_type: p.person_type || 'other',
          participant_id: p.participant_id || null,
          user_id: p.user_id || null,
          name: p.name || null,
          involvement: p.involvement || 'affected',
          notes: p.notes || null,
          added_by: who.user.id
        };
      });
      var res = await c.from('incident_involved').insert(rows).select();
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true, involved: res.data, error: null };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Upload one evidence file to Storage (path: org/incident/ts_name) and record
  // a row in incident_attachments. Mirrors uploadDocument() in supabase-client.js.
  async function uploadIncidentEvidence(args) {
    args = args || {};
    var file = args.file;
    var c = client();
    if (!c) return { attachment: null, error: 'Supabase not configured' };
    if (!file) return { attachment: null, error: 'No file provided' };
    if (!args.incident_id) return { attachment: null, error: 'incident_id is required' };
    try {
      var who = await window.getCurrentUser();
      if (who.error || !who.user) return { attachment: null, error: 'No user logged in' };
      var orgId = args.org_id || null;
      if (!orgId) { var ctx = await window.loadCurrentUserContext(); orgId = ctx && ctx.organisationId; }
      if (!orgId) return { attachment: null, error: 'No organisation found for current user' };

      var safeName = String(file.name || 'evidence').replace(/[^\w.\-]+/g, '_');
      var path = orgId + '/' + args.incident_id + '/' + Date.now() + '_' + safeName;
      var up = await c.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type || undefined
      });
      if (up.error) return { attachment: null, error: 'Upload failed: ' + up.error.message };

      var rec = await c.from('incident_attachments').insert({
        incident_id: args.incident_id, org_id: orgId, uploaded_by: who.user.id,
        storage_bucket: BUCKET, storage_path: path,
        file_name: file.name || safeName, mime_type: file.type || null,
        size_bytes: file.size || null, caption: args.caption || null
      }).select().single();

      if (rec.error) {
        try { await c.storage.from(BUCKET).remove([path]); } catch (e) {}
        return { attachment: null, error: 'Saved file but failed to record: ' + rec.error.message };
      }
      return { attachment: rec.data, error: null };
    } catch (e) {
      return { attachment: null, error: e.message };
    }
  }

  // A short-lived signed URL to view an evidence file.
  async function getIncidentEvidenceUrl(storagePath, expiresIn) {
    var c = client();
    if (!c) return { url: null, error: 'Supabase not configured' };
    try {
      var res = await c.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn || 300);
      if (res.error) return { url: null, error: res.error.message };
      return { url: (res.data && res.data.signedUrl) || null, error: null };
    } catch (e) {
      return { url: null, error: e.message };
    }
  }

  var INCIDENT_COLS =
    'id,org_id,participant_id,shift_id,reported_by,reporter_label,incident_type,severity,status,' +
    'title,description,location,occurred_at,reported_at,immediate_actions,auto_classified,' +
    'sirs_reportable,sirs_category,reporting_timeframe,reporting_deadline,commission_notified_at,' +
    'commission_reference,escalated_at,resolved_at,resolved_by,resolution_summary,closed_at,closed_by,' +
    'created_at,updated_at';

  // Provider dashboard: all incidents the caller may see (RLS-scoped).
  // opts: { status?, sirsOnly?, openOnly?, limit? }
  async function loadIncidents(opts) {
    opts = opts || {};
    var c = client();
    if (!c) return { incidents: [], error: 'Supabase not configured' };
    try {
      var q = c.from('incidents').select(INCIDENT_COLS).order('occurred_at', { ascending: false }).limit(opts.limit || 200);
      if (opts.status) q = q.eq('status', opts.status);
      if (opts.sirsOnly) q = q.eq('sirs_reportable', true);
      if (opts.openOnly) q = q.not('status', 'in', '("resolved","closed")');
      var res = await q;
      if (res.error) return { incidents: [], error: res.error.message };
      return { incidents: res.data || [], error: null };
    } catch (e) {
      return { incidents: [], error: e.message };
    }
  }

  // Worker view: only incidents I reported.
  async function loadMyReportedIncidents(limit) {
    var c = client();
    if (!c) return { incidents: [], error: 'Supabase not configured' };
    try {
      var who = await window.getCurrentUser();
      if (who.error || !who.user) return { incidents: [], error: 'No user logged in' };
      var res = await c.from('incidents').select(INCIDENT_COLS)
        .eq('reported_by', who.user.id)
        .order('occurred_at', { ascending: false }).limit(limit || 50);
      if (res.error) return { incidents: [], error: res.error.message };
      return { incidents: res.data || [], error: null };
    } catch (e) {
      return { incidents: [], error: e.message };
    }
  }

  // Full incident detail with involved people, attachments and the audit trail.
  async function loadIncidentById(incidentId) {
    var c = client();
    if (!c) return { incident: null, error: 'Supabase not configured' };
    if (!incidentId) return { incident: null, error: 'incident_id is required' };
    try {
      var jobs = [
        c.from('incidents').select(INCIDENT_COLS).eq('id', incidentId).single(),
        c.from('incident_involved').select('*').eq('incident_id', incidentId).order('created_at', { ascending: true }),
        c.from('incident_attachments').select('*').eq('incident_id', incidentId).order('created_at', { ascending: true }),
        c.from('incident_audit_log').select('*').eq('incident_id', incidentId).order('created_at', { ascending: true })
      ];
      var r = await Promise.all(jobs);
      if (r[0].error) return { incident: null, error: r[0].error.message };
      return {
        incident: r[0].data,
        involved: (r[1] && r[1].data) || [],
        attachments: (r[2] && r[2].data) || [],
        audit: (r[3] && r[3].data) || [],
        error: null
      };
    } catch (e) {
      return { incident: null, error: e.message };
    }
  }

  // Append an audit-trail entry (actor = current user).
  async function logIncidentAudit(input) {
    input = input || {};
    var c = client();
    if (!c) return { ok: false, error: 'Supabase not configured' };
    if (!input.incident_id || !input.action) return { ok: false, error: 'incident_id and action are required' };
    try {
      var who = await window.getCurrentUser();
      if (who.error || !who.user) return { ok: false, error: 'No user logged in' };
      var res = await c.from('incident_audit_log').insert({
        incident_id: input.incident_id,
        org_id: input.org_id || null,
        actor_id: who.user.id,
        actor_label: input.actor_label || null,
        action: input.action,
        from_status: input.from_status || null,
        to_status: input.to_status || null,
        detail: input.detail || null
      }).select().single();
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true, entry: res.data, error: null };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Provider admin: change status (review / action / close) + audit it.
  async function updateIncidentStatus(incidentId, toStatus, opts) {
    opts = opts || {};
    var c = client();
    if (!c) return { ok: false, error: 'Supabase not configured' };
    if (!incidentId || !toStatus) return { ok: false, error: 'incident_id and status are required' };
    try {
      var patch = { status: toStatus };
      if (toStatus === 'escalated') patch.escalated_at = new Date().toISOString();
      if (toStatus === 'closed') { patch.closed_at = new Date().toISOString(); }
      if (opts.commission_notified_at !== undefined) patch.commission_notified_at = opts.commission_notified_at;
      if (opts.commission_reference !== undefined) patch.commission_reference = opts.commission_reference;

      var res = await c.from('incidents').update(patch).eq('id', incidentId).select().single();
      if (res.error) return { ok: false, error: res.error.message };

      await logIncidentAudit({
        incident_id: incidentId, org_id: res.data.org_id,
        action: 'status_change', from_status: opts.from_status || null, to_status: toStatus,
        actor_label: opts.actor_label || null,
        detail: opts.detail || ('Status set to ' + toStatus)
      }).catch(function () {});

      return { ok: true, incident: res.data, error: null };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Provider admin: resolve an incident with a summary + audit it.
  async function resolveIncident(incidentId, summary, opts) {
    opts = opts || {};
    var c = client();
    if (!c) return { ok: false, error: 'Supabase not configured' };
    if (!incidentId || !summary) return { ok: false, error: 'incident_id and a resolution summary are required' };
    try {
      var who = await window.getCurrentUser();
      var patch = {
        status: 'resolved',
        resolution_summary: summary,
        resolved_at: new Date().toISOString(),
        resolved_by: who && who.user ? who.user.id : null
      };
      var res = await c.from('incidents').update(patch).eq('id', incidentId).select().single();
      if (res.error) return { ok: false, error: res.error.message };

      await logIncidentAudit({
        incident_id: incidentId, org_id: res.data.org_id,
        action: 'resolved', from_status: opts.from_status || null, to_status: 'resolved',
        actor_label: opts.actor_label || null,
        detail: 'Resolved: ' + summary
      }).catch(function () {});

      return { ok: true, incident: res.data, error: null };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ==========================================================================
  // EXPORTS
  // ==========================================================================
  window.createIncident = createIncident;
  window.addIncidentInvolved = addIncidentInvolved;
  window.uploadIncidentEvidence = uploadIncidentEvidence;
  window.getIncidentEvidenceUrl = getIncidentEvidenceUrl;
  window.loadIncidents = loadIncidents;
  window.loadMyReportedIncidents = loadMyReportedIncidents;
  window.loadIncidentById = loadIncidentById;
  window.logIncidentAudit = logIncidentAudit;
  window.updateIncidentStatus = updateIncidentStatus;
  window.resolveIncident = resolveIncident;
})();
