/* Datos de ejemplo del Módulo 5 (Mapa Operacional) + geometría. Todo en window.MapaData / window.Geo. */
(function () {
  const R = 6371000;
  const toXY = (lat, lng, lat0) => [lng * Math.PI / 180 * R * Math.cos(lat0 * Math.PI / 180), lat * Math.PI / 180 * R];
  const lat0Of = pts => pts.reduce((s, p) => s + p[0], 0) / pts.length;

  const Geo = {
    area(poly) {
      if (!poly || poly.length < 3) return 0;
      const l0 = lat0Of(poly); const xy = poly.map(p => toXY(p[0], p[1], l0));
      let a = 0; for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; a += x1 * y2 - x2 * y1; }
      return Math.abs(a / 2);
    },
    length(pts, closed) {
      if (!pts || pts.length < 2) return 0;
      const l0 = lat0Of(pts); let d = 0; const n = closed ? pts.length : pts.length - 1;
      for (let i = 0; i < n; i++) { const a = toXY(...pts[i], l0), b = toXY(...pts[(i + 1) % pts.length], l0); d += Math.hypot(b[0] - a[0], b[1] - a[1]); }
      return d;
    },
    inside(pt, poly) {
      let c = false; const [y, x] = pt;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [yi, xi] = poly[i], [yj, xj] = poly[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    },
    /** CU-38: muestrea una grilla dentro del polígono; una celda está cubierta si alguna traza pasa a < radio metros. */
    coverage(poly, trazas, spacing = 45, radio = 38) {
      const l0 = lat0Of(poly);
      const dLat = spacing / 110540, dLng = spacing / (111320 * Math.cos(l0 * Math.PI / 180));
      const lats = poly.map(p => p[0]), lngs = poly.map(p => p[1]);
      const segs = [];
      trazas.forEach(t => { const xy = t.puntos.map(p => toXY(p[0], p[1], l0)); for (let i = 0; i < xy.length - 1; i++) segs.push([xy[i], xy[i + 1]]); });
      const cells = []; let cov = 0, total = 0, dentro = 0;
      for (let la = Math.min(...lats) + dLat / 2; la < Math.max(...lats); la += dLat) {
        for (let ln = Math.min(...lngs) + dLng / 2; ln < Math.max(...lngs); ln += dLng) {
          if (!Geo.inside([la, ln], poly)) continue;
          total++;
          const [px, py] = toXY(la, ln, l0);
          let ok = false;
          for (const [a, b] of segs) {
            const vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy;
            let t = L ? ((px - a[0]) * vx + (py - a[1]) * vy) / L : 0; t = Math.max(0, Math.min(1, t));
            if (Math.hypot(px - (a[0] + t * vx), py - (a[1] + t * vy)) < radio) { ok = true; break; }
          }
          if (ok) cov++; else cells.push([la, ln]);
        }
      }
      trazas.forEach(t => t.puntos.forEach((p, i) => { if (i && Geo.inside(p, poly)) dentro += Geo.length([t.puntos[i - 1], p]); }));
      return { pct: total ? cov / total * 100 : 0, gaps: cells, dLat, dLng, kmDentro: dentro / 1000 };
    },
    fmtArea: m2 => (m2 / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' km²',
    fmtKm: m => (m / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' km',
    fmtCoord: (lat, lng) => lat.toFixed(5) + '°, ' + lng.toFixed(5) + '°',
    elev: p => Math.round(1880 + 260 * Math.sin((p[0] + 31.96) * 230) + 150 * Math.cos((p[1] + 64.90) * 190) + 6 * Math.sin(p[1] * 2600)),
    perfil(pts) {
      const dist = [0], el = [Geo.elev(pts[0])]; let up = 0, down = 0;
      for (let i = 1; i < pts.length; i++) { dist.push(dist[i - 1] + Geo.length([pts[i - 1], pts[i]])); const e = Geo.elev(pts[i]); const de = e - el[i - 1]; if (de > 0) up += de; else down -= de; el.push(e); }
      return { dist, el, min: Math.min(...el), max: Math.max(...el), up, down };
    },
    escala(lat, z) { const r = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z) * 96 / 0.0254; return '1:' + (Math.round(r / 500) * 500).toLocaleString('es-AR'); },
    fmtRadio: km => km < 1 ? Math.round(km * 1000) + ' m' : km.toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' km',
    fmtM: m => Math.round(m).toLocaleString('es-AR') + ' m',
    fmtDist: m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' km',
    centroid(poly) { return [lat0Of(poly), poly.reduce((s, p) => s + p[1], 0) / poly.length]; },
  };

  /* Recorrido "cortadora de césped" dentro del polígono, como el que deja Wikiloc en un rastrillaje. */
  function barrido(poly, fraccion, filas, semilla) {
    let s = semilla || 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const lats = poly.map(p => p[0]), lngs = poly.map(p => p[1]);
    const top = Math.max(...lats) - 0.0003, bot = Math.min(...lats) + 0.0003;
    const west = Math.min(...lngs), east = Math.max(...lngs);
    const n = Math.max(2, Math.round(filas * fraccion)); const step = (top - bot) / (filas - 1);
    const pts = [];
    for (let r = 0; r < n; r++) {
      const la = top - r * step; const fila = [];
      for (let k = 0; k <= 16; k++) {
        const p = [la + (rnd() - 0.5) * step * 0.35, west + (east - west) * k / 16];
        if (Geo.inside(p, poly)) fila.push(p);
      }
      if (r % 2) fila.reverse();
      pts.push(...fila);
    }
    return pts;
  }

  const P = {
    s1: [[-31.9680, -64.9450], [-31.9700, -64.9280], [-31.9800, -64.9300], [-31.9790, -64.9480]],
    s2: [[-31.9700, -64.9280], [-31.9680, -64.9100], [-31.9810, -64.9080], [-31.9800, -64.9300]],
    s3: [[-31.9800, -64.9300], [-31.9810, -64.9080], [-31.9940, -64.9120], [-31.9930, -64.9310]],
    s4: [[-31.9790, -64.9480], [-31.9800, -64.9300], [-31.9930, -64.9310], [-31.9910, -64.9500]],
  };

  const grupos = [
    { id: 'g1', nombre: 'Grupo Alfa', color: '#E0662B', estado: 'replegado', lider: 'Lucía Zamora', integrantes: 6, agentes: [{ nombre: 'Lucía Zamora', dni: '33.781.006', especialidad: 'Guía canino', dotacion: 'DUAR', lider: true }, { nombre: 'Valentina Paz', dni: '39.874.115', especialidad: null, dotacion: 'BV Alta Gracia' }, { nombre: 'Federico Luna', dni: '36.402.118', especialidad: 'Rastrillaje', dotacion: 'BV Alta Gracia' }, { nombre: 'Mariana Ortiz', dni: '38.551.270', especialidad: 'Paramédico', dotacion: 'Defensa Civil Córdoba' }, { nombre: 'Gonzalo Vera', dni: '35.118.904', especialidad: 'Rastrillaje', dotacion: 'DUAR' }, { nombre: 'Rocío Funes', dni: '40.233.617', especialidad: 'Rastrillaje', dotacion: 'BV Alta Gracia' }] },
    { id: 'g2', nombre: 'Grupo Bravo', color: '#2563EB', estado: 'rastrillando', lider: 'Ramiro Sosa', integrantes: 7, agentes: [{ nombre: 'Ramiro Sosa', dni: '36.220.418', especialidad: 'Rastrillaje', dotacion: 'BV Villa General Belgrano', lider: true }, { nombre: 'Ana Quiroga', dni: '41.020.773', especialidad: 'Rastrillaje', dotacion: 'BV Villa General Belgrano' }, { nombre: 'Sofía Ledesma', dni: '40.112.630', especialidad: 'Rastrillaje', dotacion: 'BV Villa General Belgrano' }, { nombre: 'Pablo Cáceres', dni: '34.870.552', especialidad: 'Rescate en altura', dotacion: 'DUAR' }, { nombre: 'Emilia Torres', dni: '39.006.481', especialidad: 'Paramédico', dotacion: 'Defensa Civil Córdoba' }, { nombre: 'Bruno Acosta', dni: '37.441.209', especialidad: 'Rastrillaje', dotacion: 'BV Villa General Belgrano' }, { nombre: 'Joaquín Peralta', dni: '38.912.330', especialidad: null, dotacion: 'BV Villa General Belgrano' }] },
    { id: 'g3', nombre: 'Grupo Charlie', color: '#16A34A', estado: 'desplegado', lider: 'Camila Morales', integrantes: 5, agentes: [{ nombre: 'Camila Morales', dni: '38.005.912', especialidad: 'Paramédico', dotacion: 'Defensa Civil Córdoba', lider: true }, { nombre: 'Nicolás Ibarra', dni: '37.556.201', especialidad: 'Rescate en altura', dotacion: 'DUAR' }, { nombre: 'Julieta Rivas', dni: '39.774.026', especialidad: 'Rastrillaje', dotacion: 'Defensa Civil Córdoba' }, { nombre: 'Tomás Benítez', dni: '36.118.745', especialidad: 'Rastrillaje', dotacion: 'BV Tanti' }, { nombre: 'Florencia Gil', dni: '40.552.193', especialidad: null, dotacion: 'BV Tanti' }] },
    { id: 'g4', nombre: 'Grupo Delta', color: '#D97706', estado: 'confirmado', lider: 'Martín Aguirre', integrantes: 6, agentes: [{ nombre: 'Martín Aguirre', dni: '34.419.287', especialidad: 'Rastrillaje', dotacion: 'BV Alta Gracia', lider: true }, { nombre: 'Agustina Molina', dni: '38.330.512', especialidad: 'Rastrillaje', dotacion: 'BV Alta Gracia' }, { nombre: 'Lautaro Díaz', dni: '39.661.084', especialidad: 'Paramédico', dotacion: 'Defensa Civil Córdoba' }, { nombre: 'Carla Romero', dni: '37.205.948', especialidad: 'Rastrillaje', dotacion: 'DUAR' }, { nombre: 'Matías Suárez', dni: '40.887.316', especialidad: null, dotacion: 'BV Alta Gracia' }, { nombre: 'Paula Navarro', dni: '35.990.627', especialidad: 'Rastrillaje', dotacion: 'BV Alta Gracia' }] },
    { id: 'g5', nombre: 'Canes K9', color: '#7C3AED', estado: 'en_espera', lider: 'Diego Herrera', integrantes: 3, agentes: [{ nombre: 'Diego Herrera', dni: '29.663.140', especialidad: 'Guía canino', dotacion: 'DUAR', lider: true }, { nombre: 'Leandro Paz', dni: '33.402.871', especialidad: 'Guía canino', dotacion: 'DUAR' }, { nombre: 'Natalia Ruiz', dni: '36.774.590', especialidad: 'Guía canino', dotacion: 'DUAR' }], especial: true },
  ];

  const poligonos = [
    { id: 'p1', nombre: 'Sector 1 — Arroyo Seco', grupoId: null, estado: 'completado', vertices: P.s1, notas: 'Zona de pastizal con dos pircas. Terreno firme.', visible: true, historial: [{ ev: 'asignado', grupoId: 'g1', fecha: '01/03/2026 08:10' }, { ev: 'replegado', grupoId: 'g1', fecha: '02/03/2026 12:05' }] },
    { id: 'p2', nombre: 'Sector 2 — Quebrada Norte', grupoId: 'g2', estado: 'rastrillando', vertices: P.s2, notas: 'Pendiente fuerte en el borde este.', visible: true, historial: [{ ev: 'asignado', grupoId: 'g2', fecha: '02/03/2026 07:45' }] },
    { id: 'p3', nombre: 'Sector 3 — Filo del Cerro', grupoId: 'g3', estado: 'asignado', vertices: P.s3, notas: '', visible: true, historial: [{ ev: 'asignado', grupoId: 'g3', fecha: '02/03/2026 09:20' }] },
    { id: 'p4', nombre: 'Sector 4 — Bosque de Tabaquillos', grupoId: null, estado: 'pendiente', vertices: P.s4, notas: 'Vegetación cerrada, requiere caminantes.', visible: true, historial: [] },
  ];

  const trazas = [
    { id: 't1', etiqueta: 'Alfa — Jornada 1', grupoId: 'g1', poligonoId: 'p1', fecha: '2026-03-01', horaInicio: '08:35', inicio: '2026-03-01T08:35:12', fin: '2026-03-01T12:15:40', archivo: 'alfa_0103.gpx', agente: 'Lucía Zamora', cargado: '01/03/2026 13:42', notas: '', puntos: barrido(P.s1, 1, 16, 3), visible: true },
    { id: 't2', etiqueta: 'Alfa — Jornada 2', grupoId: 'g1', poligonoId: 'p1', fecha: '2026-03-02', horaInicio: '08:50', inicio: '2026-03-02T08:50:03', fin: '2026-03-02T09:55:21', archivo: 'alfa_0203.gpx', agente: 'Valentina Paz', cargado: '02/03/2026 10:15', notas: 'Repaso del borde sur.', puntos: barrido(P.s1.map(p => [p[0] - 0.0004, p[1]]), 0.35, 6, 11), visible: true },
    { id: 't3', etiqueta: 'Bravo — Mañana', grupoId: 'g2', poligonoId: 'p2', fecha: '2026-03-02', horaInicio: '08:55', inicio: '2026-03-02T08:55:30', fin: '2026-03-02T11:10:48', archivo: 'bravo_0203_am.gpx', agente: 'Ramiro Sosa', cargado: '02/03/2026 11:30', notas: 'Reporte de media mañana.', puntos: barrido(P.s2, 0.5, 16, 5), visible: true },
  ];

  const puntos = [
    { id: 'i1', visible: true, tipo: 'hallazgo', nombre: 'Prenda roja', lat: -31.9742, lng: -64.9205, descripcion: 'Campera roja talle M', detalle: 'Encontrada por Grupo Bravo a 30 m del sendero, 10:42 h. Coincide con la vestimenta del objetivo.', fotos: 0 },
    { id: 'i2', visible: true, tipo: 'poi', nombre: 'Refugio abandonado', lat: -31.9868, lng: -64.9395, descripcion: 'Puesto de piedra sin techo', detalle: '', fotos: 0 },
    { id: 'i3', visible: true, tipo: 'poi', nombre: 'Cruce de arroyo', lat: -31.9765, lng: -64.9345, descripcion: 'Vado con piedras sueltas', detalle: 'Peligroso con lluvia.', fotos: 0 },
  ];

  window.Geo = Geo;
  window.MapaData = {
    barrido,
    centro: [-31.981, -64.929],
    operativo: { nombre: 'Búsqueda Cerro Champaquí', estado: 'activo', ubicacion: 'Cerro Champaquí, Córdoba', fechaInicio: '28/2/2026', dia: 3, clima: { temperatura: 14, descripcion: 'Parcialmente nublado' } },
    usuario: { nombre: 'Miguel', apellido: 'Giménez', rol: 'coordinador', email: 'mgimenez@duar.gob.ar' },
    puntoCero: { lat: -31.9812, lng: -64.9262, actualizado: '28/2/2026 18:20', descripcion: 'Último punto de avistamiento (LSP). Estacionamiento del sendero al Champaquí.' },
    instalaciones: [
      { id: 's1', tipo: 'puestoComando', nombre: 'Puesto de Comando', lat: -31.9965, lng: -64.9080, notas: 'Mesa coordinadora y camioneta de comunicaciones.', responsable: 'Miguel Giménez', visible: true },
      { id: 's2', tipo: 'base', nombre: 'Base', lat: -31.9992, lng: -64.9030, notas: 'Vehículos, combustible y equipamiento.', responsable: '', visible: true },
      { id: 's3', tipo: 'helipunto', nombre: 'Helipunto', lat: -31.9880, lng: -64.9150, notas: 'Claro de 30 × 30 m, apto helicóptero policial.', responsable: '', visible: true },
      { id: 's4', tipo: 'espera', nombre: 'Área de Espera', lat: -31.9950, lng: -64.9125, notas: 'Recursos disponibles para asignar.', responsable: '', visible: true },
    ],
    grupos, poligonos, trazas, puntos,
    paletaRadios: ['#0891B2', '#0D9488', '#DB2777', '#7C3AED', '#EA580C', '#475569'],
    radios: [
      { id: 'r1', km: 0.5, color: '#0891B2', visible: true },
      { id: 'r2', km: 1, color: '#0D9488', visible: true },
      { id: 'r3', km: 2, color: '#DB2777', visible: true },
      { id: 'r4', km: 4, color: '#7C3AED', visible: true },
    ],
    bases: [
      { id: 'politico', label: 'Político', icon: 'map', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap' },
      { id: 'fisico', label: 'Físico', icon: 'mountain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '&copy; OpenTopoMap (CC-BY-SA)' },
      { id: 'satelital', label: 'Satelital', icon: 'satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri' },
    ],
  };
})();
