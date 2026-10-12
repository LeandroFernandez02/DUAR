/* Paleta activa del sistema: ?paleta= > window.DUAR_PALETA > última elegida > "original". Sincroniza iframes (mapa embebido). */
(function () {
  var qs = new URLSearchParams(location.search), root = document.documentElement;
  window.DUAR_PALETAS = [
    { id: 'original', nombre: 'Original', sub: 'Naranja · tema original', colores: ['#444140', '#E0662B', '#FFA987', '#F7EBE8'] },
    { id: 'tactico', nombre: 'Paleta 2 · Táctico', sub: 'Ámbar, verde y caqui · claro', colores: ['#2a2f2a', '#4c5a46', '#8a7c53', '#c07a4a', '#efe8da'] },
    { id: 'marino', nombre: 'Paleta 3 · Marino', sub: 'Marino, naranja y celeste', colores: ['#023047', '#1f7a8c', '#fb8500', '#8ecae6', '#f8fafc'] }
  ];
  function set(p) { if (p && !window.DUAR_PALETAS.some(x => x.id === p)) p = 'original'; if (!p || p === 'original') root.removeAttribute('data-paleta'); else root.setAttribute('data-paleta', p); }
  var par = null, parDark = false;
  try { if (window.frameElement && window.frameElement.hasAttribute('data-embed')) { par = parent.duarPaleta(); parDark = parent.document.documentElement.classList.contains('dark'); } } catch (e) {}
  var guardada = null; try { guardada = localStorage.getItem('duar-paleta'); } catch (e) {}
  set(qs.get('paleta') || par || window.DUAR_PALETA || guardada || 'original');
  if (qs.get('dark') === '1' || parDark) root.classList.add('dark');
  function avisar() {
    window.dispatchEvent(new Event('duar-paleta'));
    var msg = { duarPaleta: root.getAttribute('data-paleta') || 'original', duarDark: root.classList.contains('dark') };
    document.querySelectorAll('iframe').forEach(function (f) { try { f.contentWindow.postMessage(msg, '*'); } catch (e) {} });
  }
  window.duarPaleta = function () { return root.getAttribute('data-paleta') || 'original'; };
  window.duarSetPaleta = function (p) { set(p); try { localStorage.setItem('duar-paleta', p); } catch (e) {} avisar(); };
  window.duarSetDark = function (v) { root.classList.toggle('dark', !!v); avisar(); };
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.duarPaleta === undefined && d.duarDark === undefined) return;
    if (d.duarPaleta !== undefined) set(d.duarPaleta);
    if (d.duarDark !== undefined) root.classList.toggle('dark', !!d.duarDark);
    window.dispatchEvent(new Event('duar-paleta'));
  });
})();
