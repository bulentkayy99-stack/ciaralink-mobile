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
})();
