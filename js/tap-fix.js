// Mobile tap fix: iOS/Android can treat the first tap on a link as a "hover"
// (hover styles, animated content changing under the finger) and swallow the
// click. On a clean single tap we activate the link directly.
(function () {
  var sx = 0, sy = 0, st = 0, moved = false;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { moved = true; return; }
    var t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); moved = false;
  }, { passive: true, capture: true });
  document.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    if (t && (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10)) moved = true;
  }, { passive: true, capture: true });
  document.addEventListener('touchend', function (e) {
    if (moved || Date.now() - st > 700 || e.defaultPrevented) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    e.preventDefault();
    a.click();
  }, { passive: false, capture: false });
  var s = document.createElement('style');
  s.textContent = 'a,button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}';
  (document.head || document.documentElement).appendChild(s);
})();
