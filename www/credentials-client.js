/**
 * CiaraLink — Worker Credential & Compliance Register client helpers.
 *
 * NEW, self-contained companion to supabase-client.js (which is NOT edited).
 * It reuses the globals supabase-client.js already exposes on `window`:
 *   - window.getSupabaseClient()        → the RLS-scoped anon client
 *   - window.isSupabaseConfigured()
 *   - window.getCurrentUser()
 *   - window.loadCurrentUserContext()   → { organisationId, primaryRole, ... }
 *   - window.createDocumentRecord(...)  → inserts a documents row
 *
 * All reads/writes go through the anon client, so existing Row-Level Security
 * (worker_credentials, worker_profiles, user_profiles, credential_alerts) is
 * fully enforced — provider owner/admin manage their org's workers; workers
 * read their own. Depends on migration 20260629120000_credentials.sql.
 *
 * Everything is namespaced under window.CiaraCredentials and returns the same
 * { data, error } shape used elsewhere in the codebase.
 *
 * Load AFTER supabase-client.js, e.g.:
 *   <script src="./supabase-client.js?v=..."></script>
 *   <script src="./credentials-client.js?v=..."></script>
 */
(function () {
  'use strict';

  var BUCKET = 'worker-credentials';

  // Friendly labels + which are "mandatory by default" suggestions for the UI.
  var CREDENTIAL_TYPES = [
    { value: 'ndis_worker_screening', label: 'NDIS Worker Screening', mandatory: true },
    { value: 'wwcc',                  label: 'Working With Children Check', mandatory: true },
    { value: 'police_check',          label: 'Police Check', mandatory: true },
    { value: 'first_aid',             label: 'First Aid', mandatory: true },
    { value: 'cpr',                   label: 'CPR', mandatory: true },
    { value: 'manual_handling',       label: 'Manual Handling', mandatory: false },
    { value: 'driver_licence',        label: "Driver Licence", mandatory: false },
    { value: 'vaccination',           label: 'Vaccination', mandatory: false },
    { value: 'professional_indemnity',label: 'Professional Indemnity', mandatory: false },
    { value: 'public_liability',      label: 'Public Liability', mandatory: false },
    { value: 'abn_registration',      label: 'ABN Registration', mandatory: false },
    { value: 'qualification',         label: 'Qualification', mandatory: false },
    { value: 'other',                 label: 'Other', mandatory: false }
  ];

  // Map a credential type → an allowed public.documents.document_type enum value.
  function docTypeForCredential(credType) {
    switch (credType) {
      case 'police_check': return 'police_check';
      case 'wwcc':         return 'wwcc';
      case 'first_aid':    return 'first_aid';
      case 'professional_indemnity':
      case 'public_liability': return 'insurance';
      case 'abn_registration': return 'abn_document';
      default: return 'other';
    }
  }

  function client() {
    return (typeof window.getSupabaseClient === 'function') ? window.getSupabaseClient() : null;
  }

  async function currentUser() {
    if (typeof window.getCurrentUser === 'function') {
      var r = await window.getCurrentUser();
      return r && r.user ? r.user : null;
    }
    return null;
  }

  // ----------------------------------------------------------
  // READS
  // ----------------------------------------------------------

  /**
   * Org workers (worker_profiles) the current user can see, with names.
   * @returns {Promise<{workers, error}>}
   */
  async function listWorkerProfiles() {
    var c = client();
    if (!c) return { workers: [], error: 'Supabase not configured' };
    try {
      var res = await c
        .from('worker_profiles')
        .select('id, user_id, org_id, employment_type, status, user_profiles ( full_name, preferred_name )')
        .order('created_at', { ascending: true });
      if (res.error) return { workers: [], error: res.error.message };
      var workers = (res.data || []).map(function (w) {
        var p = w.user_profiles || {};
        return {
          worker_id: w.id,
          user_id: w.user_id,
          org_id: w.org_id,
          status: w.status,
          employment_type: w.employment_type,
          full_name: p.preferred_name || p.full_name || 'Unnamed worker'
        };
      });
      return { workers: workers, error: null };
    } catch (e) {
      return { workers: [], error: e.message };
    }
  }

  /**
   * Per-worker compliance rollup for the dashboard (worker_compliance_overview).
   * RLS-scoped to the caller's org.
   * @returns {Promise<{rows, error}>}
   */
  async function loadComplianceRegister() {
    var c = client();
    if (!c) return { rows: [], error: 'Supabase not configured' };
    try {
      var res = await c
        .from('worker_compliance_overview')
        .select('worker_id, user_id, org_id, full_name, total_credentials, expired_count, expiring_count, valid_count, mandatory_expired_count, rostering_eligible')
        .order('full_name', { ascending: true });
      if (res.error) return { rows: [], error: res.error.message };
      return { rows: res.data || [], error: null };
    } catch (e) {
      return { rows: [], error: e.message };
    }
  }

  /**
   * All credentials (with computed status) for one worker_profiles.id.
   * @param {string} workerId
   * @returns {Promise<{credentials, error}>}
   */
  async function loadWorkerCredentials(workerId) {
    var c = client();
    if (!c) return { credentials: [], error: 'Supabase not configured' };
    if (!workerId) return { credentials: [], error: 'workerId is required' };
    try {
      var res = await c
        .from('worker_credential_status')
        .select('id, worker_id, org_id, type, number, issued_at, expiry, mandatory, verified, doc_id, notes, days_to_expiry, status')
        .eq('worker_id', workerId)
        .order('expiry', { ascending: true, nullsFirst: false });
      if (res.error) return { credentials: [], error: res.error.message };
      return { credentials: res.data || [], error: null };
    } catch (e) {
      return { credentials: [], error: e.message };
    }
  }

  /**
   * Rostering eligibility for a worker, keyed by their auth user_id.
   * Calls the SECURITY DEFINER contract function via RPC. This is the SAME
   * source of truth the rostering feature should use (or hit
   * /api/credentials-eligibility server-side).
   * @param {string} userId auth.users.id
   * @returns {Promise<{eligibility, error}>}
   */
  async function getRosteringEligibility(userId) {
    var c = client();
    if (!c) return { eligibility: null, error: 'Supabase not configured' };
    if (!userId) return { eligibility: null, error: 'userId is required' };
    try {
      var res = await c.rpc('worker_rostering_eligibility', { p_user_id: userId });
      if (res.error) return { eligibility: null, error: res.error.message };
      return { eligibility: res.data || null, error: null };
    } catch (e) {
      return { eligibility: null, error: e.message };
    }
  }

  // ----------------------------------------------------------
  // WRITES (RLS: only provider_owner/provider_admin or platform_admin)
  // ----------------------------------------------------------

  /**
   * Insert or update a credential. Pass `id` to update, omit to insert.
   * @param {object} input { id?, worker_id, type, number, issued_at, expiry,
   *                          mandatory, verified, doc_id, notes }
   * @returns {Promise<{credential, error}>}
   */
  async function saveCredential(input) {
    input = input || {};
    var c = client();
    if (!c) return { credential: null, error: 'Supabase not configured' };
    if (!input.worker_id) return { credential: null, error: 'worker_id is required' };
    if (!input.type) return { credential: null, error: 'type is required' };

    var clean = function (v) { var s = (v == null ? '' : String(v)).trim(); return s || null; };
    var row = {
      worker_id: input.worker_id,
      type: input.type,
      number: clean(input.number),
      issued_at: clean(input.issued_at),
      expiry: clean(input.expiry),
      mandatory: !!input.mandatory,
      verified: !!input.verified,
      doc_id: input.doc_id || null,
      notes: clean(input.notes)
    };

    try {
      var res;
      if (input.id) {
        res = await c.from('worker_credentials').update(row).eq('id', input.id).select().single();
      } else {
        res = await c.from('worker_credentials').insert(row).select().single();
      }
      if (res.error) return { credential: null, error: res.error.message };
      return { credential: res.data, error: null };
    } catch (e) {
      return { credential: null, error: e.message };
    }
  }

  /**
   * Delete a credential.
   * @param {string} id
   * @returns {Promise<{error}>}
   */
  async function deleteCredential(id) {
    var c = client();
    if (!c) return { error: 'Supabase not configured' };
    if (!id) return { error: 'id is required' };
    try {
      var res = await c.from('worker_credentials').delete().eq('id', id);
      if (res.error) return { error: res.error.message };
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  }

  /**
   * Upload an evidence file to the private worker-credentials bucket and create
   * a documents row. Storage path MUST start with the worker's auth user_id to
   * satisfy the existing "worker_creds_upload" storage policy.
   *
   * @param {object} args { file, worker_user_id, org_id?, credential_type?, title? }
   * @returns {Promise<{document, storage_path, error}>}
   */
  async function uploadCredentialEvidence(args) {
    args = args || {};
    var c = client();
    if (!c) return { document: null, storage_path: null, error: 'Supabase not configured' };
    if (!args.file) return { document: null, storage_path: null, error: 'No file provided' };
    if (!args.worker_user_id) {
      return { document: null, storage_path: null, error: 'worker_user_id is required (storage RLS keys on it)' };
    }
    try {
      var orgId = args.org_id || null;
      if (!orgId && typeof window.loadCurrentUserContext === 'function') {
        var ctx = await window.loadCurrentUserContext();
        orgId = ctx && ctx.organisationId ? ctx.organisationId : null;
      }
      if (!orgId) return { document: null, storage_path: null, error: 'No organisation found for current user' };

      var file = args.file;
      var safeName = String(file.name || 'credential').replace(/[^\w.\-]+/g, '_');
      // First path segment = worker's auth user_id (required by storage RLS).
      var path = args.worker_user_id + '/' + Date.now() + '_' + safeName;

      var up = await c.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type || undefined
      });
      if (up.error) return { document: null, storage_path: null, error: 'Upload failed: ' + up.error.message };

      var docRes = { document: null, error: 'createDocumentRecord unavailable' };
      if (typeof window.createDocumentRecord === 'function') {
        docRes = await window.createDocumentRecord({
          org_id: orgId,
          title: args.title || ('Credential — ' + (args.credential_type || 'evidence')),
          type: docTypeForCredential(args.credential_type),
          storage_path: path,
          storage_bucket: BUCKET,
          size_bytes: file.size || undefined,
          mime_type: file.type || undefined
        });
      }
      if (docRes.error) {
        try { await c.storage.from(BUCKET).remove([path]); } catch (e) { /* best effort */ }
        return { document: null, storage_path: null, error: 'Saved file but failed to record: ' + docRes.error };
      }
      return { document: docRes.document, storage_path: path, error: null };
    } catch (e) {
      return { document: null, storage_path: null, error: e.message };
    }
  }

  /**
   * Short-lived signed URL to view an evidence file.
   * @param {string} storagePath
   * @param {number} expiresIn seconds (default 300)
   * @returns {Promise<{url, error}>}
   */
  async function getEvidenceSignedUrl(storagePath, expiresIn) {
    var c = client();
    if (!c) return { url: null, error: 'Supabase not configured' };
    if (!storagePath) return { url: null, error: 'storagePath is required' };
    try {
      var res = await c.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn || 300);
      if (res.error) return { url: null, error: res.error.message };
      return { url: (res.data && res.data.signedUrl) || null, error: null };
    } catch (e) {
      return { url: null, error: e.message };
    }
  }

  window.CiaraCredentials = {
    BUCKET: BUCKET,
    CREDENTIAL_TYPES: CREDENTIAL_TYPES,
    docTypeForCredential: docTypeForCredential,
    listWorkerProfiles: listWorkerProfiles,
    loadComplianceRegister: loadComplianceRegister,
    loadWorkerCredentials: loadWorkerCredentials,
    getRosteringEligibility: getRosteringEligibility,
    saveCredential: saveCredential,
    deleteCredential: deleteCredential,
    uploadCredentialEvidence: uploadCredentialEvidence,
    getEvidenceSignedUrl: getEvidenceSignedUrl
  };
})();
