/* My Notes: подключение к Firebase вместо хранилища claude.ai.
   Страница обращается к данным через window.claude.use('db') и window.claude.use('user');
   здесь эти вызовы отдаются в Firestore и Firebase Auth. */
(function () {
  'use strict';
  window.NOTES_STANDALONE = true;
  var cfg = window.NOTES_CONFIG || {};
  var overlay = null;

  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function showGate(title, text, withButton) {
    if (!overlay) {
      overlay = el('<div class="gate"><div class="gate-card"><div class="gate-mark">‹/›</div><h1></h1><p></p><button class="btn primary big" type="button">Войти через Google</button><small></small></div></div>');
      var st = document.createElement('style');
      st.textContent = '.gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:var(--bg,#f3f4ef);color:var(--ink,#1c201d)}' +
        '.gate-card{max-width:380px;width:100%;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}' +
        '.gate-mark{font:600 28px/1 var(--f-display,system-ui);color:var(--accent,#2f6b55)}' +
        '.gate h1{font:600 22px/1.25 var(--f-display,system-ui);margin:0}' +
        '.gate p{margin:0;color:var(--muted,#5f6862);line-height:1.5}.gate small{color:var(--again,#b5442f);min-height:1em}';
      document.head.appendChild(st);
      document.body.appendChild(overlay);
      overlay.querySelector('button').onclick = signIn;
    }
    overlay.hidden = false;
    overlay.querySelector('h1').textContent = title;
    overlay.querySelector('p').textContent = text;
    overlay.querySelector('button').hidden = !withButton;
  }
  function gateError(msg) { if (overlay) overlay.querySelector('small').textContent = msg || ''; }
  function hideGate() { if (overlay) overlay.hidden = true; }

  if (!window.firebase || !cfg.firebase || !cfg.firebase.apiKey || /ВСТАВЬ/.test(cfg.firebase.apiKey)) {
    document.addEventListener('DOMContentLoaded', function () {
      showGate('Нужна настройка', 'Открой config.js и вставь туда настройки своего проекта Firebase (см. инструкцию).', false);
    });
    window.claude = { use: function () { return Promise.resolve(null); } };
    return;
  }

  firebase.initializeApp(cfg.firebase);
  var auth = firebase.auth();
  var fs = firebase.firestore();
  try { fs.settings({ ignoreUndefinedProperties: true, merge: true }); } catch (e) {}
  // офлайн-кэш: заметки открываются и без сети, изменения досылаются при появлении связи
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}

  function signIn() {
    gateError('');
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(provider).catch(function (err) {
      if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
        auth.signInWithRedirect(provider);
      } else if (err && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        gateError('Не получилось войти: ' + (err.message || err.code));
      }
    });
  }
  window.NOTES_SIGN_OUT = function () { auth.signOut().then(function () { location.reload(); }); };

  var resolveUser;
  var userReady = new Promise(function (r) { resolveUser = r; });
  auth.getRedirectResult().catch(function (err) { if (err) gateError('Не получилось войти: ' + (err.message || err.code)); });
  auth.onAuthStateChanged(function (u) {
    if (!u) { showGate('My Notes', 'Войди, чтобы открыть свои заметки на этом устройстве.', true); return; }
    var allowed = (cfg.allowedEmails || []).map(function (x) { return String(x).toLowerCase(); });
    if (allowed.length && allowed.indexOf(String(u.email || '').toLowerCase()) < 0) {
      showGate('Этот аккаунт не подходит', 'Вход выполнен как ' + u.email + '. Заметки доступны только владельцу.', true);
      auth.signOut();
      return;
    }
    window.NOTES_USER_EMAIL = u.email || '';
    hideGate();
    resolveUser(u);
  });

  var userApi = null;
  window.claude = {
    use: function (name) {
      return userReady.then(function (u) {
        if (name === 'db') return fs;
        if (name === 'user') {
          if (!userApi) userApi = {
            id: function () { return Promise.resolve(u.uid); },
            can: function () { return Promise.resolve(true); },
            isOwner: function () { return true; },
            canEdit: function () { return true; }
          };
          return userApi;
        }
        return null;
      });
    }
  };
})();
