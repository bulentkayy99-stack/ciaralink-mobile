/* CiaraLink — native runtime niceties (vanilla, no bundler).
 * Uses the global window.Capacitor.Plugins API. No-op in a normal browser.
 */
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || !(C.isNativePlatform && C.isNativePlatform())) return;
  var P = C.Plugins || {};

  try {
    if (P.StatusBar) {
      P.StatusBar.setBackgroundColor({ color: '#14302b' });
      P.StatusBar.setStyle({ style: 'DARK' });
    }
  } catch (e) {}

  try {
    if (P.SplashScreen) {
      window.addEventListener('load', function () {
        setTimeout(function () { P.SplashScreen.hide(); }, 200);
      });
    }
  } catch (e) {}

  try {
    if (P.App && P.App.addListener) {
      P.App.addListener('backButton', function (ev) {
        var path = (location.pathname || '').toLowerCase();
        var atRoot = path.indexOf('login') > -1 || path.indexOf('landing') > -1 || path === '/' || path === '';
        if (ev && ev.canGoBack && !atRoot) {
          window.history.back();
        } else {
          P.App.exitApp();
        }
      });
    }
  } catch (e) {}

  /* ---- Push notifications ------------------------------------------------
   * The @capacitor/push-notifications plugin is installed + configured. This
   * registers the device on launch, captures the APNs/FCM token, best-effort
   * reports it to the backend so pushes can be targeted per user, and routes a
   * tapped notification to its target page (or the in-app Notification Centre).
   *
   * Delivery still needs the platform credentials (Bulent's wall):
   *   iOS     — an APNs Auth Key + the Push Notifications capability (signing).
   *   Android — a Firebase project's google-services.json in android/app/.
   * Until then, registration simply no-ops gracefully — nothing breaks. */
  try {
    var PN = P.PushNotifications;
    if (PN && PN.addListener) {
      function clSession() {
        try { return JSON.parse(localStorage.getItem('ciaralink_session') || '{}') || {}; }
        catch (e) { return {}; }
      }

      function postToken(token, authToken) {
        try {
          var sess = clSession();
          var platform = (C.getPlatform && C.getPlatform()) || 'unknown';
          var headers = { 'Content-Type': 'application/json' };
          if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
          // Bridge routes /api/* to the live Vercel backend. Best-effort — a 404
          // (endpoint not deployed yet) is swallowed; the token is kept locally.
          fetch('/api/register-push-token', {
            method: 'POST', headers: headers,
            body: JSON.stringify({ token: token, platform: platform, userId: sess.userId || null, role: sess.role || null })
          }).catch(function () {});
        } catch (e) {}
      }

      function reportToken(token) {
        try { localStorage.setItem('ciaralink_push_token', token); } catch (e) {}
        // Attach the Supabase access token so the backend verifies the user
        // server-side rather than trusting a spoofable body field.
        try {
          var c = window.getSupabaseClient && window.getSupabaseClient();
          if (c && c.auth && c.auth.getSession) {
            c.auth.getSession()
              .then(function (r) { postToken(token, r && r.data && r.data.session && r.data.session.access_token); })
              .catch(function () { postToken(token, null); });
          } else { postToken(token, null); }
        } catch (e) { postToken(token, null); }
      }

      PN.addListener('registration', function (t) { if (t && t.value) reportToken(t.value); });
      PN.addListener('registrationError', function (err) {
        try { console.warn('[push] registration error', (err && (err.error || err)) || err); } catch (e) {}
      });
      PN.addListener('pushNotificationReceived', function (n) {
        try { console.log('[push] received in foreground:', n && n.title); } catch (e) {}
      });
      PN.addListener('pushNotificationActionPerformed', function (a) {
        var data = (a && a.notification && a.notification.data) || {};
        var dest = data.url || data.page || 'Notification%20Centre.dc.html';
        // Only allow in-bundle relative targets — never an external scheme.
        if (typeof dest !== 'string' || /^[a-z][a-z0-9+.-]*:/i.test(dest) || dest.indexOf('//') === 0) {
          dest = 'Notification%20Centre.dc.html';
        }
        try { window.location.href = dest; } catch (e) {}
      });

      // Ask permission + register once per app launch (listeners still attach on
      // every page so a notification tap that cold-launches the app routes too).
      var alreadyRegistered = false;
      try { alreadyRegistered = sessionStorage.getItem('cl_push_registered') === '1'; } catch (e) {}
      if (!alreadyRegistered) {
        PN.checkPermissions().then(function (res) {
          if (res && (res.receive === 'prompt' || res.receive === 'prompt-with-rationale')) return PN.requestPermissions();
          return res;
        }).then(function (res) {
          if (res && res.receive === 'granted') {
            PN.register();
            try { sessionStorage.setItem('cl_push_registered', '1'); } catch (e) {}
          }
        }).catch(function () {});
      }
    }
  } catch (e) {}
})();
