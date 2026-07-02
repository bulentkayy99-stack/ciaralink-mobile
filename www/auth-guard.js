/* auth-guard.js — CiaraLink.
   1) If Supabase is configured but there's NO session, send the visitor to
      sign-in (prevents the "page loads but nothing works" trap).
   2) If there IS a session but the user is on a page that belongs to a
      DIFFERENT role, send them to their own dashboard. This fixes the bug where
      e.g. a provider opening the Support Worker app saw an empty, non-working
      screen instead of being routed home — the old per-page guards compared
      against short role codes ('provider') while real logins store the full
      enum role ('provider_owner'), so they never fired.
   Does nothing in the unconfigured design preview. */
(function () {
  function signInPage() {
    try {
      var native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
      return native ? 'Login.dc.html' : 'signin.html';
    } catch (e) { return 'Login.dc.html'; }
  }
  // Normalize both demo short codes and real enum roles to a canonical bucket.
  function normRole(r) {
    var map = {
      provider: 'provider', provider_owner: 'provider', provider_admin: 'provider', provider_staff: 'provider', platform_admin: 'provider',
      worker: 'worker', support_worker: 'worker', abn_worker: 'worker',
      coordinator: 'coordinator', support_coordinator: 'coordinator',
      allied: 'allied', allied_health: 'allied', allied_health_admin: 'allied',
      participant: 'participant', guardian: 'participant', guardian_nominee: 'participant'
    };
    return r ? (map[r] || null) : null;
  }
  var DASH = {
    provider: 'CiaraLink Provider Dashboard.dc.html',
    worker: 'Support Worker.dc.html',
    coordinator: 'Support Coordination.dc.html',
    allied: 'Allied Health.dc.html',
    participant: 'Participant Dashboard.dc.html'
  };
  // Which canonical role each protected page belongs to.
  var PAGE_ROLE = {
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
    'Participant Dashboard.dc.html': 'participant'
  };

  function currentPage() {
    try { return decodeURIComponent((location.pathname.split('/').pop() || '')); } catch (e) { return ''; }
  }

  function persistSessionRole(userId, role) {
    try {
      var s = JSON.parse(localStorage.getItem('ciaralink_session') || '{}');
      s.loggedIn = true;
      s.supabase = true;
      if (userId) s.userId = userId;
      if (role) s.role = role;
      s.ts = Date.now();
      localStorage.setItem('ciaralink_session', JSON.stringify(s));
    } catch (e) {}
  }

  function routeByRole(roleEnum) {
    // Don't fight the embedded console iframe (rendered inside the provider dash).
    try { if (new URLSearchParams(location.search).get('embed') === '1') return; } catch (e) {}
    var want = PAGE_ROLE[currentPage()];
    if (!want) return; // page isn't role-specific
    var have = normRole(roleEnum);
    if (!have) return; // unknown role -> fail open, don't lock the user out
    if (have !== want) {
      var dest = DASH[have];
      if (dest && dest !== currentPage()) window.location.replace(dest);
    }
  }

  function fetchRoleFromSupabase(client, userId) {
    return client.from('organisation_members')
      .select('role')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
      .then(function (res) { return (res.data && res.data.role) || null; })
      .catch(function () { return null; });
  }

  function resolveRoleAndRoute(client, session) {
    fetchRoleFromSupabase(client, session.user.id).then(function (role) {
      if (role) persistSessionRole(session.user.id, role);
      routeByRole(role);
    });
  }

  function redirectToSignIn() {
    try { if (new URLSearchParams(location.search).get('embed') === '1') return; } catch (e) {}
    var next = encodeURIComponent((location.pathname + location.search).replace(/^\//, ''));
    window.location.replace(signInPage() + '?next=' + next);
  }

  function check(attempt) {
    attempt = attempt || 0;
    try {
      var configured = window.isSupabaseConfigured && window.isSupabaseConfigured();
      if (!configured) return; // design preview: no gate
      var client = window.getSupabaseClient && window.getSupabaseClient();
      if (!client) { if (attempt < 50) setTimeout(function () { check(attempt + 1); }, 100); return; }
      client.auth.getSession().then(function (res) {
        if (res && res.error) { redirectToSignIn(); return; }
        var session = res && res.data && res.data.session;
        if (!session) {
          // Don't redirect an embedded iframe (e.g. the console inside the
          // provider dashboard) to the sign-in page — the parent handles auth.
          try { if (new URLSearchParams(location.search).get('embed') === '1') return; } catch (e) {}
          var next = encodeURIComponent((location.pathname + location.search).replace(/^\//, ''));
          window.location.replace(signInPage() + '?next=' + next);
          return;
        }
        resolveRoleAndRoute(client, session);
      }).catch(function () { redirectToSignIn(); });
    } catch (e) {}
  }
  check(0);
})();
