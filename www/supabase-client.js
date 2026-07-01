/**
 * CiaraLink Supabase Client
 * Frontend-safe initialization and auth helpers
 * 
 * IMPORTANT: This file uses ONLY public values (URL + ANON_KEY)
 * Never add: service role key, OpenAI key, Stripe key, or any secrets
 */

(function() {
  // ============================================================
  // CONFIG & INITIALIZATION
  // ============================================================

  // Read from window.ENV (set by env.local.js), fall back to empty strings
  const SUPABASE_URL = (typeof window !== 'undefined' && window.ENV?.SUPABASE_URL) || '';
  const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY) || '';

  let supabaseClient = null;

  /**
   * Check if Supabase is configured
   * @returns {boolean}
   */
  function isSupabaseConfigured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  }

  /**
   * Get or create Supabase client
   * @returns {object|null} Supabase client or null if not configured
   */
  function getSupabaseClient() {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - running in Preview Mode');
      return null;
    }
    
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (e) {
        console.error('Failed to initialize Supabase client');
        return null;
      }
    }
    
    return supabaseClient;
  }

  /**
   * Get connection status label
   * @returns {string}
   */
  function getConnectionStatus() {
    return isSupabaseConfigured() ? 'Connected to Supabase Dev' : 'Preview Mode — Supabase not connected';
  }

  // ============================================================
  // AUTH FUNCTIONS
  // ============================================================

  /**
   * Sign in with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user, session, error}>}
   */
  async function signInWithEmail(email, password) {
    const client = getSupabaseClient();
    if (!client) {
      return { user: null, session: null, error: 'Supabase not configured' };
    }
    
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { user: null, session: null, error: error.message };
      return { user: data.user, session: data.session, error: null };
    } catch (e) {
      console.error('Sign in error:', e.message);
      return { user: null, session: null, error: e.message };
    }
  }

/**
 * Sign out current user
 * @returns {Promise<{error}>}
 */
async function signOut() {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase not configured' };
  }
  
  try {
    const { error } = await client.auth.signOut();
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    console.error('Sign out error:', e.message);
    return { error: e.message };
  }
}

/**
 * Get current auth session
 * @returns {Promise<{data, error}>}
 */
async function getSession() {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase not configured' };
  }
  
  try {
    const { data, error } = await client.auth.getSession();
    return { data, error: error ? error.message : null };
  } catch (e) {
    console.error('Get session error:', e.message);
    return { data: null, error: e.message };
  }
}

/**
 * Get current logged-in user
 * @returns {Promise<{user, error}>}
 */
async function getCurrentUser() {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: 'Supabase not configured' };
  }
  
  try {
    const { data: { user }, error } = await client.auth.getUser();
    return { user, error: error ? error.message : null };
  } catch (e) {
    console.error('Get user error:', e.message);
    return { user: null, error: e.message };
  }
}

// ============================================================
// PROFILE & MEMBERSHIP FUNCTIONS
// ============================================================

/**
 * Load user profile by user ID
 * @param {string} userId - auth.users.id
 * @returns {Promise<{profile, error}>}
 */
async function loadUserProfile(userId) {
  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, error: 'Supabase not configured' };
  }
  
  try {
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) return { profile: null, error: error.message };
    return { profile: data, error: null };
  } catch (e) {
    console.error('Load profile error:', e.message);
    return { profile: null, error: e.message };
  }
}

/**
 * Update the CURRENT user's own profile row (RLS: profiles_own_read_write).
 * Pass a partial patch of allowed columns, e.g. { languages:[...], skills:[...] }.
 * @param {object} patch
 * @returns {Promise<{profile, error}>}
 */
async function updateMyProfile(patch) {
  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, error: 'Supabase not configured' };
  }
  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { profile: null, error: 'No user logged in' };
    }
    // Only allow a known-safe set of self-editable columns through.
    const allowed = ['full_name', 'preferred_name', 'phone', 'languages', 'skills', 'timezone'];
    const clean = {};
    Object.keys(patch || {}).forEach((k) => {
      if (allowed.indexOf(k) !== -1) clean[k] = patch[k];
    });
    if (Object.keys(clean).length === 0) {
      return { profile: null, error: 'Nothing to update' };
    }
    clean.updated_at = new Date().toISOString();
    const { data, error } = await client
      .from('user_profiles')
      .update(clean)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) return { profile: null, error: error.message };
    return { profile: data, error: null };
  } catch (e) {
    console.error('Update profile error:', e.message);
    return { profile: null, error: e.message };
  }
}

/**
 * Load user's organisation memberships
 * @param {string} userId - auth.users.id
 * @returns {Promise<{memberships, error}>}
 */
async function loadUserMemberships(userId) {
  const client = getSupabaseClient();
  if (!client) {
    return { memberships: [], error: 'Supabase not configured' };
  }
  
  try {
    const { data, error } = await client
      .from('organisation_members')
      .select('id, org_id, role, status, organisations(id, name, type)')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (error) return { memberships: [], error: error.message };
    return { memberships: data || [], error: null };
  } catch (e) {
    console.error('Load memberships error:', e.message);
    return { memberships: [], error: e.message };
  }
}

/**
 * Load full user context (user + profile + memberships)
 * @returns {Promise<{user, profile, memberships, primaryRole, organisationId, organisationName, error}>}
 */
async function loadCurrentUserContext() {
  const { user, error: userError } = await getCurrentUser();
  if (userError || !user) {
    return {
      user: null,
      profile: null,
      memberships: [],
      primaryRole: null,
      organisationId: null,
      organisationName: null,
      error: userError || 'No user logged in'
    };
  }
  
  const { profile, error: profileError } = await loadUserProfile(user.id);
  if (profileError) {
    console.warn('Profile load error:', profileError);
  }
  
  const { memberships, error: memberError } = await loadUserMemberships(user.id);
  if (memberError) {
    console.warn('Memberships load error:', memberError);
  }
  
  // Use first membership as primary (or let app choose)
  const primaryMembership = memberships && memberships.length > 0 ? memberships[0] : null;
  const primaryRole = primaryMembership?.role || null;
  const organisationId = primaryMembership?.org_id || null;
  const organisationName = primaryMembership?.organisations?.name || null;
  
  return {
    user,
    profile: profile || null,
    memberships: memberships || [],
    primaryRole,
    organisationId,
    organisationName,
    error: null
  };
}

// ============================================================
// PARTICIPANT DATA QUERIES (RLS-protected)
// ============================================================

/**
 * Load participants for current user (respects RLS)
 * @returns {Promise<{participants, error}>}
 */
async function loadParticipantsForCurrentUser() {
  const client = getSupabaseClient();
  if (!client) {
    return { participants: [], error: 'Supabase not configured' };
  }
  
  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { participants: [], error: 'No user logged in' };
    }
    
    // RLS will filter based on logged-in user's role and org
    const { data, error } = await client
      .from('participants')
      .select(`
        id,
        org_id,
        ndis_number,
        full_name,
        preferred_name,
        dob,
        gender,
        address,
        phone,
        email,
        status,
        funding_type,
        plan_start,
        plan_end,
        support_coordinator_id,
        created_at,
        updated_at
      `)
      .limit(100);
    
    if (error) return { participants: [], error: error.message };
    return { participants: data || [], error: null };
  } catch (e) {
    console.error('Load participants error:', e.message);
    return { participants: [], error: e.message };
  }
}

/**
 * Load single participant by ID (respects RLS)
 * @param {string} participantId
 * @returns {Promise<{participant, error}>}
 */
async function loadParticipantById(participantId) {
  const client = getSupabaseClient();
  if (!client) {
    return { participant: null, error: 'Supabase not configured' };
  }
  
  try {
    const { data, error } = await client
      .from('participants')
      .select(`
        id,
        org_id,
        ndis_number,
        full_name,
        preferred_name,
        dob,
        gender,
        address,
        phone,
        email,
        status,
        funding_type,
        plan_start,
        plan_end,
        support_coordinator_id,
        created_at,
        updated_at
      `)
      .eq('id', participantId)
      .single();
    
    if (error) return { participant: null, error: error.message };
    return { participant: data, error: null };
  } catch (e) {
    console.error('Load participant error:', e.message);
    return { participant: null, error: e.message };
  }
}

/**
 * Load participant contacts
 * @param {string} participantId
 * @returns {Promise<{contacts, error}>}
 */
async function loadParticipantContacts(participantId) {
  const client = getSupabaseClient();
  if (!client) {
    return { contacts: [], error: 'Supabase not configured' };
  }
  
  try {
    const { data, error } = await client
      .from('participant_contacts')
      .select('*')
      .eq('participant_id', participantId)
      .order('created_at', { ascending: false });
    
    if (error) return { contacts: [], error: error.message };
    return { contacts: data || [], error: null };
  } catch (e) {
    console.error('Load contacts error:', e.message);
    return { contacts: [], error: e.message };
  }
}

/**
 * Load care team for participant (respects consent)
 * @param {string} participantId
 * @returns {Promise<{careTeam, error}>}
 */
async function loadParticipantCareTeam(participantId) {
  const client = getSupabaseClient();
  if (!client) {
    return { careTeam: [], error: 'Supabase not configured' };
  }

  try {
    const { data: profileRows, error: rpcError } = await client.rpc('care_team_profiles', {
      p_participant_id: participantId,
    });

    if (!rpcError && Array.isArray(profileRows) && profileRows.length) {
      const careTeam = profileRows.map((row) => ({
        user_id: row.user_id,
        role: row.role,
        org_id: row.org_id,
        full_name: row.full_name || null,
        email: row.email || null,
        status: 'active',
        participant_id: participantId,
      }));
      return { careTeam, error: null };
    }

    const { data, error } = await client
      .from('care_team_relationships')
      .select(`
        id,
        participant_id,
        role,
        status,
        consent_given,
        consent_date,
        user_id,
        org_id,
        created_at
      `)
      .eq('participant_id', participantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) return { careTeam: [], error: error.message };
    return { careTeam: data || [], error: null };
  } catch (e) {
    console.error('Load care team error:', e.message);
    return { careTeam: [], error: e.message };
  }
}

/**
 * Load shifts assigned to the current worker (respects RLS)
 * RLS policy "shifts_worker_assigned" limits rows to worker_id = auth.uid().
 * Embeds the participant's name (RLS-filtered separately) for display.
 * @returns {Promise<{shifts, error}>}
 */
async function loadShiftsForWorker() {
  const client = getSupabaseClient();
  if (!client) {
    return { shifts: [], error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { shifts: [], error: 'No user logged in' };
    }

    const { data, error } = await client
      .from('shifts')
      .select(`
        id,
        org_id,
        participant_id,
        worker_id,
        title,
        location,
        start_time,
        end_time,
        status,
        support_type,
        notes,
        participants ( full_name, preferred_name )
      `)
      .eq('worker_id', user.id)
      .order('start_time', { ascending: true })
      .limit(100);

    if (error) return { shifts: [], error: error.message };
    return { shifts: data || [], error: null };
  } catch (e) {
    console.error('Load worker shifts error:', e.message);
    return { shifts: [], error: e.message };
  }
}

// ============================================================
// CLOCK IN / OUT + SHIFT NOTES (worker daily workflow)
// Requires migration 20260626120000_worker_clock_and_notes.sql
// (shifts.checked_in_at / checked_out_at + "shifts_worker_update_own" policy,
//  and the shift_notes table + worker-insert RLS).
// ============================================================

/**
 * Clock the current worker IN to one of their own shifts.
 * RLS "shifts_worker_update_own" only lets a worker update their own shift row.
 * Records checked_in_at = now and advances status to 'in_progress'.
 * @param {string} shiftId - shifts.id (must belong to the signed-in worker)
 * @returns {Promise<{shift, error}>}
 */
async function clockInShift(shiftId) {
  const client = getSupabaseClient();
  if (!client) return { shift: null, error: 'Supabase not configured' };

  try {
    const { data, error } = await client
      .from('shifts')
      .update({ checked_in_at: new Date().toISOString(), status: 'in_progress' })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) return { shift: null, error: error.message };
    return { shift: data, error: null };
  } catch (e) {
    console.error('Clock-in error:', e.message);
    return { shift: null, error: e.message };
  }
}

/**
 * Clock the current worker OUT of one of their own shifts.
 * Records checked_out_at = now and advances status to 'completed'.
 * @param {string} shiftId - shifts.id (must belong to the signed-in worker)
 * @returns {Promise<{shift, error}>}
 */
async function clockOutShift(shiftId) {
  const client = getSupabaseClient();
  if (!client) return { shift: null, error: 'Supabase not configured' };

  try {
    const { data, error } = await client
      .from('shifts')
      .update({ checked_out_at: new Date().toISOString(), status: 'completed' })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) return { shift: null, error: error.message };
    return { shift: data, error: null };
  } catch (e) {
    console.error('Clock-out error:', e.message);
    return { shift: null, error: e.message };
  }
}

/**
 * Create a shift / progress note authored by the current worker.
 * RLS "shift_notes_worker_insert" requires author_id = auth.uid() and the
 * shift_id to belong to the worker. org_id + participant_id come from the
 * shift the note is written against.
 * @param {{shift_id?, participant_id, org_id, body, note_type?}} input
 * @returns {Promise<{note, error}>}
 */
async function createShiftNote(input) {
  const client = getSupabaseClient();
  if (!client) return { note: null, error: 'Supabase not configured' };

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) return { note: null, error: 'No user logged in' };

    const row = {
      author_id: user.id,
      shift_id: input.shift_id || null,
      participant_id: input.participant_id,
      org_id: input.org_id,
      note_type: input.note_type || 'shift_note',
      body: input.body,
    };

    const { data, error } = await client
      .from('shift_notes')
      .insert(row)
      .select()
      .single();

    if (error) return { note: null, error: error.message };
    return { note: data, error: null };
  } catch (e) {
    console.error('Create shift note error:', e.message);
    return { note: null, error: e.message };
  }
}

/**
 * Read shift / progress notes back from Supabase. RLS scopes the result:
 *   - a worker sees the notes they authored ("shift_notes_worker_read_own")
 *   - a provider owner/admin/staff sees every note for their org's shifts
 *     ("shift_notes_provider_org")
 *   - care-team members (SC, allied, worker on team) via "shift_notes_care_team_read"
 *     when is_care_team_member(participant_id) — requires consent_given on the link.
 * Used by the plan-review evidence pack (loadReviewEvidencePack) for SC visibility.
 * Embeds the participant name for display. Author name is resolved separately
 * (shift_notes.author_id → auth.users, which PostgREST can't embed directly).
 * @param {{participantId?: string, limit?: number}} [opts]
 * @returns {Promise<{notes: Array, error: (string|null)}>}
 */
async function loadShiftNotes(opts) {
  const o = opts || {};
  const client = getSupabaseClient();
  if (!client) return { notes: [], error: 'Supabase not configured' };

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) return { notes: [], error: 'No user logged in' };

    let query = client
      .from('shift_notes')
      .select(`
        id,
        org_id,
        shift_id,
        participant_id,
        author_id,
        note_type,
        body,
        created_at,
        participants ( full_name, preferred_name )
      `)
      .order('created_at', { ascending: false })
      .limit(o.limit || 100);

    if (o.participantId) query = query.eq('participant_id', o.participantId);

    const { data, error } = await query;
    if (error) return { notes: [], error: error.message };
    return { notes: data || [], error: null };
  } catch (e) {
    console.error('Load shift notes error:', e.message);
    return { notes: [], error: e.message };
  }
}

// ============================================================
// TASKS (RLS: tasks_assigned_to — created_by/assigned_to = auth.uid())
// ============================================================

/**
 * Load tasks for the current user (respects RLS).
 * RLS policy "tasks_assigned_to" returns rows where the user is the
 * creator or assignee; "tasks_org_scoped" / "tasks_sc_participant" may
 * widen this. Embeds participant name for display when present.
 * @returns {Promise<{tasks, error}>}
 */
async function loadTasksForCurrentUser() {
  const client = getSupabaseClient();
  if (!client) {
    return { tasks: [], error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { tasks: [], error: 'No user logged in' };
    }

    const { data, error } = await client
      .from('tasks')
      .select(`
        id,
        org_id,
        participant_id,
        assigned_to,
        created_by,
        title,
        description,
        type,
        status,
        priority,
        due_date,
        completed_at,
        created_at,
        participants ( full_name, preferred_name )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { tasks: [], error: error.message };
    return { tasks: data || [], error: null };
  } catch (e) {
    console.error('Load tasks error:', e.message);
    return { tasks: [], error: e.message };
  }
}

/**
 * Create a task for the current user (RLS-scoped INSERT).
 * created_by and assigned_to default to the signed-in user so the row
 * satisfies "tasks_assigned_to" WITH CHECK and is readable back.
 * @param {{title:string, description?:string, priority?:string, due_date?:string, status?:string, participant_id?:string, org_id?:string}} input
 * @returns {Promise<{task, error}>}
 */
async function createTask(input) {
  const client = getSupabaseClient();
  if (!client) {
    return { task: null, error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { task: null, error: 'No user logged in' };
    }

    const row = {
      created_by: user.id,
      assigned_to: input.assigned_to || user.id,
      title: input.title,
      description: input.description || null,
      type: input.type || 'general',
      status: input.status || 'pending',
      priority: input.priority || 'normal',
      due_date: input.due_date || null,
    };
    if (input.participant_id) row.participant_id = input.participant_id;
    if (input.org_id) row.org_id = input.org_id;

    const { data, error } = await client
      .from('tasks')
      .insert(row)
      .select()
      .single();

    if (error) return { task: null, error: error.message };
    return { task: data, error: null };
  } catch (e) {
    console.error('Create task error:', e.message);
    return { task: null, error: e.message };
  }
}

/**
 * Update a task's status (RLS-scoped UPDATE via "tasks_assigned_to").
 * Sets completed_at when status is 'completed', clears it otherwise.
 * @param {string} taskId
 * @param {string} status - task_status enum value
 * @returns {Promise<{task, error}>}
 */
async function updateTaskStatus(taskId, status) {
  const client = getSupabaseClient();
  if (!client) {
    return { task: null, error: 'Supabase not configured' };
  }

  try {
    const patch = {
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    };
    const { data, error } = await client
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .select()
      .single();

    if (error) return { task: null, error: error.message };
    return { task: data, error: null };
  } catch (e) {
    console.error('Update task error:', e.message);
    return { task: null, error: e.message };
  }
}

// ============================================================
// NOTIFICATIONS (RLS: notifs_own — user_id = auth.uid())
// ============================================================

/**
 * Load notifications for the current user (RLS: notifs_own).
 * @returns {Promise<{notifications, error}>}
 */
async function loadNotificationsForCurrentUser() {
  const client = getSupabaseClient();
  if (!client) {
    return { notifications: [], error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { notifications: [], error: 'No user logged in' };
    }

    const { data, error } = await client
      .from('notifications')
      .select('id, user_id, type, title, body, reference_id, reference_type, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { notifications: [], error: error.message };
    return { notifications: data || [], error: null };
  } catch (e) {
    console.error('Load notifications error:', e.message);
    return { notifications: [], error: e.message };
  }
}

/**
 * Mark a single notification as read (RLS: notifs_own).
 * @param {string} notificationId
 * @returns {Promise<{notification, error}>}
 */
async function markNotificationRead(notificationId) {
  const client = getSupabaseClient();
  if (!client) {
    return { notification: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) return { notification: null, error: error.message };
    return { notification: data, error: null };
  } catch (e) {
    console.error('Mark notification read error:', e.message);
    return { notification: null, error: e.message };
  }
}

/**
 * Mark all of the current user's unread notifications as read.
 * RLS scopes the update to the user's own rows.
 * @returns {Promise<{count, error}>}
 */
async function markAllNotificationsRead() {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { count: 0, error: 'No user logged in' };
    }

    const { data, error } = await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
      .select('id');

    if (error) return { count: 0, error: error.message };
    return { count: (data || []).length, error: null };
  } catch (e) {
    console.error('Mark all notifications read error:', e.message);
    return { count: 0, error: e.message };
  }
}

/**
 * Count unread notifications for the current user.
 * @returns {Promise<{count, error}>}
 */
async function countUnreadNotifications() {
  const client = getSupabaseClient();
  if (!client) return { count: 0, error: 'Supabase not configured' };
  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) return { count: 0, error: 'No user logged in' };
    const { count, error } = await client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null);
    if (error) return { count: 0, error: error.message };
    return { count: count || 0, error: null };
  } catch (e) {
    console.error('Count unread notifications error:', e.message);
    return { count: 0, error: e.message };
  }
}

/** @type {ReturnType<typeof setInterval>|null} */
let _notifPollTimer = null;

/**
 * Poll unread notification count (in-app refresh; no browser push).
 * @param {(count:number)=>void} onUpdate
 * @param {number} [intervalMs=45000]
 * @returns {()=>void} stop function
 */
function startNotificationPolling(onUpdate, intervalMs) {
  const ms = intervalMs || 45000;
  const tick = () => {
    Promise.resolve(countUnreadNotifications()).then((res) => {
      if (res && !res.error && typeof onUpdate === 'function') onUpdate(res.count || 0);
    }).catch(() => {});
  };
  tick();
  if (_notifPollTimer) clearInterval(_notifPollTimer);
  _notifPollTimer = setInterval(tick, ms);
  return () => {
    if (_notifPollTimer) {
      clearInterval(_notifPollTimer);
      _notifPollTimer = null;
    }
  };
}

function stopNotificationPolling() {
  if (_notifPollTimer) {
    clearInterval(_notifPollTimer);
    _notifPollTimer = null;
  }
}

// ============================================================
// REFERRALS (RLS: referrals_org_scoped — from_org_id/to_org_id in my orgs)
// ============================================================

/**
 * Load referrals visible to the current user (RLS-scoped).
 * Embeds participant name for display.
 * @returns {Promise<{referrals, error}>}
 */
async function loadReferralsForCurrentUser() {
  const client = getSupabaseClient();
  if (!client) {
    return { referrals: [], error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { referrals: [], error: 'No user logged in' };
    }

    const { data, error } = await client
      .from('referrals')
      .select(`
        id,
        from_org_id,
        to_org_id,
        participant_id,
        type,
        status,
        priority,
        notes,
        created_at,
        participants ( full_name, preferred_name )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { referrals: [], error: error.message };
    return { referrals: data || [], error: null };
  } catch (e) {
    console.error('Load referrals error:', e.message);
    return { referrals: [], error: e.message };
  }
}

/**
 * Create a referral (RLS-scoped INSERT via "referrals_org_scoped").
 * from_org_id MUST be one of the current user's active orgs to satisfy
 * the WITH CHECK. participant_id must reference a real participant.
 * @param {{from_org_id:string, participant_id:string, type:string, priority?:string, notes?:string, to_org_id?:string, status?:string}} input
 * @returns {Promise<{referral, error}>}
 */
async function createReferral(input) {
  const client = getSupabaseClient();
  if (!client) {
    return { referral: null, error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { referral: null, error: 'No user logged in' };
    }
    if (!input.from_org_id || !input.participant_id || !input.type) {
      return { referral: null, error: 'from_org_id, participant_id and type are required' };
    }

    const row = {
      from_org_id: input.from_org_id,
      to_org_id: input.to_org_id || null,
      participant_id: input.participant_id,
      type: input.type,
      status: input.status || 'received',
      priority: input.priority || 'routine',
      notes: input.notes || null,
      created_by: user.id,
    };

    const { data, error } = await client
      .from('referrals')
      .insert(row)
      .select()
      .single();

    if (error) return { referral: null, error: error.message };
    return { referral: data, error: null };
  } catch (e) {
    console.error('Create referral error:', e.message);
    return { referral: null, error: e.message };
  }
}

/**
 * Provider sends a structured handoff to the participant's support coordinator(s):
 * coordination note on profile + in-app notification (+ optional referral status → active).
 * Requires migration 20260630120000_shift_completed_and_handoff.sql (RPC).
 * @param {{participant_id:string, message:string, referral_id?:string}} input
 * @returns {Promise<{ok:boolean, noteId?:string, error?:string}>}
 */
async function sendHandoffToCoordinator(input) {
  input = input || {};
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase not configured' };
  if (!input.participant_id || !input.message) {
    return { ok: false, error: 'participant_id and message are required' };
  }
  try {
    const { data, error } = await client.rpc('send_handoff_to_coordinator', {
      p_participant_id: input.participant_id,
      p_message: input.message,
      p_referral_id: input.referral_id || null,
    });
    if (error) return { ok: false, error: error.message };
    if (!data || !data.ok) return { ok: false, error: (data && data.error) || 'Handoff failed' };
    return { ok: true, noteId: data.note_id, error: null };
  } catch (e) {
    console.error('sendHandoffToCoordinator error:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Resolve the active provider org linked to a participant (provider_participant_links).
 * Used when a support coordinator sends a referral to the participant's service provider.
 * @param {string} participantId
 * @returns {Promise<{orgId, error}>}
 */
async function loadProviderOrgForParticipant(participantId) {
  const client = getSupabaseClient();
  if (!client) return { orgId: null, error: 'Supabase not configured' };
  if (!participantId) return { orgId: null, error: 'participant_id is required' };
  try {
    const { data, error } = await client
      .from('provider_participant_links')
      .select('provider_org_id')
      .eq('participant_id', participantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { orgId: null, error: error.message };
    return { orgId: data?.provider_org_id || null, error: null };
  } catch (e) {
    console.error('loadProviderOrgForParticipant error:', e.message);
    return { orgId: null, error: e.message };
  }
}

/**
 * Update referral status (RLS: referrals_org_scoped — from/to org member).
 * @param {string} referralId
 * @param {string} status — referral_status enum value
 * @returns {Promise<{referral, error}>}
 */
async function updateReferralStatus(referralId, status) {
  const client = getSupabaseClient();
  if (!client) return { referral: null, error: 'Supabase not configured' };
  if (!referralId || !status) return { referral: null, error: 'referralId and status are required' };
  try {
    const { data, error } = await client
      .from('referrals')
      .update({ status })
      .eq('id', referralId)
      .select()
      .single();
    if (error) return { referral: null, error: error.message };
    return { referral: data, error: null };
  } catch (e) {
    console.error('updateReferralStatus error:', e.message);
    return { referral: null, error: e.message };
  }
}

// ============================================================
// MESSAGING (RLS: threads_create / messages_sender — created_by/sender_id = auth.uid())
// ============================================================

/**
 * Load message threads visible to the current user (RLS-scoped).
 * @returns {Promise<{threads, error}>}
 */
async function loadMessageThreadsForCurrentUser() {
  const client = getSupabaseClient();
  if (!client) {
    return { threads: [], error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { threads: [], error: 'No user logged in' };
    }

    const { data, error } = await client
      .from('message_threads')
      .select('id, participant_id, org_id, subject, type, reference_id, reference_type, created_by, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) return { threads: [], error: error.message };
    return { threads: data || [], error: null };
  } catch (e) {
    console.error('Load message threads error:', e.message);
    return { threads: [], error: e.message };
  }
}

/**
 * Load messages in a thread (RLS: messages_thread_member).
 * @param {string} threadId
 * @returns {Promise<{messages, error}>}
 */
async function loadThreadMessages(threadId) {
  const client = getSupabaseClient();
  if (!client) {
    return { messages: [], error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await client
      .from('messages')
      .select('id, thread_id, sender_id, body, type, attachment_id, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) return { messages: [], error: error.message };
    return { messages: data || [], error: null };
  } catch (e) {
    console.error('Load thread messages error:', e.message);
    return { messages: [], error: e.message };
  }
}

/**
 * Send a message in an existing thread (RLS: messages_sender INSERT).
 * @param {string} threadId
 * @param {string} body
 * @returns {Promise<{message, error}>}
 */
async function sendMessage(threadId, body) {
  const client = getSupabaseClient();
  if (!client) {
    return { message: null, error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { message: null, error: 'No user logged in' };
    }

    const { data, error } = await client
      .from('messages')
      .insert({ thread_id: threadId, sender_id: user.id, body, type: 'text' })
      .select()
      .single();

    if (error) return { message: null, error: error.message };
    return { message: data, error: null };
  } catch (e) {
    console.error('Send message error:', e.message);
    return { message: null, error: e.message };
  }
}

/**
 * Create a message thread and add the current user as a member.
 * RLS: threads_create WITH CHECK (created_by = auth.uid()).
 * @param {{subject?:string, type?:string, participant_id?:string, org_id?:string, memberUserIds?:string[]}} input
 * @returns {Promise<{thread, error}>}
 */
async function createMessageThread(input) {
  const client = getSupabaseClient();
  if (!client) {
    return { thread: null, error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { thread: null, error: 'No user logged in' };
    }

    const threadRow = {
      created_by: user.id,
      subject: input.subject || null,
      type: input.type || 'general',
    };
    if (input.participant_id) threadRow.participant_id = input.participant_id;
    if (input.org_id) threadRow.org_id = input.org_id;
    // Optional reference linkage (e.g. reference_type='coordinator'/'care_team',
    // reference_id=participant_id/care_team_relationship_id) so a conversation can be
    // re-opened later instead of creating a duplicate thread. Additive + backwards compatible.
    if (input.reference_id) threadRow.reference_id = input.reference_id;
    if (input.reference_type) threadRow.reference_type = input.reference_type;

    const { data: thread, error: threadError } = await client
      .from('message_threads')
      .insert(threadRow)
      .select()
      .single();

    if (threadError) return { thread: null, error: threadError.message };

    // Add members (always include the creator)
    const memberIds = Array.from(new Set([user.id, ...((input.memberUserIds) || [])]));
    const memberRows = memberIds.map(uid => ({ thread_id: thread.id, user_id: uid }));
    const { error: memberError } = await client
      .from('message_thread_members')
      .insert(memberRows);

    if (memberError) {
      console.warn('Thread created but member insert failed:', memberError.message);
    }

    return { thread, error: null };
  } catch (e) {
    console.error('Create message thread error:', e.message);
    return { thread: null, error: e.message };
  }
}

// ============================================================
// DOCUMENTS (metadata rows only — RLS: docs_uploader = auth.uid())
// NOTE: This creates METADATA rows. Real file upload to Storage is NOT
// performed here; callers must pass a storage_path (required NOT NULL).
// ============================================================

/**
 * Load documents visible to the current user (RLS-scoped).
 * @returns {Promise<{documents, error}>}
 */
async function loadDocumentsForCurrentUser() {
  const client = getSupabaseClient();
  if (!client) {
    return { documents: [], error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { documents: [], error: 'No user logged in' };
    }

    const { data, error } = await client
      .from('documents')
      .select('id, org_id, participant_id, uploaded_by, type, title, description, storage_path, storage_bucket, size_bytes, mime_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { documents: [], error: error.message };
    return { documents: data || [], error: null };
  } catch (e) {
    console.error('Load documents error:', e.message);
    return { documents: [], error: e.message };
  }
}

/**
 * Create a document METADATA row (RLS: docs_uploader INSERT, uploaded_by = auth.uid()).
 * Does NOT upload a file. storage_path and org_id are required NOT NULL columns.
 * @param {{org_id:string, title:string, type?:string, description?:string, storage_path:string, storage_bucket?:string, participant_id?:string, size_bytes?:number, mime_type?:string}} input
 * @returns {Promise<{document, error}>}
 */
async function createDocumentRecord(input) {
  const client = getSupabaseClient();
  if (!client) {
    return { document: null, error: 'Supabase not configured' };
  }

  try {
    const { user, error: userError } = await getCurrentUser();
    if (userError || !user) {
      return { document: null, error: 'No user logged in' };
    }
    if (!input.org_id || !input.title || !input.storage_path) {
      return { document: null, error: 'org_id, title and storage_path are required' };
    }

    const row = {
      org_id: input.org_id,
      uploaded_by: user.id,
      type: input.type || 'other',
      title: input.title,
      description: input.description || null,
      storage_path: input.storage_path,
      storage_bucket: input.storage_bucket || 'participant-documents',
      size_bytes: input.size_bytes || null,
      mime_type: input.mime_type || null,
    };
    if (input.participant_id) row.participant_id = input.participant_id;

    const { data, error } = await client
      .from('documents')
      .insert(row)
      .select()
      .single();

    if (error) return { document: null, error: error.message };
    return { document: data, error: null };
  } catch (e) {
    console.error('Create document record error:', e.message);
    return { document: null, error: e.message };
  }
}

// ============================================================
// QUERY HELPERS FOR DASHBOARDS (Synchronous fallback + async)
// ============================================================

/**
 * Query participants by provider (for Provider Dashboard)
 * ASYNC: Returns promise that resolves to participants
 * For synchronous fallback, returns demo data immediately
 * @returns {Promise<Array>} participants array
 */
async function queryParticipantsByProvider() {
  // Demo data for Provider Dashboard
  const demoParticipants = [
    {
      id: 'demo-alex',
      full_name: 'Alex Demo',
      preferred_name: 'Alex',
      ndis_number: '4310 887 226',
      status: 'active',
      funding_type: 'Plan-managed',
      plan_start: '01 Jul 2026',
      plan_end: '30 Jun 2027'
    },
    {
      id: 'demo-jordan',
      full_name: 'Jordan Sample',
      preferred_name: 'Jordan',
      ndis_number: '4221 553 109',
      status: 'active',
      funding_type: 'Self-managed',
      plan_start: '15 Jun 2026',
      plan_end: '14 Jun 2027'
    },
    {
      id: 'demo-casey',
      full_name: 'Casey Example',
      preferred_name: 'Casey',
      ndis_number: '4118 224 770',
      status: 'active',
      funding_type: 'Plan-managed',
      plan_start: '01 Aug 2026',
      plan_end: '31 Jul 2027'
    }
  ];
  
  if (!isSupabaseConfigured()) {
    return demoParticipants;
  }
  
  // Load real data from Supabase
  try {
    const { participants, error } = await loadParticipantsForCurrentUser();
    if (error) {
      console.warn('Failed to load participants from Supabase:', error);
      return [];
    }
    return participants || [];
  } catch (e) {
    console.warn('Error loading participants:', e.message);
    return [];
  }
}

/**
 * Query participants by coordinator (for Support Coordinator Dashboard)
 * ASYNC: When Supabase is configured, returns the coordinator's RLS-filtered
 * participants (care-team linked). Otherwise returns demo data.
 * @returns {Promise<Array>} participants array
 */
async function queryParticipantsByCoordinator() {
  const demoParticipants = [
    {
      id: 'demo-alex',
      full_name: 'Alex Demo',
      preferred_name: 'Alex',
      ndis_number: '4310 887 226',
      status: 'active',
      funding_type: 'Plan-managed',
      plan_start: '01 Jul 2026',
      plan_end: '30 Jun 2027'
    },
    {
      id: 'demo-jordan',
      full_name: 'Jordan Sample',
      preferred_name: 'Jordan',
      ndis_number: '4221 553 109',
      status: 'active',
      funding_type: 'Self-managed',
      plan_start: '15 Jun 2026',
      plan_end: '14 Jun 2027'
    }
  ];

  if (!isSupabaseConfigured()) {
    return demoParticipants;
  }

  // Load real data from Supabase — RLS scopes results to the
  // coordinator's care-team-linked participants.
  try {
    const { participants, error } = await loadParticipantsForCurrentUser();
    if (error) {
      console.warn('Failed to load coordinator participants from Supabase:', error);
      return [];
    }
    return participants || [];
  } catch (e) {
    console.warn('Error loading coordinator participants:', e.message);
    return [];
  }
}

/**
 * Query participants by allied health (for Allied Health Dashboard)
 * ASYNC: When Supabase is configured, returns the practitioner's RLS-filtered
 * participants (care-team linked). Otherwise returns demo data.
 * @returns {Promise<Array>} participants array
 */
async function queryParticipantsByAlliedHealth() {
  const demoParticipants = [
    {
      id: 'demo-casey',
      full_name: 'Casey Example',
      preferred_name: 'Casey',
      ndis_number: '4118 224 770',
      status: 'active',
      funding_type: 'Plan-managed',
      plan_start: '01 Aug 2026',
      plan_end: '31 Jul 2027'
    }
  ];

  if (!isSupabaseConfigured()) {
    return demoParticipants;
  }

  // Load real data from Supabase — RLS scopes results to the
  // practitioner's care-team-linked participants.
  try {
    const { participants, error } = await loadParticipantsForCurrentUser();
    if (error) {
      console.warn('Failed to load allied-health participants from Supabase:', error);
      return [];
    }
    return participants || [];
  } catch (e) {
    console.warn('Error loading allied-health participants:', e.message);
    return [];
  }
}

/**
 * Read ?id= or ?participantId= from the current page URL.
 * @returns {string|null}
 */
function getParticipantIdFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('participantId') || null;
  } catch (e) {
    return null;
  }
}

/**
 * Read ?view= tab key from the current page URL (Participant Profile).
 * @returns {string|null}
 */
function getParticipantViewFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || null;
  } catch (e) {
    return null;
  }
}

/**
 * Build a Participant Profile URL with optional id and tab view.
 * @param {string} [participantId]
 * @param {string} [view] - overview|plan|goals|team|docs|notes|timeline|review
 * @returns {string}
 */
function participantProfileUrl(participantId, view) {
  const base = 'Participant Profile.dc.html';
  const params = new URLSearchParams();
  if (participantId) params.set('id', participantId);
  if (view) params.set('view', view);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Normalize demo short codes and real enum roles (matches auth-guard.js). */
function normRoleBucket(role) {
  const map = {
    provider: 'provider', provider_owner: 'provider', provider_admin: 'provider',
    provider_staff: 'provider', platform_admin: 'provider',
    worker: 'worker', support_worker: 'worker', abn_worker: 'worker',
    coordinator: 'coordinator', support_coordinator: 'coordinator',
    allied: 'allied', allied_health: 'allied', allied_health_admin: 'allied',
    participant: 'participant', guardian: 'participant', guardian_nominee: 'participant',
  };
  return role ? (map[role] || null) : null;
}

/** Which canonical role bucket a protected .dc.html page belongs to (matches auth-guard.js). */
function pageRoleBucketForFile(fileName) {
  const PAGE_ROLE = {
    'CiaraLink Provider Dashboard.dc.html': 'provider',
    'Provider Console.dc.html': 'provider',
    'Compliance Register.dc.html': 'provider',
    'Incident Centre.dc.html': 'provider',
    'Payroll.dc.html': 'provider',
    'Claims.dc.html': 'provider',
    'Integrations.dc.html': 'provider',
    'Roster.dc.html': 'provider',
    'Support Worker.dc.html': 'worker',
    'Worker App.dc.html': 'worker',
    'Worker Passport.dc.html': 'worker',
    'Support Coordination.dc.html': 'coordinator',
    'Plan Review Prep.dc.html': 'coordinator',
    'Allied Health.dc.html': 'allied',
    'Participant Dashboard.dc.html': 'participant',
  };
  let file = fileName || '';
  try { file = decodeURIComponent(String(file).split('?')[0].split('/').pop() || ''); } catch (e) {}
  return PAGE_ROLE[file] || null;
}

/** True when a relative path is allowed for the user's enum role (sign-in ?next= guard). */
function isPathAllowedForRole(relativePath, roleEnum) {
  const want = pageRoleBucketForFile(relativePath);
  if (!want) return true;
  const have = normRoleBucket(roleEnum);
  return !!(have && have === want);
}

/**
 * Deep-link href for a notification row (Notification Centre + ops e2e).
 * @param {{reference_type?: string, reference_id?: string}} n
 * @param {string} [roleBucket] - canonical bucket from normRoleBucket
 */
function resolveNotificationHref(n, roleBucket) {
  if (!n || !n.reference_type) return null;
  const id = n.reference_id;
  const enc = id != null ? encodeURIComponent(String(id)) : '';
  const role = roleBucket || null;

  switch (n.reference_type) {
    case 'shift':
      if (!id) return null;
      if (role === 'worker') return `Support Worker.dc.html?shift=${enc}`;
      return `CiaraLink Provider Dashboard.dc.html?nav=roster&shift=${enc}`;
    case 'referral':
      if (role === 'coordinator') return 'Support Coordination.dc.html';
      return id ? `CiaraLink Provider Dashboard.dc.html?nav=referrals&selRef=${enc}` : null;
    case 'document':
      if (role === 'coordinator') return 'Support Coordination.dc.html';
      if (role === 'allied') return 'Allied Health.dc.html';
      return 'CiaraLink Provider Dashboard.dc.html?nav=docs_hub';
    case 'participant':
      if (id) rememberSelectedParticipantId(id);
      return participantProfileUrl(id || null);
    case 'incident':
      return id ? `Incident Centre.dc.html?id=${enc}` : 'Incident Centre.dc.html';
    case 'worker_credential':
      return 'Worker Passport.dc.html';
    default:
      return null;
  }
}

/**
 * Persist the active participant id in the local session (for pages that read
 * selectedParticipantId when ?id= is absent).
 * @param {string} participantId
 */
function rememberSelectedParticipantId(participantId) {
  if (!participantId || typeof window === 'undefined') return;
  try {
    const s = JSON.parse(localStorage.getItem('ciaralink_session') || '{}');
    s.selectedParticipantId = participantId;
    localStorage.setItem('ciaralink_session', JSON.stringify(s));
  } catch (e) {
    /* ignore storage errors */
  }
}

/**
 * Navigate to Participant Profile with optional tab view.
 * @param {string} [participantId]
 * @param {string} [view]
 */
function navigateToParticipantProfile(participantId, view) {
  if (participantId) rememberSelectedParticipantId(participantId);
  if (typeof window !== 'undefined') {
    window.location.href = participantProfileUrl(participantId, view);
  }
}

/**
 * Resolve which participant id to load: explicit arg → URL → session.
 * @param {string} [explicitId]
 * @returns {string|null}
 */
function resolveParticipantProfileId(explicitId) {
  if (explicitId) return explicitId;
  const urlId = getParticipantIdFromUrl();
  if (urlId) return urlId;
  if (typeof window === 'undefined') return null;
  try {
    const s = JSON.parse(localStorage.getItem('ciaralink_session') || '{}');
    return s.selectedParticipantId || s.participantId || null;
  } catch (e) {
    return null;
  }
}

/**
 * Load NDIS plan budget rows for a participant (claim_budget_status view when available).
 * @param {string} participantId
 * @returns {Promise<{budgets: Array, error: string|null}>}
 */
async function listParticipantPlanBudgets(participantId) {
  const client = getSupabaseClient();
  if (!client || !participantId) {
    return { budgets: [], error: 'Supabase not configured or no participant id' };
  }

  try {
    const { data, error } = await client
      .from('claim_budget_status')
      .select('*')
      .eq('participant_id', participantId)
      .order('support_category_number', { ascending: true });

    if (!error && data) {
      return { budgets: data, error: null };
    }

    const { data: rows, error: tableError } = await client
      .from('participant_plan_budgets')
      .select('*')
      .eq('participant_id', participantId)
      .order('support_category_number', { ascending: true });

    if (tableError) return { budgets: [], error: tableError.message };
    return { budgets: rows || [], error: null };
  } catch (e) {
    console.warn('listParticipantPlanBudgets error:', e.message);
    return { budgets: [], error: e.message };
  }
}

const SC_CORE_CATEGORIES = new Set([1, 2, 3, 4]);
const SC_CAP_CATEGORIES = new Set([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24]);

function fmtAudShort(n) {
  if (n == null || isNaN(n)) return '—';
  return '$' + Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 });
}

function pctUsed(spent, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((Number(spent) / Number(total)) * 100));
}

function barColor(pct) {
  if (pct >= 85) return '#c0445c';
  if (pct >= 65) return '#d98b22';
  if (pct <= 20) return '#e0556e';
  return '#16b8a6';
}

/**
 * SC dashboards: budgets, agreements, and linked providers for a caseload.
 * @param {Array<{id:string, full_name?:string, preferred_name?:string, plan_end?:string}>} participants
 */
async function loadScCaseloadFinancials(participants) {
  const client = getSupabaseClient();
  if (!client) {
    return { budgetRows: [], agreementRows: [], providerRows: [], error: 'Supabase not configured' };
  }
  const ids = (participants || []).map((p) => p.id).filter(Boolean);
  if (!ids.length) {
    return { budgetRows: [], agreementRows: [], providerRows: [], error: null };
  }

  const nameOf = (p) => (p && (p.preferred_name || p.full_name)) || 'Participant';
  const initials = (s) => {
    const parts = String(s || '').trim().split(/\s+/);
    return (parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]) : String(s || '').slice(0, 2)).toUpperCase();
  };
  const tints = ['#0e5147', '#16b8a6', '#6366f1', '#d98b22', '#9333ea', '#0891b2'];

  try {
    const { data: budgets, error: bErr } = await client
      .from('claim_budget_status')
      .select('*')
      .in('participant_id', ids);
    if (bErr) throw new Error(bErr.message);

    const { data: agreements, error: aErr } = await client
      .from('service_agreements')
      .select('id, participant_id, participant_name, provider_name, period_end, status, reference')
      .in('participant_id', ids)
      .order('created_at', { ascending: false });
    if (aErr) throw new Error(aErr.message);

    const { data: links, error: lErr } = await client
      .from('provider_participant_links')
      .select('participant_id, provider_org_id, status, organisations(name, email)')
      .in('participant_id', ids)
      .eq('status', 'active');
    if (lErr) throw new Error(lErr.message);

    const budgetRows = [];
    (participants || []).forEach((p, idx) => {
      const rows = (budgets || []).filter((b) => b.participant_id === p.id);
      if (!rows.length) return;
      let coreBudget = 0;
      let coreClaimed = 0;
      let capBudget = 0;
      let capClaimed = 0;
      let planEnd = p.plan_end || null;
      rows.forEach((b) => {
        const cat = Number(b.support_category_number);
        const budget = Number(b.budget_amount) || 0;
        const claimed = Number(b.claimed_amount) || 0;
        if (!planEnd && b.plan_end) planEnd = b.plan_end;
        if (SC_CORE_CATEGORIES.has(cat)) {
          coreBudget += budget;
          coreClaimed += claimed;
        } else if (SC_CAP_CATEGORIES.has(cat)) {
          capBudget += budget;
          capClaimed += claimed;
        }
      });
      if (!coreBudget && !capBudget) return;
      const corePct = pctUsed(coreClaimed, coreBudget);
      const capPct = pctUsed(capClaimed, capBudget);
      const risk = corePct >= 85 || capPct <= 15;
      budgetRows.push({
        name: nameOf(p),
        init: initials(nameOf(p)),
        tint: tints[idx % tints.length],
        core: { spent: fmtAudShort(coreClaimed), total: fmtAudShort(coreBudget), pct: corePct, color: barColor(corePct) },
        cap: { spent: fmtAudShort(capClaimed), total: fmtAudShort(capBudget), pct: capPct, color: barColor(capPct) },
        planEnd: planEnd ? String(planEnd).slice(0, 10) : '—',
        risk,
        riskMsg: corePct >= 85 ? 'Core budget pacing high — review before plan end' : (capPct <= 15 ? 'Capacity building underspend — review utilisation' : ''),
      });
    });

    const agreementRows = (agreements || []).map((a, i) => {
      const st = String(a.status || 'draft').toLowerCase();
      const active = st === 'active' || st === 'signed';
      const pending = st.includes('await') || st === 'sent' || st === 'pending';
      return {
        name: a.provider_name || 'Provider',
        init: initials(a.provider_name || 'PR'),
        tint: tints[i % tints.length],
        participant: a.participant_name || 'Participant',
        service: a.reference || 'Service agreement',
        status: a.status || 'Draft',
        stFg: active ? '#1e7a52' : (pending ? '#b4561f' : '#5f726d'),
        stBg: active ? '#e9f6ef' : (pending ? '#fbf0df' : '#f1f4f2'),
        ends: a.period_end ? String(a.period_end).slice(0, 10) : '—',
      };
    });

    const providerMap = new Map();
    (links || []).forEach((link) => {
      const org = link.organisations || {};
      const key = link.provider_org_id || org.name;
      if (!key) return;
      if (!providerMap.has(key)) {
        providerMap.set(key, {
          name: org.name || 'Provider',
          init: initials(org.name || 'PR'),
          tint: tints[providerMap.size % tints.length],
          type: 'Service Provider',
          participants: [],
          hours: '—',
          status: 'Active',
          stFg: '#1e7a52',
          stBg: '#e9f6ef',
          agreement: 'Linked',
          contact: org.email || '—',
        });
      }
      const part = (participants || []).find((x) => x.id === link.participant_id);
      const short = part ? String(nameOf(part)).split(' ')[0] + '.' : 'Participant';
      const row = providerMap.get(key);
      if (!row.participants.includes(short)) row.participants.push(short);
    });
    const providerRows = Array.from(providerMap.values());

    return { budgetRows, agreementRows, providerRows, error: null };
  } catch (e) {
    console.warn('loadScCaseloadFinancials error:', e.message);
    return { budgetRows: [], agreementRows: [], providerRows: [], error: e.message };
  }
}

const NDIS_PRICE_REGIONS = {
  national: 'price_cap_national',
  act_nsw_qld_vic: 'price_cap_act_nsw_qld_vic',
  wa_nt_sa_tas: 'price_cap_wa_nt_sa_tas',
  remote: 'price_cap_remote',
  very_remote: 'price_cap_very_remote',
};

function ndisPriceCapForItem(item, region = 'national') {
  if (!item) return null;
  const col = NDIS_PRICE_REGIONS[region] || NDIS_PRICE_REGIONS.national;
  if (item[col] != null) return Number(item[col]);
  if (item.price_cap_national != null) return Number(item.price_cap_national);
  if (item.price_caps && item.price_caps[region] != null) return Number(item.price_caps[region]);
  return null;
}

function formatAudAmount(n) {
  if (n == null || isNaN(n)) return '—';
  return '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Active NDIS price guide version (is_active = true).
 * @returns {Promise<{version: object|null, error: string|null}>}
 */
async function loadActiveNdisPriceGuide() {
  const client = getSupabaseClient();
  if (!client) return { version: null, error: 'Supabase not configured' };
  try {
    const { data, error } = await client
      .from('ndis_price_guide_versions')
      .select('id, name, effective_from, effective_to, source, is_placeholder, is_active, notes')
      .eq('is_active', true)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { version: null, error: error.message };
    return { version: data || null, error: null };
  } catch (e) {
    return { version: null, error: e.message };
  }
}

/**
 * NDIS support catalogue items for the active (or specified) price guide.
 * @param {{ versionId?: string, search?: string, limit?: number }} [opts]
 */
async function loadNdisSupportItems(opts) {
  const o = opts || {};
  const client = getSupabaseClient();
  if (!client) return { items: [], version: null, error: 'Supabase not configured' };
  try {
    let versionId = o.versionId || null;
    let version = null;
    if (!versionId) {
      const vRes = await loadActiveNdisPriceGuide();
      if (vRes.error) return { items: [], version: null, error: vRes.error };
      version = vRes.version;
      versionId = version && version.id;
    }
    if (!versionId) return { items: [], version: null, error: 'No active price guide' };

    let query = client
      .from('ndis_support_items')
      .select('id, support_item_number, name, support_category_number, support_category_name, support_purpose, unit, gst_code, quote_required, price_cap_national, price_cap_act_nsw_qld_vic, price_cap_wa_nt_sa_tas, price_cap_remote, price_cap_very_remote, price_caps')
      .eq('version_id', versionId)
      .eq('active', true)
      .order('support_item_number', { ascending: true })
      .limit(o.limit || 500);

    if (o.search) {
      const q = String(o.search).trim();
      if (q) query = query.or('support_item_number.ilike.%' + q + '%,name.ilike.%' + q + '%');
    }

    const { data, error } = await query;
    if (error) return { items: [], version, error: error.message };
    return { items: data || [], version, error: null };
  } catch (e) {
    return { items: [], version: null, error: e.message };
  }
}

/**
 * Query participant profile (for Participant Dashboard)
 * ASYNC: When Supabase is configured, loads the requested participant by id (URL,
 * session, or explicit arg). For participant-role users with no id, returns their
 * own RLS-scoped row when exactly one is visible. Never falls back to demo data
 * when Supabase is configured — returns null instead.
 * @param {string} participantId - optional explicit participant id
 * @returns {Promise<Object|null>} participant data
 */
async function queryParticipantProfile(participantId) {
  const demoProfile = {
    id: 'demo-alex',
    full_name: 'Alex Demo',
    preferred_name: 'Alex',
    ndis_number: '4310 887 226',
    dob: '14/03/1985',
    gender: 'Not specified',
    status: 'active',
    funding_type: 'Plan-managed',
    plan_start: '01 Jul 2026',
    plan_end: '30 Jun 2027',
    email: 'alex@demo.local',
    phone: '+61 2 5555 0100'
  };

  if (!isSupabaseConfigured()) {
    return demoProfile;
  }

  const pid = resolveParticipantProfileId(participantId);

  try {
    if (pid) {
      const { participant, error } = await loadParticipantById(pid);
      if (!error && participant) return participant;
      console.warn('Participant not found or not accessible:', pid, error);
      return null;
    }

    const { participants, error } = await loadParticipantsForCurrentUser();
    if (error) {
      console.warn('Failed to load participant profile from Supabase:', error);
      return null;
    }

    // Participant self-view: RLS typically returns exactly one row.
    if (participants && participants.length === 1) return participants[0];

    // Provider/SC/AH with multiple clients must pass ?id= — do not pick arbitrarily.
    if (participants && participants.length > 1) {
      console.warn('Multiple participants visible — pass ?id= to open a specific profile');
      return null;
    }

    return null;
  } catch (e) {
    console.warn('Error loading participant profile:', e.message);
    return null;
  }
}



/**
 * Query participants assigned to the current worker (for Support Worker app)
 * ASYNC: When Supabase is configured, returns the worker's RLS-filtered
 * participants (assigned via shifts). Otherwise returns demo data.
 * @returns {Promise<Array>} participants array
 */
async function queryParticipantsForWorker() {
  const demoParticipants = [
    {
      id: 'demo-margaret',
      full_name: 'Margaret Reyes',
      preferred_name: 'Margaret',
      ndis_number: '4310 887 226',
      status: 'active',
      funding_type: 'Plan-managed'
    },
    {
      id: 'demo-tom',
      full_name: 'Tom Becker',
      preferred_name: 'Tom',
      ndis_number: '4221 553 109',
      status: 'active',
      funding_type: 'Self-managed'
    }
  ];

  if (!isSupabaseConfigured()) {
    return demoParticipants;
  }

  // Load real data from Supabase — RLS scopes results to the worker's
  // assigned participants (via shifts with status accepted/in_progress/completed).
  try {
    const { participants, error } = await loadParticipantsForCurrentUser();
    if (error) {
      console.warn('Failed to load worker participants from Supabase:', error);
      return [];
    }
    return participants || [];
  } catch (e) {
    console.warn('Error loading worker participants:', e.message);
    return [];
  }
}

/**
 * Query shifts assigned to the current worker (for Support Worker app)
 * ASYNC: When Supabase is configured, returns the worker's RLS-filtered
 * shifts. Otherwise returns demo data.
 * @returns {Promise<Array>} shifts array
 */
async function queryShiftsForWorker() {
  const demoShifts = [
    {
      id: 'demo-shift-1',
      title: 'Personal Care',
      location: 'Glenroy',
      start_time: 'Today 11:00',
      end_time: '15:00',
      status: 'accepted',
      support_type: 'Personal Care',
      participants: { full_name: 'Margaret Reyes', preferred_name: 'Margaret' }
    },
    {
      id: 'demo-shift-2',
      title: 'Community Access',
      location: 'Coburg',
      start_time: 'Fri 10:00',
      end_time: '13:00',
      status: 'offered',
      support_type: 'Community Access',
      participants: { full_name: 'Tom Becker', preferred_name: 'Tom' }
    }
  ];

  if (!isSupabaseConfigured()) {
    return demoShifts;
  }

  // Load real data from Supabase — RLS scopes results to the worker's own shifts.
  try {
    const { shifts, error } = await loadShiftsForWorker();
    if (error) {
      console.warn('Failed to load worker shifts from Supabase:', error);
      return [];
    }
    return shifts || [];
  } catch (e) {
    console.warn('Error loading worker shifts:', e.message);
    return [];
  }
}



/**
 * Get dashboard path for a user role
 * @param {string} role - user_role enum value
 * @returns {string} - file path to dashboard
 */
function getDashboardForRole(role) {
  const roleMap = {
    'provider_owner': 'CiaraLink Provider Dashboard.dc.html',
    'provider_admin': 'CiaraLink Provider Dashboard.dc.html',
    'provider_staff': 'CiaraLink Provider Dashboard.dc.html',
    'platform_admin': 'CiaraLink Provider Dashboard.dc.html',
    'support_worker': 'Support Worker.dc.html',
    'abn_worker': 'Support Worker.dc.html',
    'support_coordinator': 'Support Coordination.dc.html',
    'allied_health': 'Allied Health.dc.html',
    'allied_health_admin': 'Allied Health.dc.html',
    'participant': 'Participant Dashboard.dc.html',
    'guardian_nominee': 'Participant Dashboard.dc.html',
    // preview-mode shortcuts
    'provider': 'CiaraLink Provider Dashboard.dc.html',
    'worker': 'Support Worker.dc.html',
    'coordinator': 'Support Coordination.dc.html',
    'allied': 'Allied Health.dc.html',
    'guardian': 'Participant Dashboard.dc.html',
  };

  return roleMap[role] || 'Index.dc.html';
}

// ============================================================
// TEAM / MULTI-USER (SEATS) HELPERS
// ============================================================

/** Current session access token (JWT) for authenticating /api/team calls. */
async function getAccessToken() {
  const { data } = await getSession();
  return data?.session?.access_token || null;
}

/** POST to a /api/team/* endpoint with the caller's Bearer token. */
async function callTeamApi(path, body) {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'Not signed in' };
  try {
    const r = await fetch('/api/team/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body || {}),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: data.error || ('Request failed (' + r.status + ')'), code: data.code };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: 'Network error: ' + e.message };
  }
}

/** Orgs the current user administers, with seat usage. Returns [] if none. */
async function getMyOrgSeatUsage() {
  const client = getSupabaseClient();
  if (!client) return { orgs: [], error: 'Supabase not configured' };
  try {
    const { data, error } = await client.rpc('my_org_seat_usage');
    if (error) return { orgs: [], error: error.message };
    return { orgs: data || [], error: null };
  } catch (e) {
    return { orgs: [], error: e.message };
  }
}

/** Members of an org (RLS: admins/same-org can read). Joins profile name+email. */
async function loadOrgTeam(orgId) {
  const client = getSupabaseClient();
  if (!client) return { members: [], error: 'Supabase not configured' };
  try {
    const { data, error } = await client
      .from('organisation_members')
      .select('id, user_id, role, status, invited_at, joined_at')
      .eq('org_id', orgId)
      .order('joined_at', { ascending: true });
    if (error) return { members: [], error: error.message };
    const members = data || [];
    // Enrich with name + email from user_profiles (separate query keeps RLS simple).
    const ids = members.map(m => m.user_id);
    let profiles = {};
    if (ids.length) {
      const { data: profs } = await client
        .from('user_profiles')
        .select('user_id, full_name, email, must_change_password')
        .in('user_id', ids);
      (profs || []).forEach(p => { profiles[p.user_id] = p; });
    }
    const enriched = members.map(m => ({
      ...m,
      full_name: profiles[m.user_id]?.full_name || '—',
      email: profiles[m.user_id]?.email || '',
      must_change_password: profiles[m.user_id]?.must_change_password || false,
    }));
    return { members: enriched, error: null };
  } catch (e) {
    return { members: [], error: e.message };
  }
}

/** Admin: add a team member (creates account with a temp password). */
async function addTeamMember({ orgId, email, fullName, role, tempPassword }) {
  return callTeamApi('add-user', { orgId, email, fullName, role, tempPassword });
}

/** Admin: reset a member's password to a new temp value. */
async function resetMemberPassword({ orgId, targetUserId, newPassword }) {
  return callTeamApi('reset-password', { orgId, targetUserId, newPassword });
}

/** Link a user to a participant care team (creates account if needed). */
async function inviteCareTeamMember(input) {
  const r = await callTeamApi('invite-care-team', input);
  if (!r.ok) return r;
  const d = r.data || {};
  return { ok: true, userId: d.userId, careTeamId: d.careTeamId, created: d.created };
}

/** Admin: suspend / reactivate a member (RLS update; status drives seat use). */
async function setMemberStatus(memberId, status) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase not configured' };
  try {
    const { error } = await client
      .from('organisation_members')
      .update({ status })
      .eq('id', memberId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Admin: change a member's role (RLS update). */
async function updateMemberRole(memberId, role) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase not configured' };
  try {
    const { error } = await client
      .from('organisation_members')
      .update({ role })
      .eq('id', memberId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** The signed-in user changes their own password and clears the force-reset flag. */
async function changeOwnPassword(newPassword) {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase not configured' };
  try {
    const { data: { user }, error } = await client.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });
    if (error) return { ok: false, error: error.message };
    if (user?.id) {
      await client.from('user_profiles')
        .update({ must_change_password: false })
        .eq('user_id', user.id);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** True if the signed-in user was given a temp password and must set their own. */
async function mustChangePassword() {
  const { user } = await getCurrentUser();
  return !!(user && user.user_metadata && user.user_metadata.must_change_password);
}

// ============================================================
// EXPORTS (for module systems)
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isSupabaseConfigured,
    getSupabaseClient,
    getConnectionStatus,
    signInWithEmail,
    signOut,
    getSession,
    getCurrentUser,
    loadUserProfile,
    loadUserMemberships,
    loadCurrentUserContext,
    getDashboardForRole,
    loadParticipantsForCurrentUser,
    loadParticipantById,
    loadParticipantContacts,
    loadParticipantCareTeam,
    loadShiftsForWorker,
    queryParticipantsForWorker,
    queryShiftsForWorker,
    loadTasksForCurrentUser,
    createTask,
    updateTaskStatus,
    loadNotificationsForCurrentUser,
    markNotificationRead,
    markAllNotificationsRead,
    countUnreadNotifications,
    startNotificationPolling,
    stopNotificationPolling,
    loadReferralsForCurrentUser,
    createReferral,
    loadMessageThreadsForCurrentUser,
    loadThreadMessages,
    sendMessage,
    createMessageThread,
    loadDocumentsForCurrentUser,
    createDocumentRecord,
    getMyOrgSeatUsage,
    loadOrgTeam,
    addTeamMember,
    resetMemberPassword,
    inviteCareTeamMember,
    setMemberStatus,
    updateMemberRole,
    changeOwnPassword,
    mustChangePassword,
  };
}

// SUBSCRIPTIONS (RLS: subscriptions.user_id = auth.uid() — users read only their own row).
// Returns the signed-in user's latest subscription and whether it grants access.
// Use `active` to gate paid features honestly against real Stripe state.
async function loadCurrentSubscription() {
  const client = getSupabaseClient();
  if (!client) return { ok: false, subscription: null, active: false, reason: 'not-configured' };
  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('plan,status,price_id,current_period_end,stripe_subscription_id,stripe_customer_id,cancel_at_period_end,updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) return { ok: false, subscription: null, active: false, reason: error.message };
    const sub = (data && data[0]) || null;
    const ACTIVE = ['active', 'trialing', 'past_due'];
    return { ok: true, subscription: sub, active: !!sub && ACTIVE.includes(sub.status) };
  } catch (e) {
    return { ok: false, subscription: null, active: false, reason: e.message };
  }
}

// Platform SaaS plans (Stripe-linked). NDIS claim caps are separate (ndis_support_items).
async function loadPlatformSubscriptionPlans(opts) {
  const client = getSupabaseClient();
  const category = opts && opts.category;
  // Public pricing page: use server endpoint when not signed in (RLS requires auth on direct table read).
  if (!client || !(await getSession())) {
    try {
      const r = await fetch('/api/public-subscription-plans');
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.ok && Array.isArray(data.plans)) {
        const plans = category ? data.plans.filter((p) => p.category === category) : data.plans;
        return { ok: true, plans };
      }
    } catch { /* fall through */ }
    if (!client) return { ok: false, plans: [], reason: 'not-configured' };
  }
  if (!client) return { ok: false, plans: [], reason: 'not-configured' };
  try {
    let q = client
      .from('platform_subscription_plans')
      .select('slug,name,category,per_unit,display_monthly_aud,display_annual_aud,stripe_price_month_id,stripe_price_year_id,notes')
      .eq('active', true)
      .order('sort_order');
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) return { ok: false, plans: [], reason: error.message };
    return { ok: true, plans: data || [] };
  } catch (e) {
    return { ok: false, plans: [], reason: e.message };
  }
}

function shortPlanDisplayName(name, slug) {
  if (name && String(name).includes('·')) {
    return String(name).split('·').pop().trim();
  }
  if (slug) {
    const parts = String(slug).split('_');
    const last = parts[parts.length - 1];
    return last.charAt(0).toUpperCase() + last.slice(1);
  }
  return name || slug || '';
}

function numAud(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Map platform_subscription_plans rows → price overlays + add-on lists for pricing UI. */
function buildPricingCatalogFromPlans(plans) {
  const subscriptionCategories = ['providers', 'support_workers', 'coordination', 'allied_health'];
  const prices = {};
  const addonPrices = {};
  const extraAddons = [];

  (plans || []).forEach((p) => {
    const m = numAud(p.display_monthly_aud);
    const y = numAud(p.display_annual_aud);
    const entry = {
      key: p.slug,
      name: shortPlanDisplayName(p.name, p.slug),
      m,
      y,
      perUnit: !!p.per_unit,
      notes: p.notes || null,
    };

    if (p.category === 'addon_referrals') {
      addonPrices[p.slug] = entry;
    } else if (/_addon$/.test(p.category) || p.per_unit) {
      extraAddons.push({
        ...entry,
        group: p.category.replace(/_addon$/, ''),
        monthlyOnly: y == null,
      });
    } else if (subscriptionCategories.includes(p.category)) {
      prices[p.slug] = entry;
    }
  });

  extraAddons.sort((a, b) => (a.key < b.key ? -1 : 1));
  return { prices, addonPrices, extraAddons };
}

/** Merge DB plan prices into hardcoded CATS/ADDONS templates (UI metadata stays in HTML). */
function mergePricingCatalogFromPlans(baseCats, baseAddons, plans) {
  const built = buildPricingCatalogFromPlans(plans);
  const cats = {};

  Object.keys(baseCats || {}).forEach((catKey) => {
    const src = baseCats[catKey];
    cats[catKey] = {
      ...src,
      tiers: (src.tiers || []).map((t) => {
        if (!t.key || !built.prices[t.key]) return { ...t };
        const p = built.prices[t.key];
        const merged = { ...t };
        if (p.m != null) merged.m = p.m;
        if (p.y != null) merged.y = p.y;
        return merged;
      }),
    };
  });

  const addons = (baseAddons || []).map((a) => {
    const p = built.addonPrices[a.key];
    if (!p) return { ...a };
    const merged = { ...a };
    if (p.m != null) merged.m = p.m;
    if (p.y != null) merged.y = p.y;
    return merged;
  });

  return { cats, addons, extraAddons: built.extraAddons };
}

async function resolvePlatformPlanLabel(priceId) {
  if (!priceId) return null;
  const res = await loadPlatformSubscriptionPlans();
  if (!res.ok) return null;
  const match = (res.plans || []).find(
    (p) => p.stripe_price_month_id === priceId || p.stripe_price_year_id === priceId
  );
  return match ? match.name : null;
}

async function resolvePlatformPlanDisplay(priceId) {
  if (!priceId) return null;
  const res = await loadPlatformSubscriptionPlans();
  if (!res.ok) return null;
  const match = (res.plans || []).find(
    (p) => p.stripe_price_month_id === priceId || p.stripe_price_year_id === priceId
  );
  if (!match) return null;
  const isAnnual = match.stripe_price_year_id === priceId;
  const amount = numAud(isAnnual ? match.display_annual_aud : match.display_monthly_aud);
  return {
    name: match.name,
    interval: isAnnual ? 'year' : 'month',
    amount,
  };
}

// Make available globally
window.CIARALINK_SUPABASE_CONFIGURED = isSupabaseConfigured();
window.CiaraLinkAuth = {
  isSupabaseConfigured,
  getSupabaseClient,
  getConnectionStatus,
  signInWithEmail,
  signOut,
  getSession,
  getCurrentUser,
  loadUserProfile,
  loadUserMemberships,
  loadCurrentUserContext,
  getDashboardForRole,
  loadParticipantsForCurrentUser,
  loadParticipantById,
  loadParticipantContacts,
  loadParticipantCareTeam,
  loadShiftsForWorker,
  queryParticipantsForWorker,
  queryShiftsForWorker,
  loadTasksForCurrentUser,
  createTask,
  updateTaskStatus,
  loadNotificationsForCurrentUser,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
  startNotificationPolling,
  stopNotificationPolling,
  loadReferralsForCurrentUser,
  createReferral,
  loadMessageThreadsForCurrentUser,
  loadThreadMessages,
  sendMessage,
  createMessageThread,
  loadDocumentsForCurrentUser,
  createDocumentRecord,
  getMyOrgSeatUsage,
  loadOrgTeam,
  addTeamMember,
  resetMemberPassword,
  inviteCareTeamMember,
  setMemberStatus,
  updateMemberRole,
  changeOwnPassword,
  mustChangePassword,
  loadCurrentSubscription,
  loadPlatformSubscriptionPlans,
  buildPricingCatalogFromPlans,
  mergePricingCatalogFromPlans,
  resolvePlatformPlanLabel,
  resolvePlatformPlanDisplay,
};

// Global query helpers for dashboards
window.queryParticipantsByProvider = queryParticipantsByProvider;
window.queryParticipantsByCoordinator = queryParticipantsByCoordinator;
window.queryParticipantsByAlliedHealth = queryParticipantsByAlliedHealth;
window.queryParticipantProfile = queryParticipantProfile;
window.queryParticipantsForWorker = queryParticipantsForWorker;
window.queryShiftsForWorker = queryShiftsForWorker;
window.getParticipantIdFromUrl = getParticipantIdFromUrl;
window.getParticipantViewFromUrl = getParticipantViewFromUrl;
window.participantProfileUrl = participantProfileUrl;
window.normRoleBucket = normRoleBucket;
window.pageRoleBucketForFile = pageRoleBucketForFile;
window.isPathAllowedForRole = isPathAllowedForRole;
window.resolveNotificationHref = resolveNotificationHref;
window.resolveParticipantProfileId = resolveParticipantProfileId;
window.rememberSelectedParticipantId = rememberSelectedParticipantId;
window.navigateToParticipantProfile = navigateToParticipantProfile;
window.listParticipantPlanBudgets = listParticipantPlanBudgets;
window.loadScCaseloadFinancials = loadScCaseloadFinancials;
window.loadActiveNdisPriceGuide = loadActiveNdisPriceGuide;
window.loadNdisSupportItems = loadNdisSupportItems;
window.ndisPriceCapForItem = ndisPriceCapForItem;
window.formatAudAmount = formatAudAmount;

// Expose public functions to window
window.getSupabaseClient = getSupabaseClient;
window.isSupabaseConfigured = isSupabaseConfigured;
window.getConnectionStatus = getConnectionStatus;
window.signInWithEmail = signInWithEmail;
window.signOut = signOut;
window.getSession = getSession;
window.getCurrentUser = getCurrentUser;
window.loadUserProfile = loadUserProfile;
window.updateMyProfile = updateMyProfile;
window.loadUserMemberships = loadUserMemberships;
window.loadCurrentUserContext = loadCurrentUserContext;
window.getDashboardForRole = getDashboardForRole;
window.queryParticipantsByProvider = queryParticipantsByProvider;
window.queryParticipantsByCoordinator = queryParticipantsByCoordinator;
window.queryParticipantsByAlliedHealth = queryParticipantsByAlliedHealth;
window.queryParticipantProfile = queryParticipantProfile;
window.queryParticipantsForWorker = queryParticipantsForWorker;
window.queryShiftsForWorker = queryShiftsForWorker;
window.getParticipantIdFromUrl = getParticipantIdFromUrl;
window.getParticipantViewFromUrl = getParticipantViewFromUrl;
window.participantProfileUrl = participantProfileUrl;
window.normRoleBucket = normRoleBucket;
window.pageRoleBucketForFile = pageRoleBucketForFile;
window.isPathAllowedForRole = isPathAllowedForRole;
window.resolveNotificationHref = resolveNotificationHref;
window.resolveParticipantProfileId = resolveParticipantProfileId;
window.rememberSelectedParticipantId = rememberSelectedParticipantId;
window.navigateToParticipantProfile = navigateToParticipantProfile;
window.listParticipantPlanBudgets = listParticipantPlanBudgets;
window.loadScCaseloadFinancials = loadScCaseloadFinancials;
window.loadActiveNdisPriceGuide = loadActiveNdisPriceGuide;
window.loadNdisSupportItems = loadNdisSupportItems;
window.ndisPriceCapForItem = ndisPriceCapForItem;
window.formatAudAmount = formatAudAmount;
window.loadParticipantsForCurrentUser = loadParticipantsForCurrentUser;
window.loadParticipantById = loadParticipantById;
window.loadParticipantContacts = loadParticipantContacts;
window.loadParticipantCareTeam = loadParticipantCareTeam;
window.loadShiftsForWorker = loadShiftsForWorker;

// Worker daily workflow: clock in/out + shift notes
window.clockInShift = clockInShift;
window.clockOutShift = clockOutShift;
window.createShiftNote = createShiftNote;
window.loadShiftNotes = loadShiftNotes;

// Tasks / Notifications / Referrals / Messaging / Documents (create + read)
window.loadTasksForCurrentUser = loadTasksForCurrentUser;
window.createTask = createTask;
window.updateTaskStatus = updateTaskStatus;
window.loadNotificationsForCurrentUser = loadNotificationsForCurrentUser;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.countUnreadNotifications = countUnreadNotifications;
window.startNotificationPolling = startNotificationPolling;
window.stopNotificationPolling = stopNotificationPolling;
window.loadReferralsForCurrentUser = loadReferralsForCurrentUser;
window.createReferral = createReferral;
window.loadProviderOrgForParticipant = loadProviderOrgForParticipant;
window.updateReferralStatus = updateReferralStatus;
window.sendHandoffToCoordinator = sendHandoffToCoordinator;
window.loadMessageThreadsForCurrentUser = loadMessageThreadsForCurrentUser;
window.loadThreadMessages = loadThreadMessages;
window.sendMessage = sendMessage;
window.createMessageThread = createMessageThread;
window.loadDocumentsForCurrentUser = loadDocumentsForCurrentUser;
window.createDocumentRecord = createDocumentRecord;


  // ============================================================
  // WORKFLOW HELPERS (provider add-client; allied/coord notes; coord task)
  // ============================================================
  async function createParticipant(input) {
    const client = getSupabaseClient();
    if (!client) return { participant: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { participant: null, error: 'No user logged in' };
      if (!input || !input.org_id || !input.full_name) return { participant: null, error: 'org_id and full_name are required' };
      const row = {
        org_id: input.org_id, full_name: input.full_name, created_by: user.id,
        preferred_name: input.preferred_name || null, ndis_number: input.ndis_number || null,
        dob: input.dob || null, gender: input.gender || null, address: input.address || null,
        phone: input.phone || null, email: input.email || null, funding_type: input.funding_type || null,
        plan_start: input.plan_start || null, plan_end: input.plan_end || null, status: input.status || 'active'
      };
      const { data, error } = await client.from('participants').insert(row).select().single();
      if (error) return { participant: null, error: error.message };
      try {
        await client.from('provider_participant_links').insert({ provider_org_id: input.org_id, participant_id: data.id, linked_by: user.id });
      } catch (e) { console.warn('participant link insert failed:', e && e.message); }
      return { participant: data, error: null };
    } catch (e) { return { participant: null, error: e.message }; }
  }
  async function listMyParticipants() { return loadParticipantsForCurrentUser(); }
  async function createSessionNote(input) {
    const client = getSupabaseClient();
    if (!client) return { note: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { note: null, error: 'No user logged in' };
      if (!input || !input.org_id || !input.participant_id || !input.body) return { note: null, error: 'org_id, participant_id and body are required' };
      const row = { author_id: user.id, org_id: input.org_id, participant_id: input.participant_id, author_role: input.author_role || null, note_type: input.note_type || 'progress_note', body: input.body };
      const { data, error } = await client.from('participant_notes').insert(row).select().single();
      if (error) return { note: null, error: error.message };
      return { note: data, error: null };
    } catch (e) { return { note: null, error: e.message }; }
  }
  async function createCoordinationNote(input) { return createSessionNote(Object.assign({}, input, { note_type: (input && input.note_type) || 'coordination_note' })); }
  async function listParticipantNotes(participantId) {
    const client = getSupabaseClient();
    if (!client) return { notes: [], error: 'Supabase not configured' };
    try {
      let query = client.from('participant_notes')
        .select('id, org_id, participant_id, author_id, author_role, note_type, body, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(participantId ? 100 : 300);
      if (participantId) query = query.eq('participant_id', participantId);
      const { data, error } = await query;
      if (error) return { notes: [], error: error.message };
      return { notes: data || [], error: null };
    } catch (e) { return { notes: [], error: e.message }; }
  }
  async function createCoordinationTask(input) { return createTask(Object.assign({}, input, { type: (input && input.type) || 'coordination' })); }

  // Update an existing participant record (RLS decides who may write: the
  // participant themselves via account_user_id, or their provider/coordinator).
  async function updateParticipant(participantId, patch) {
    const client = getSupabaseClient();
    if (!client) return { participant: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { participant: null, error: 'No user logged in' };
      if (!participantId) return { participant: null, error: 'participantId is required' };
      const allowed = ['full_name','preferred_name','ndis_number','dob','gender','address','phone','email','funding_type','plan_start','plan_end','status'];
      const row = {};
      Object.keys(patch || {}).forEach(k => { if (allowed.indexOf(k) !== -1 && patch[k] !== undefined) row[k] = patch[k]; });
      if (!Object.keys(row).length) return { participant: null, error: 'Nothing to update' };
      row.updated_at = new Date().toISOString();
      const { data, error } = await client.from('participants').update(row).eq('id', participantId).select().single();
      if (error) return { participant: null, error: error.message };
      return { participant: data, error: null };
    } catch (e) { return { participant: null, error: e.message }; }
  }

  // Participant goals & outcomes (participant_goals table).
  async function listParticipantGoals(participantId) {
    const client = getSupabaseClient();
    if (!client) return { goals: [], error: 'Supabase not configured' };
    try {
      if (!participantId) return { goals: [], error: 'participantId is required' };
      const { data, error } = await client.from('participant_goals')
        .select('id, org_id, participant_id, created_by, title, description, category, status, progress_pct, linked_support, created_at, updated_at')
        .eq('participant_id', participantId).order('created_at', { ascending: false }).limit(100);
      if (error) return { goals: [], error: error.message };
      return { goals: data || [], error: null };
    } catch (e) { return { goals: [], error: e.message }; }
  }
  async function createParticipantGoal(input) {
    const client = getSupabaseClient();
    if (!client) return { goal: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { goal: null, error: 'No user logged in' };
      if (!input || !input.participant_id || !input.title) return { goal: null, error: 'participant_id and title are required' };
      const row = {
        participant_id: input.participant_id,
        org_id: input.org_id || null,
        created_by: user.id,
        title: input.title,
        description: input.description || null,
        category: input.category || 'core',
        status: input.status || 'in_progress',
        progress_pct: typeof input.progress_pct === 'number' ? input.progress_pct : 0,
        linked_support: input.linked_support || null
      };
      const { data, error } = await client.from('participant_goals').insert(row).select().single();
      if (error) return { goal: null, error: error.message };
      return { goal: data, error: null };
    } catch (e) { return { goal: null, error: e.message }; }
  }
  async function updateParticipantGoal(goalId, patch) {
    const client = getSupabaseClient();
    if (!client) return { goal: null, error: 'Supabase not configured' };
    try {
      if (!goalId) return { goal: null, error: 'goalId is required' };
      const allowed = ['title','description','category','status','progress_pct','linked_support'];
      const row = {};
      Object.keys(patch || {}).forEach(k => { if (allowed.indexOf(k) !== -1 && patch[k] !== undefined) row[k] = patch[k]; });
      if (!Object.keys(row).length) return { goal: null, error: 'Nothing to update' };
      const { data, error } = await client.from('participant_goals').update(row).eq('id', goalId).select().single();
      if (error) return { goal: null, error: error.message };
      return { goal: data, error: null };
    } catch (e) { return { goal: null, error: e.message }; }
  }

  window.createParticipant = createParticipant;
  window.listMyParticipants = listMyParticipants;
  window.createSessionNote = createSessionNote;
  window.createCoordinationNote = createCoordinationNote;
  window.listParticipantNotes = listParticipantNotes;
  window.createCoordinationTask = createCoordinationTask;
  window.updateParticipant = updateParticipant;
  window.listParticipantGoals = listParticipantGoals;
  window.createParticipantGoal = createParticipantGoal;
  window.updateParticipantGoal = updateParticipantGoal;

  // INDEPENDENT WORKER self-rostering: create a shift for the signed-in worker.
  async function createWorkerShift(input) {
    const client = getSupabaseClient();
    if (!client) return { shift: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { shift: null, error: 'No user logged in' };
      if (!input || !input.participant_id || !input.start_time || !input.end_time) {
        return { shift: null, error: 'participant_id, start_time and end_time are required' };
      }
      let orgId = input.org_id || null;
      if (!orgId) {
        const { memberships } = await loadUserMemberships(user.id);
        const wm = (memberships || []).find((m) => m.role === 'support_worker' || m.role === 'abn_worker') || (memberships || [])[0];
        orgId = wm ? wm.org_id : null;
      }
      if (!orgId) return { shift: null, error: 'No organisation found for worker' };
      const row = {
        org_id: orgId, participant_id: input.participant_id, worker_id: user.id, created_by: user.id,
        start_time: input.start_time, end_time: input.end_time,
        support_type: input.service_type || null, notes: input.notes || null,
        title: input.title || input.service_type || null, location: input.location || null,
        status: input.status || 'accepted'
      };
      const { data, error } = await client.from('shifts').insert(row).select().single();
      if (error) return { shift: null, error: error.message };
      return { shift: data, error: null };
    } catch (e) { return { shift: null, error: e.message }; }
  }
  window.createWorkerShift = createWorkerShift;

  // WORKER "save shift for later" — bookmark a shift to a private shortlist.
  // shift_id is optional: when the Find card carries a real shifts.id it is
  // stored (and de-duped) against it; otherwise the snapshot labels are kept so
  // the saved card still renders. Worker-owned via RLS (saved_shifts_*).
  async function saveShiftForWorker(input) {
    const client = getSupabaseClient();
    if (!client) return { saved: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { saved: null, error: 'No user logged in' };
      input = input || {};
      const row = {
        worker_id: user.id,
        org_id: input.org_id || null,
        shift_id: input.shift_id || null,
        client_label: input.client_label || null,
        service_label: input.service_label || null,
        when_label: input.when_label || null,
        location_label: input.location_label || null,
        pay_label: input.pay_label || null
      };
      const { data, error } = await client.from('saved_shifts').insert(row).select().single();
      if (error) return { saved: null, error: error.message };
      return { saved: data, error: null };
    } catch (e) { return { saved: null, error: e.message }; }
  }
  async function loadSavedShifts() {
    const client = getSupabaseClient();
    if (!client) return { saved: [], error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { saved: [], error: 'No user logged in' };
      const { data, error } = await client.from('saved_shifts')
        .select('*').eq('worker_id', user.id).order('created_at', { ascending: false });
      if (error) return { saved: [], error: error.message };
      return { saved: data || [], error: null };
    } catch (e) { return { saved: [], error: e.message }; }
  }
  async function unsaveShift(savedId) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not configured' };
    try {
      if (!savedId) return { error: 'savedId is required' };
      const { error } = await client.from('saved_shifts').delete().eq('id', savedId);
      if (error) return { error: error.message };
      return { error: null };
    } catch (e) { return { error: e.message }; }
  }
  window.saveShiftForWorker = saveShiftForWorker;
  window.loadSavedShifts = loadSavedShifts;
  window.unsaveShift = unsaveShift;

  // AI File Drop — real upload: Storage object + documents row (org-scoped).
  async function uploadDocument(args) {
    args = args || {};
    const file = args.file;
    const client = getSupabaseClient();
    if (!client) return { document: null, error: 'Supabase not configured' };
    if (!file) return { document: null, error: 'No file provided' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { document: null, error: 'No user logged in' };
      let orgId = args.org_id || null;
      if (!orgId) { const ctx = await loadCurrentUserContext(); orgId = ctx && ctx.organisationId ? ctx.organisationId : null; }
      if (!orgId) return { document: null, error: 'No organisation found for current user' };
      const BUCKET = 'participant-documents';
      const safeName = String(file.name || 'file').replace(/[^\w.\-]+/g, '_');
      const seg = args.participant_id || 'general';
      const path = orgId + '/' + seg + '/' + Date.now() + '_' + safeName;
      const { error: upErr } = await client.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
      if (upErr) return { document: null, error: 'Upload failed: ' + upErr.message };
      const { document, error: recErr } = await createDocumentRecord({
        org_id: orgId, participant_id: args.participant_id || undefined,
        title: args.title || file.name || safeName, description: args.description || undefined,
        type: args.doc_type || 'other', storage_path: path, storage_bucket: BUCKET,
        size_bytes: file.size || undefined, mime_type: file.type || undefined
      });
      if (recErr) { try { await client.storage.from(BUCKET).remove([path]); } catch (e) {} return { document: null, error: 'Saved file but failed to record: ' + recErr }; }
      return { document: document, error: null };
    } catch (e) { return { document: null, error: e.message }; }
  }
  async function getDocumentSignedUrl(storagePath, bucket, expiresIn) {
    const client = getSupabaseClient();
    if (!client) return { url: null, error: 'Supabase not configured' };
    try {
      const { data, error } = await client.storage.from(bucket || 'participant-documents').createSignedUrl(storagePath, expiresIn || 300);
      if (error) return { url: null, error: error.message };
      return { url: (data && data.signedUrl) || null, error: null };
    } catch (e) { return { url: null, error: e.message }; }
  }
  window.uploadDocument = uploadDocument;
  window.getDocumentSignedUrl = getDocumentSignedUrl;

  // ============================================================
  // CLINICAL RECOMMENDATIONS (Allied Health)
  // Requires migration 20260628222605_clinical_recommendations.sql
  // RLS: clinical_recs_author_insert — author_id = auth.uid(), org-scoped,
  // care-team / org-linked to the participant.
  // ============================================================
  async function createRecommendation(input) {
    input = input || {};
    const client = getSupabaseClient();
    if (!client) return { recommendation: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { recommendation: null, error: 'No user logged in' };
      if (!input.org_id || !input.participant_id || !input.recommendation) {
        return { recommendation: null, error: 'org_id, participant_id and recommendation are required' };
      }
      const row = {
        org_id: input.org_id,
        participant_id: input.participant_id,
        author_id: user.id,
        author_role: input.author_role || 'allied_health',
        category: input.category || 'intervention',
        recommendation: input.recommendation,
        status: input.status || 'submitted',
      };
      const { data, error } = await client
        .from('clinical_recommendations')
        .insert(row)
        .select()
        .single();
      if (error) return { recommendation: null, error: error.message };
      return { recommendation: data, error: null };
    } catch (e) {
      console.error('createRecommendation error:', e.message);
      return { recommendation: null, error: e.message };
    }
  }
  async function loadRecommendationsForCurrentUser() {
    const client = getSupabaseClient();
    if (!client) return { recommendations: [], error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { recommendations: [], error: 'No user logged in' };
      const { data, error } = await client
        .from('clinical_recommendations')
        .select('id, org_id, participant_id, author_id, author_role, category, recommendation, status, created_at, participants ( full_name, preferred_name )')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return { recommendations: [], error: error.message };
      return { recommendations: data || [], error: null };
    } catch (e) {
      console.error('loadRecommendationsForCurrentUser error:', e.message);
      return { recommendations: [], error: e.message };
    }
  }
  window.createRecommendation = createRecommendation;
  window.loadRecommendationsForCurrentUser = loadRecommendationsForCurrentUser;
  window.loadClinicalRecommendations = loadRecommendationsForCurrentUser;

  const ALLIED_EVIDENCE_TYPES = ['allied_health_report', 'functional_capacity_assessment', 'progress_report', 'assessment', 'support_plan'];
  const EVIDENCE_CHECKLIST = [
    { key: 'allied', label: 'Allied health report', test: (ctx) => ctx.alliedDocs.length > 0 || ctx.recs.length > 0 },
    { key: 'shifts', label: 'Worker shift notes', test: (ctx) => ctx.shiftNotes.length > 0 },
    { key: 'sc', label: 'SC summary', test: (ctx) => ctx.scNotes.length > 0 },
    { key: 'plan', label: 'NDIS plan on file', test: (ctx) => ctx.docs.some(d => String(d.type) === 'ndis_plan') },
    { key: 'agreement', label: 'Service agreement', test: (ctx) => ctx.docs.some(d => String(d.type) === 'service_agreement') },
    { key: 'consent', label: 'Consent form', test: (ctx) => ctx.docs.some(d => String(d.type) === 'consent_form') },
  ];

  function buildEvidenceChecklist(ctx) {
    const ready = [];
    const missing = [];
    EVIDENCE_CHECKLIST.forEach(item => {
      if (item.test(ctx)) {
        if (item.key === 'allied' && ctx.recs.length) ready.push('Clinical recommendations (' + ctx.recs.length + ')');
        else if (item.key === 'allied') ready.push(ctx.alliedDocs.length + ' allied health report(s)');
        else if (item.key === 'shifts') ready.push(ctx.shiftNotes.length + ' shift note(s)');
        else if (item.key === 'sc') ready.push('SC summary (' + ctx.scNotes.length + ' note(s))');
        else ready.push(item.label);
      } else missing.push(item.label);
    });
    const total = EVIDENCE_CHECKLIST.length;
    const readinessPct = total ? Math.round((ready.length / total) * 100) : 0;
    return { ready, missing, readinessPct };
  }

  /** Load documents, notes, shift notes, recommendations, goals and budgets for plan review prep. */
  async function loadReviewEvidencePack(participantId) {
    if (!participantId) return { pack: null, error: 'participantId is required' };
    try {
      const [docsRes, notesRes, shiftRes, recsRes, goalsRes, budgetsRes] = await Promise.all([
        loadDocumentsForCurrentUser(),
        listParticipantNotes(participantId),
        loadShiftNotes({ participantId, limit: 100 }),
        loadRecommendationsForCurrentUser(),
        listParticipantGoals(participantId),
        listParticipantPlanBudgets(participantId),
      ]);
      const docs = ((docsRes && docsRes.documents) || []).filter(d => d.participant_id === participantId);
      const notes = (notesRes && notesRes.notes) || [];
      const shiftNotes = (shiftRes && shiftRes.notes) || [];
      const recs = ((recsRes && recsRes.recommendations) || []).filter(r => r.participant_id === participantId);
      const goals = (goalsRes && goalsRes.goals) || [];
      const budgets = (budgetsRes && budgetsRes.budgets) || [];
      const alliedDocs = docs.filter(d => ALLIED_EVIDENCE_TYPES.indexOf(String(d.type || '').toLowerCase()) > -1);
      const scNotes = notes.filter(n => String(n.note_type || '').indexOf('coord') > -1 || n.author_role === 'support_coordinator');
      const ctx = { docs, notes, shiftNotes, recs, goals, budgets, alliedDocs, scNotes };
      const { ready, missing, readinessPct } = buildEvidenceChecklist(ctx);
      return { pack: Object.assign({ docs, notes, shiftNotes, recs, goals, budgets, alliedDocs, scNotes, ready, missing, readinessPct }, ctx), error: null };
    } catch (e) {
      return { pack: null, error: e.message };
    }
  }

  async function linkCareTeamMember(input) {
    const client = getSupabaseClient();
    if (!client) return { link: null, error: 'Supabase not configured' };
    const row = {
      participant_id: input.participantId,
      user_id: input.userId,
      role: input.role,
      org_id: input.orgId || null,
      status: 'active',
      consent_given: input.consentGiven === true,
      consent_date: input.consentGiven === true ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    try {
      const { data, error } = await client
        .from('care_team_relationships')
        .upsert(row, { onConflict: 'participant_id,user_id' })
        .select()
        .single();
      if (error) return { link: null, error: error.message };
      return { link: data, error: null };
    } catch (e) {
      return { link: null, error: e.message };
    }
  }

  window.loadReviewEvidencePack = loadReviewEvidencePack;
  window.inviteCareTeamMember = inviteCareTeamMember;
  window.linkCareTeamMember = linkCareTeamMember;

  // ============================================================
  // PARTICIPANT SELF-SIGNUP (own record + NDIS plan)
  // Requires migration 20260628150000_participant_self_signup.sql
  // (participants.account_user_id, self select/update RLS, RPC
  //  create_self_participant, participant storage-upload policy).
  // ============================================================

  // Create (or update) the signed-in participant's own participant record in
  // their participant_account org, via the SECURITY DEFINER RPC. Idempotent.
  async function createSelfParticipant(input) {
    input = input || {};
    const client = getSupabaseClient();
    if (!client) return { participant: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { participant: null, error: 'No user logged in' };
      const clean = (v) => { const s = (v == null ? '' : String(v)).trim(); return s || null; };
      const { data, error } = await client.rpc('create_self_participant', {
        p_full_name: clean(input.full_name),
        p_ndis_number: clean(input.ndis_number),
        p_dob: clean(input.dob),
        p_gender: clean(input.gender),
        p_address: clean(input.address),
        p_phone: clean(input.phone),
        p_email: clean(input.email),
        p_funding_type: clean(input.funding_type),
        p_plan_start: clean(input.plan_start),
        p_plan_end: clean(input.plan_end),
        p_plan_manager: clean(input.plan_manager),
      });
      if (error) return { participant: null, error: error.message };
      return { participant: data, error: null };
    } catch (e) {
      console.error('createSelfParticipant error:', e.message);
      return { participant: null, error: e.message };
    }
  }

  // Load the signed-in participant's own record (RLS: participants_self_account_select).
  async function loadMyParticipantRecord() {
    const client = getSupabaseClient();
    if (!client) return { participant: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { participant: null, error: 'No user logged in' };
      const { data, error } = await client
        .from('participants')
        .select('*')
        .eq('account_user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) return { participant: null, error: error.message };
      return { participant: data || null, error: null };
    } catch (e) {
      console.error('loadMyParticipantRecord error:', e.message);
      return { participant: null, error: e.message };
    }
  }

  // Upload the participant's own NDIS plan document. Storage path MUST start with
  // the user's uid folder to satisfy the "participant_docs_self_upload" policy.
  async function uploadSelfPlanDocument(args) {
    args = args || {};
    const file = args.file;
    const client = getSupabaseClient();
    if (!client) return { document: null, error: 'Supabase not configured' };
    if (!file) return { document: null, error: 'No file provided' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { document: null, error: 'No user logged in' };
      let orgId = args.org_id || null;
      if (!orgId) { const ctx = await loadCurrentUserContext(); orgId = ctx && ctx.organisationId ? ctx.organisationId : null; }
      if (!orgId) return { document: null, error: 'No organisation found for current user' };
      const BUCKET = 'participant-documents';
      const safeName = String(file.name || 'ndis-plan').replace(/[^\w.\-]+/g, '_');
      const path = user.id + '/' + Date.now() + '_' + safeName; // first folder = uid (RLS)
      const { error: upErr } = await client.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
      if (upErr) return { document: null, error: 'Upload failed: ' + upErr.message };
      const { document, error: recErr } = await createDocumentRecord({
        org_id: orgId, participant_id: args.participant_id || undefined,
        title: args.title || 'NDIS Plan', type: 'ndis_plan',
        storage_path: path, storage_bucket: BUCKET,
        size_bytes: file.size || undefined, mime_type: file.type || undefined
      });
      if (recErr) { try { await client.storage.from(BUCKET).remove([path]); } catch (e) {} return { document: null, error: 'Saved file but failed to record: ' + recErr }; }
      return { document: document, error: null };
    } catch (e) {
      console.error('uploadSelfPlanDocument error:', e.message);
      return { document: null, error: e.message };
    }
  }

  window.createSelfParticipant = createSelfParticipant;
  window.loadMyParticipantRecord = loadMyParticipantRecord;
  window.uploadSelfPlanDocument = uploadSelfPlanDocument;

  // Rename the signed-in user's own organisation (their auto-created workspace).
  // RLS "org_owner_can_update_own_org" permits this for owner-type roles; if the
  // user's role can't update, it fails silently and the default name stays.
  async function setOwnOrgName(name) {
    var client = getSupabaseClient();
    if (!client) return { error: 'Supabase not configured' };
    try {
      var nm = (name == null ? '' : String(name)).trim();
      if (!nm) return { error: null };
      var ctx = await loadCurrentUserContext();
      var orgId = ctx && ctx.organisationId;
      if (!orgId) return { error: 'No organisation found' };
      var res = await client.from('organisations').update({ name: nm }).eq('id', orgId);
      return { error: res.error ? res.error.message : null };
    } catch (e) {
      console.error('setOwnOrgName error:', e.message);
      return { error: e.message };
    }
  }
  window.setOwnOrgName = setOwnOrgName;

  // PROVIDER SHIFT MANAGEMENT (Roster / Calendar) — backed by existing shifts_provider_org RLS.
  async function createOrgShift(input) {
    const client = getSupabaseClient();
    if (!client) return { shift: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { shift: null, error: 'No user logged in' };
      if (!input || !input.participant_id || !input.start_time || !input.end_time) {
        return { shift: null, error: 'participant_id, start_time and end_time are required' };
      }
      let orgId = input.org_id || null;
      if (!orgId) {
        const { memberships } = await loadUserMemberships(user.id);
        const pm = (memberships || []).find((m) => ['provider_owner','provider_admin','provider_staff'].includes(m.role)) || (memberships || [])[0];
        orgId = pm ? pm.org_id : null;
      }
      if (!orgId) return { shift: null, error: 'No organisation found for current user' };
      const status = input.status || (input.worker_id ? 'accepted' : 'offered');
      const row = {
        org_id: orgId, participant_id: input.participant_id, worker_id: input.worker_id || null,
        created_by: user.id, start_time: input.start_time, end_time: input.end_time,
        break_minutes: input.break_minutes != null ? input.break_minutes : 0,
        support_type: input.support_type || null, title: input.title || input.support_type || null,
        location: input.location || null, notes: input.notes || null, status: status
      };
      const { data, error } = await client.from('shifts').insert(row).select().single();
      if (error) return { shift: null, error: error.message };
      return { shift: data, error: null };
    } catch (e) { return { shift: null, error: e.message }; }
  }
  async function loadOrgShifts(range) {
    const client = getSupabaseClient();
    if (!client) return { shifts: [], error: 'Supabase not configured' };
    range = range || {};
    try {
      let q = client.from('shifts').select('id, org_id, participant_id, worker_id, title, location, start_time, end_time, break_minutes, status, support_type, notes, checked_in_at, checked_out_at, created_by, participants ( full_name, preferred_name )').order('start_time', { ascending: true }).limit(500);
      if (range.from) q = q.gte('start_time', range.from);
      if (range.to) q = q.lte('start_time', range.to);
      const { data, error } = await q;
      if (error) return { shifts: [], error: error.message };
      const shifts = data || [];
      const workerIds = [...new Set(shifts.map((s) => s.worker_id).filter(Boolean))];
      let profiles = {};
      if (workerIds.length) {
        const { data: profs } = await client.from('user_profiles').select('user_id, full_name, email').in('user_id', workerIds);
        (profs || []).forEach((p) => { profiles[p.user_id] = p; });
      }
      const enriched = shifts.map((s) => Object.assign({}, s, {
        worker_name: s.worker_id ? (profiles[s.worker_id] && profiles[s.worker_id].full_name || '—') : null,
        worker_email: s.worker_id ? (profiles[s.worker_id] && profiles[s.worker_id].email || '') : null
      }));
      return { shifts: enriched, error: null };
    } catch (e) { return { shifts: [], error: e.message }; }
  }
  async function assignShiftWorker(shiftId, workerId) {
    const client = getSupabaseClient();
    if (!client) return { shift: null, error: 'Supabase not configured' };
    if (!shiftId) return { shift: null, error: 'shiftId is required' };
    try {
      const patch = { worker_id: workerId || null, status: workerId ? 'accepted' : 'offered' };
      const { data, error } = await client.from('shifts').update(patch).eq('id', shiftId).select().single();
      if (error) return { shift: null, error: error.message };
      return { shift: data, error: null };
    } catch (e) { return { shift: null, error: e.message }; }
  }
  window.createOrgShift = createOrgShift;
  window.loadOrgShifts = loadOrgShifts;
  window.assignShiftWorker = assignShiftWorker;
  window.loadOrgTeam = loadOrgTeam;

  // ============================================================
  // CIARALINK CONNECT — capacity marketplace (posts + radars)
  // Backed by capacity_posts / capacity_radars (migration
  // 20260628222936_capacity_marketplace.sql).
  // ============================================================

  // The whole CiaraLink Connect board (other providers' openings) — any
  // authenticated user can read active, non-expired posts.
  async function loadCapacityBoard() {
    const client = getSupabaseClient();
    if (!client) return { posts: [], error: 'Supabase not configured' };
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await client
        .from('capacity_posts')
        .select('id, org_id, discipline, sub_specialty, delivery_modes, location, funding_types, age_group, languages, open_slots, waitlist_info, status, expires_at, created_at, updated_at, organisations ( name )')
        .neq('status', 'closed')
        .gt('expires_at', nowIso)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) return { posts: [], error: error.message };
      const posts = (data || []).map((p) => Object.assign({}, p, {
        org_name: (p.organisations && p.organisations.name) || 'NDIS Provider'
      }));
      return { posts: posts, error: null };
    } catch (e) { return { posts: [], error: e.message }; }
  }

  // The current org's own capacity posts (for the "Your active posts" list).
  async function loadMyCapacityPosts() {
    const client = getSupabaseClient();
    if (!client) return { posts: [], error: 'Supabase not configured' };
    try {
      const ctx = await loadCurrentUserContext();
      const orgId = ctx && ctx.organisationId;
      if (!orgId) return { posts: [], error: 'No organisation found' };
      const { data, error } = await client
        .from('capacity_posts')
        .select('id, org_id, discipline, sub_specialty, delivery_modes, location, funding_types, age_group, languages, open_slots, waitlist_info, status, expires_at, created_at, updated_at')
        .eq('org_id', orgId)
        .neq('status', 'closed')
        .order('updated_at', { ascending: false })
        .limit(100);
      if (error) return { posts: [], error: error.message };
      return { posts: data || [], error: null };
    } catch (e) { return { posts: [], error: e.message }; }
  }

  async function createCapacityPost(input) {
    const client = getSupabaseClient();
    if (!client) return { post: null, error: 'Supabase not configured' };
    input = input || {};
    if (!input.discipline) return { post: null, error: 'discipline is required' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { post: null, error: 'No user logged in' };
      let orgId = input.org_id || null;
      if (!orgId) {
        const ctx = await loadCurrentUserContext();
        orgId = ctx && ctx.organisationId;
      }
      if (!orgId) return { post: null, error: 'No organisation found for current user' };
      const row = {
        org_id: orgId,
        created_by: user.id,
        discipline: input.discipline,
        sub_specialty: input.sub_specialty || null,
        delivery_modes: input.delivery_modes || [],
        location: input.location || null,
        funding_types: input.funding_types || [],
        age_group: input.age_group || null,
        languages: input.languages || [],
        open_slots: input.open_slots != null ? input.open_slots : 0,
        waitlist_info: input.waitlist_info || null,
        status: input.status || 'active'
      };
      const { data, error } = await client.from('capacity_posts').insert(row).select().single();
      if (error) return { post: null, error: error.message };
      return { post: data, error: null };
    } catch (e) { return { post: null, error: e.message }; }
  }

  // Refresh a post — pushes expiry back out to 14 days and re-activates it.
  async function refreshCapacityPost(postId) {
    const client = getSupabaseClient();
    if (!client) return { post: null, error: 'Supabase not configured' };
    if (!postId) return { post: null, error: 'postId is required' };
    try {
      const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await client
        .from('capacity_posts')
        .update({ expires_at: expires, status: 'active' })
        .eq('id', postId)
        .select()
        .single();
      if (error) return { post: null, error: error.message };
      return { post: data, error: null };
    } catch (e) { return { post: null, error: e.message }; }
  }

  async function closeCapacityPost(postId) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not configured' };
    if (!postId) return { error: 'postId is required' };
    try {
      const { error } = await client.from('capacity_posts').update({ status: 'closed' }).eq('id', postId);
      return { error: error ? error.message : null };
    } catch (e) { return { error: e.message }; }
  }

  async function loadCapacityRadars() {
    const client = getSupabaseClient();
    if (!client) return { radars: [], error: 'Supabase not configured' };
    try {
      const ctx = await loadCurrentUserContext();
      const orgId = ctx && ctx.organisationId;
      if (!orgId) return { radars: [], error: 'No organisation found' };
      const { data, error } = await client
        .from('capacity_radars')
        .select('id, org_id, title, detail, discipline, delivery_mode, funding, location, age_group, languages, active, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return { radars: [], error: error.message };
      return { radars: data || [], error: null };
    } catch (e) { return { radars: [], error: e.message }; }
  }

  async function createCapacityRadar(input) {
    const client = getSupabaseClient();
    if (!client) return { radar: null, error: 'Supabase not configured' };
    input = input || {};
    if (!input.title) return { radar: null, error: 'title is required' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { radar: null, error: 'No user logged in' };
      let orgId = input.org_id || null;
      if (!orgId) {
        const ctx = await loadCurrentUserContext();
        orgId = ctx && ctx.organisationId;
      }
      if (!orgId) return { radar: null, error: 'No organisation found for current user' };
      const row = {
        org_id: orgId,
        created_by: user.id,
        title: input.title,
        detail: input.detail || null,
        discipline: input.discipline || null,
        delivery_mode: input.delivery_mode || null,
        funding: input.funding || null,
        location: input.location || null,
        age_group: input.age_group || null,
        languages: input.languages || [],
        active: input.active != null ? input.active : true
      };
      const { data, error } = await client.from('capacity_radars').insert(row).select().single();
      if (error) return { radar: null, error: error.message };
      return { radar: data, error: null };
    } catch (e) { return { radar: null, error: e.message }; }
  }

  async function toggleCapacityRadar(radarId, active) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not configured' };
    if (!radarId) return { error: 'radarId is required' };
    try {
      const { error } = await client.from('capacity_radars').update({ active: !!active }).eq('id', radarId);
      return { error: error ? error.message : null };
    } catch (e) { return { error: e.message }; }
  }

  window.loadCapacityBoard = loadCapacityBoard;
  window.loadMyCapacityPosts = loadMyCapacityPosts;
  window.createCapacityPost = createCapacityPost;
  window.refreshCapacityPost = refreshCapacityPost;
  window.closeCapacityPost = closeCapacityPost;
  window.loadCapacityRadars = loadCapacityRadars;
  window.createCapacityRadar = createCapacityRadar;
  window.toggleCapacityRadar = toggleCapacityRadar;

  // ============================================================
  // WORKFORCE MATCH — worker job applications ("Apply with passport")
  // RLS: applicant_user_id = auth.uid() on insert/select/update.
  // ============================================================

  /**
   * Record a worker's application to a Workforce Match role using their passport.
   * @param {Object} input { provider_name, role, match_score?, pay_rate?, area?, job_snapshot?, status? }
   * @returns {Promise<{application, error}>}
   */
  async function createJobApplication(input) {
    const client = getSupabaseClient();
    if (!client) return { application: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { application: null, error: 'No user logged in' };
      if (!input || !input.provider_name || !input.role) {
        return { application: null, error: 'provider_name and role are required' };
      }
      let orgId = input.applicant_org_id || null;
      if (!orgId) {
        try { const ctx = await loadCurrentUserContext(); orgId = (ctx && ctx.organisationId) || null; } catch (e) {}
      }
      const row = {
        applicant_user_id: user.id,
        applicant_org_id: orgId,
        provider_name: input.provider_name,
        role: input.role,
        match_score: input.match_score || null,
        pay_rate: input.pay_rate || null,
        area: input.area || null,
        job_snapshot: input.job_snapshot || null,
        status: input.status || 'submitted',
      };
      const { data, error } = await client
        .from('job_applications')
        .insert(row)
        .select()
        .single();
      if (error) return { application: null, error: error.message };
      return { application: data, error: null };
    } catch (e) {
      console.error('Create job application error:', e.message);
      return { application: null, error: e.message };
    }
  }

  /**
   * Load the current worker's own job applications (RLS-scoped).
   * @returns {Promise<{applications, error}>}
   */
  async function loadMyJobApplications() {
    const client = getSupabaseClient();
    if (!client) return { applications: [], error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { applications: [], error: 'No user logged in' };
      const { data, error } = await client
        .from('job_applications')
        .select('id, provider_name, role, match_score, status, created_at')
        .eq('applicant_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return { applications: [], error: error.message };
      return { applications: data || [], error: null };
    } catch (e) {
      console.error('Load job applications error:', e.message);
      return { applications: [], error: e.message };
    }
  }

  window.createJobApplication = createJobApplication;
  window.loadMyJobApplications = loadMyJobApplications;

  // ============================================================
  // SIGNATURE REQUESTS (AI Intake — "Send for signature")
  // NOTE: this is a request/audit log, NOT a legally binding e-signature.
  // A compliant e-sign provider must complete the actual signing.
  // ============================================================
  /**
   * Log a "send for signature" request (org-scoped, RLS-protected).
   * @param {{document_title:string, participant_name?:string, participant_id?:string, document_id?:string, recipient?:string, org_id?:string, status?:string}} input
   * @returns {Promise<{request, error, emailSent, emailError}>}
   */
  async function createSignatureRequest(input) {
    input = input || {};
    const client = getSupabaseClient();
    if (!client) return { request: null, error: 'Supabase not configured', emailSent: false, emailError: null };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { request: null, error: 'No user logged in', emailSent: false, emailError: null };
      if (!input.document_title) return { request: null, error: 'document_title is required', emailSent: false, emailError: null };
      let orgId = input.org_id || null;
      if (!orgId) { const ctx = await loadCurrentUserContext(); orgId = ctx && ctx.organisationId ? ctx.organisationId : null; }
      if (!orgId) return { request: null, error: 'No organisation found for current user', emailSent: false, emailError: null };
      const row = {
        org_id: orgId,
        requested_by: user.id,
        document_title: input.document_title,
        participant_name: input.participant_name || null,
        participant_id: input.participant_id || null,
        document_id: input.document_id || null,
        recipient: input.recipient || null,
        status: input.status || 'sent',
        filled_html: input.filled_html || null,
      };
      const { data, error } = await client.from('signature_requests').insert(row).select().single();
      if (error) return { request: null, error: error.message, emailSent: false, emailError: null };
      let emailSent = false;
      let emailError = null;
      if (data && data.status === 'sent' && data.recipient && /@/.test(String(data.recipient))) {
        try {
          const sess = await client.auth.getSession();
          const token = sess && sess.data && sess.data.session && sess.data.session.access_token;
          if (token) {
            const er = await fetch('/api/send-signing-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
              body: JSON.stringify({ id: data.id }),
            });
            const ej = await er.json().catch(function () { return {}; });
            emailSent = !!ej.emailSent;
            emailError = ej.emailError || ej.error || null;
            if (!er.ok && !emailError) emailError = 'HTTP ' + er.status;
          } else {
            emailError = 'no_auth_token';
          }
        } catch (e) {
          emailError = e.message || String(e);
        }
      }
      return { request: data, error: null, emailSent: emailSent, emailError: emailError };
    } catch (e) { return { request: null, error: e.message, emailSent: false, emailError: null }; }
  }

  /**
   * Load signature requests for the current user's org(s).
   * @returns {Promise<{requests, error}>}
   */
  async function loadSignatureRequests() {
    const client = getSupabaseClient();
    if (!client) return { requests: [], error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { requests: [], error: 'No user logged in' };
      const { data, error } = await client
        .from('signature_requests')
        .select('id, org_id, requested_by, participant_id, participant_name, document_id, document_title, recipient, status, provider, external_ref, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return { requests: [], error: error.message };
      return { requests: data || [], error: null };
    } catch (e) {
      console.error('Load signature requests error:', e.message);
      return { requests: [], error: e.message };
    }
  }

  window.createSignatureRequest = createSignatureRequest;
  window.loadSignatureRequests = loadSignatureRequests;

  /**
   * Load plan-review share audit rows for a participant (RLS: author + visibility).
   * @param {string} participantId
   * @returns {Promise<{shares, error}>}
   */
  async function loadPlanReviewShares(participantId) {
    const client = getSupabaseClient();
    if (!client) return { shares: [], error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { shares: [], error: 'No user logged in' };
      if (!participantId) return { shares: [], error: 'participantId is required' };
      const { data, error } = await client
        .from('plan_review_shares')
        .select('id, participant_id, recipient_name, recipient_email, recipient_role, status, contained_illustrative_data, created_at')
        .eq('participant_id', participantId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return { shares: [], error: error.message };
      return { shares: data || [], error: null };
    } catch (e) {
      console.error('Load plan review shares error:', e.message);
      return { shares: [], error: e.message };
    }
  }

  window.loadPlanReviewShares = loadPlanReviewShares;

  // ============================================================
  // SERVICE AGREEMENTS (NDIS)  — Service Agreement.dc.html
  // Requires migration 20260628223551_service_agreements.sql
  // RLS: service_agreements_insert — created_by = auth.uid(), org-scoped,
  // care-team / org-linked to the participant.
  //
  // ⚠️ COMPLIANCE: stores an attestation + record of the signed agreement, not a
  // certified e-signature. See migration header.
  // ============================================================
  async function createServiceAgreement(input) {
    input = input || {};
    const client = getSupabaseClient();
    if (!client) return { agreement: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { agreement: null, error: 'No user logged in' };
      if (!input.participant_id) return { agreement: null, error: 'participant_id is required' };
      let orgId = input.org_id || null;
      if (!orgId) { const ctx = await loadCurrentUserContext(); orgId = ctx && ctx.organisationId ? ctx.organisationId : null; }
      if (!orgId) return { agreement: null, error: 'No organisation found for current user' };
      const row = {
        org_id: orgId,
        participant_id: input.participant_id,
        created_by: user.id,
        reference: input.reference || null,
        participant_name: input.participant_name || null,
        ndis_number: input.ndis_number || null,
        address: input.address || null,
        provider_name: input.provider_name || null,
        period_start: input.period_start || null,
        period_end: input.period_end || null,
        services: input.services || [],
        terms: input.terms || [],
        consents: input.consents || [],
        estimated_weekly: input.estimated_weekly || null,
        signer_name: input.signer_name || null,
        signature_method: input.signature_method || 'on_screen',
        signed_at: input.signed_at || new Date().toISOString(),
        document_id: input.document_id || null,
        status: input.status || 'signed',
      };
      const { data, error } = await client.from('service_agreements').insert(row).select().single();
      if (error) return { agreement: null, error: error.message };
      return { agreement: data, error: null };
    } catch (e) {
      console.error('createServiceAgreement error:', e.message);
      return { agreement: null, error: e.message };
    }
  }
  // Attach a filed document to an existing agreement (after the doc is uploaded).
  async function attachServiceAgreementDocument(agreementId, documentId) {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase not configured' };
    try {
      const { error } = await client.from('service_agreements')
        .update({ document_id: documentId }).eq('id', agreementId);
      return { error: error ? error.message : null };
    } catch (e) { return { error: e.message }; }
  }
  async function loadServiceAgreementsForParticipant(participantId) {
    const client = getSupabaseClient();
    if (!client) return { agreements: [], error: 'Supabase not configured' };
    try {
      let q = client.from('service_agreements')
        .select('id, org_id, participant_id, reference, participant_name, provider_name, period_start, period_end, estimated_weekly, signer_name, signature_method, signed_at, document_id, status, created_at')
        .order('created_at', { ascending: false }).limit(100);
      if (participantId) q = q.eq('participant_id', participantId);
      const { data, error } = await q;
      if (error) return { agreements: [], error: error.message };
      return { agreements: data || [], error: null };
    } catch (e) { return { agreements: [], error: e.message }; }
  }
  // Render the structured agreement to a self-contained HTML file and file it as
  // a 'service_agreement' document against the participant (Storage + documents row).
  async function uploadServiceAgreementDocument(args) {
    args = args || {};
    if (!args.html || !args.participant_id) return { document: null, error: 'html and participant_id are required' };
    try {
      const blob = new Blob([args.html], { type: 'text/html' });
      const fname = (args.reference || 'service-agreement') + '.html';
      let file;
      try { file = new File([blob], fname, { type: 'text/html' }); }
      catch (e) { file = blob; file.name = fname; }
      return await uploadDocument({
        file: file,
        org_id: args.org_id || undefined,
        participant_id: args.participant_id,
        doc_type: 'service_agreement',
        title: args.title || ('Service Agreement — ' + (args.participant_name || '')),
        description: args.description || undefined,
      });
    } catch (e) { return { document: null, error: e.message }; }
  }

  window.createServiceAgreement = createServiceAgreement;
  window.attachServiceAgreementDocument = attachServiceAgreementDocument;
  window.loadServiceAgreementsForParticipant = loadServiceAgreementsForParticipant;
  window.uploadServiceAgreementDocument = uploadServiceAgreementDocument;

  // ============================================================
  // CONSENT CENTRE — permission matrix, consent documents, audit log
  // RLS-scoped to the participant (care team / linked org / own account).
  // Tables: consent_permissions, consent_documents, consent_audit_log.
  // ============================================================

  // Load the saved permission matrix for a participant.
  // Returns { permissions: [...rows], error }. Map by `subject_key + '_' + category`.
  async function loadConsentPermissions(participantId) {
    const client = getSupabaseClient();
    if (!client) return { permissions: [], error: 'Supabase not configured' };
    try {
      if (!participantId) return { permissions: [], error: 'participantId is required' };
      const { data, error } = await client
        .from('consent_permissions')
        .select('id, participant_id, org_id, subject_key, subject_role, subject_label, subject_user_id, category, access_level, updated_at')
        .eq('participant_id', participantId)
        .limit(500);
      if (error) return { permissions: [], error: error.message };
      return { permissions: data || [], error: null };
    } catch (e) { return { permissions: [], error: e.message }; }
  }

  // Upsert a single permission cell (participant × subject × category).
  async function setConsentPermission(input) {
    const client = getSupabaseClient();
    if (!client) return { permission: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { permission: null, error: 'No user logged in' };
      if (!input || !input.participant_id || !input.subject_key || !input.category || !input.access_level) {
        return { permission: null, error: 'participant_id, subject_key, category and access_level are required' };
      }
      let orgId = input.org_id || null;
      if (!orgId) { try { const ctx = await loadCurrentUserContext(); orgId = (ctx && ctx.organisationId) || null; } catch (e) {} }
      const row = {
        participant_id: input.participant_id,
        org_id: orgId,
        subject_key: input.subject_key,
        subject_role: input.subject_role || null,
        subject_label: input.subject_label || null,
        subject_user_id: input.subject_user_id || null,
        category: input.category,
        access_level: input.access_level,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await client
        .from('consent_permissions')
        .upsert(row, { onConflict: 'participant_id,subject_key,category' })
        .select()
        .single();
      if (error) return { permission: null, error: error.message };
      return { permission: data, error: null };
    } catch (e) { return { permission: null, error: e.message }; }
  }

  // Revoke ALL granted permissions for a participant (set every existing row to 'none').
  async function revokeAllConsent(participantId) {
    const client = getSupabaseClient();
    if (!client) return { count: 0, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { count: 0, error: 'No user logged in' };
      if (!participantId) return { count: 0, error: 'participantId is required' };
      const { data, error } = await client
        .from('consent_permissions')
        .update({ access_level: 'none', updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('participant_id', participantId)
        .neq('access_level', 'none')
        .select('id');
      if (error) return { count: 0, error: error.message };
      return { count: (data || []).length, error: null };
    } catch (e) { return { count: 0, error: e.message }; }
  }

  // Consent documents for a participant.
  async function loadConsentDocuments(participantId) {
    const client = getSupabaseClient();
    if (!client) return { documents: [], error: 'Supabase not configured' };
    try {
      if (!participantId) return { documents: [], error: 'participantId is required' };
      const { data, error } = await client
        .from('consent_documents')
        .select('id, participant_id, org_id, doc_type, title, status, signed_by, signed_role, signed_at, expires_at, document_storage_path, notes, created_at')
        .eq('participant_id', participantId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return { documents: [], error: error.message };
      return { documents: data || [], error: null };
    } catch (e) { return { documents: [], error: e.message }; }
  }

  // Create a consent document record. COMPLIANCE-SENSITIVE: this records the
  // consent + its status; the legally binding signed artefact / signature
  // capture is out of scope and needs human/compliance handling.
  async function createConsentDocument(input) {
    const client = getSupabaseClient();
    if (!client) return { document: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { document: null, error: 'No user logged in' };
      if (!input || !input.participant_id || !input.title) {
        return { document: null, error: 'participant_id and title are required' };
      }
      let orgId = input.org_id || null;
      if (!orgId) { try { const ctx = await loadCurrentUserContext(); orgId = (ctx && ctx.organisationId) || null; } catch (e) {} }
      const row = {
        participant_id: input.participant_id,
        org_id: orgId,
        doc_type: input.doc_type || 'general_share',
        title: input.title,
        status: input.status || 'draft',
        signed_by: input.signed_by || null,
        signed_role: input.signed_role || null,
        signed_at: input.signed_at || null,
        expires_at: input.expires_at || null,
        document_storage_path: input.document_storage_path || null,
        notes: input.notes || null,
        created_by: user.id,
      };
      const { data, error } = await client.from('consent_documents').insert(row).select().single();
      if (error) return { document: null, error: error.message };
      return { document: data, error: null };
    } catch (e) { return { document: null, error: e.message }; }
  }

  // Append-only consent audit log.
  async function loadConsentAuditLog(participantId) {
    const client = getSupabaseClient();
    if (!client) return { entries: [], error: 'Supabase not configured' };
    try {
      if (!participantId) return { entries: [], error: 'participantId is required' };
      const { data, error } = await client
        .from('consent_audit_log')
        .select('id, participant_id, actor_id, actor_label, action, category, subject_label, detail, created_at')
        .eq('participant_id', participantId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return { entries: [], error: error.message };
      return { entries: data || [], error: null };
    } catch (e) { return { entries: [], error: e.message }; }
  }

  async function logConsentChange(input) {
    const client = getSupabaseClient();
    if (!client) return { entry: null, error: 'Supabase not configured' };
    try {
      const { user, error: userError } = await getCurrentUser();
      if (userError || !user) return { entry: null, error: 'No user logged in' };
      if (!input || !input.participant_id || !input.action) {
        return { entry: null, error: 'participant_id and action are required' };
      }
      let orgId = input.org_id || null;
      if (!orgId) { try { const ctx = await loadCurrentUserContext(); orgId = (ctx && ctx.organisationId) || null; } catch (e) {} }
      let actorLabel = input.actor_label || null;
      if (!actorLabel) {
        try { const prof = await loadUserProfile(user.id); actorLabel = (prof && prof.profile && (prof.profile.full_name || prof.profile.email)) || user.email || 'You'; } catch (e) { actorLabel = user.email || 'You'; }
      }
      const row = {
        participant_id: input.participant_id,
        org_id: orgId,
        actor_id: user.id,
        actor_label: actorLabel,
        action: input.action,
        category: input.category || null,
        subject_label: input.subject_label || null,
        detail: input.detail || null,
      };
      const { data, error } = await client.from('consent_audit_log').insert(row).select().single();
      if (error) return { entry: null, error: error.message };
      return { entry: data, error: null };
    } catch (e) { return { entry: null, error: e.message }; }
  }

  window.loadConsentPermissions = loadConsentPermissions;
  window.setConsentPermission = setConsentPermission;
  window.revokeAllConsent = revokeAllConsent;
  window.loadConsentDocuments = loadConsentDocuments;
  window.createConsentDocument = createConsentDocument;
  window.loadConsentAuditLog = loadConsentAuditLog;
  window.logConsentChange = logConsentChange;
})();
