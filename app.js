/* =====================================================================
   app.js — lógica de la página de donación
   No hace falta editar este archivo: las claves van en config.js y los textos en textos.js
   ===================================================================== */
'use strict';

// =====================================================================
// CONSTANTES Y CONFIGURACIÓN
// =====================================================================

// Zonas en el orden en que se muestran (deben coincidir EXACTAMENTE con la columna "zona" de la base de datos)
const ZONAS = ['CAPITAL', 'NORTE', 'SUR', 'ESTE', 'OESTE'];

// Nombre con el que se guarda la reserva en el navegador
const CLAVE_LOCAL = 'reserva-donacion-sangre';

// Columnas de franjas que se piden al servidor (solo las necesarias)
const COLUMNAS_FRANJA = 'id,hospital_id,fecha,hora,capacidad,ocupados,max_espera';

// Ancho fijo de cada hospital en la tabla (columna hora + columna plazas = 250 px)
const ANCHO_HORA = 112;
const ANCHO_PLAZAS = 138;

// Textos por defecto, por si falta alguno en textos.js
const TEXTOS_POR_DEFECTO = {
  titulo: 'Donación de sangre',
  banner: { imagen: '', mostrarHueco: true },
  faldon: { imagen: '', mostrarHueco: true },
  instruccionesTitulo: 'Instrucciones',
  instruccionesHTML: '',
  etiquetaDestacado: '¡Se necesitan muchos donantes!',
  avisoYaReservado: 'Ya has hecho tu reserva desde este navegador. No es posible hacer otra más desde aquí.',
  notaVerRegistro: 'Solo podrás consultar: desde este navegador no se puede hacer otra reserva.',
  textoEsperaParcial: 'De ellas: {plaza} con plaza y {espera} en lista de espera.',
  textoEsperaTotal: 'La franja estaba completa: estáis en lista de espera.',
  importanteHTML: '',
  totalesTitulo: 'Así va la convocatoria',
  tituloPestana: 'Donación de sangre',
  textoLiberar: 'Si te has equivocado y quieres liberar tu espacio, escribe tu número de reserva y pulsa el botón "Liberar mi espacio".',
  notaCodigo: 'Copia o apunta este código: lo necesitarás si quieres liberar tu plaza.',
  textoCompartir: 'Únete a la donación de sangre de la huelga educativa:',
  totalesEtiquetas: { total: 'personas apuntadas', plaza: 'con plaza', espera: 'en lista de espera' },
  textoZonaSinFranjas: 'No hay franjas disponibles para donar en la zona {zona} para esta fecha.',
};

// Une los textos por defecto con los de textos.js (los de textos.js tienen prioridad)
const TEXTOS = Object.assign({}, TEXTOS_POR_DEFECTO, window.TEXTOS || {});

// Lee la configuración de config.js (o un objeto vacío si no existe)
const CONFIG = Object.assign({ INTERVALO_SEGUNDOS: 15 }, window.CONFIG || {});

// Comprueba que config.js existe y tiene las claves rellenas
const CONFIG_OK = !!(window.CONFIG && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY &&
                     !CONFIG.SUPABASE_URL.includes('TU-PROYECTO'));

// Crea el cliente de Supabase solo si la configuración es válida
const db = CONFIG_OK ? supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY) : null;

// Estado de la página: aquí se guarda todo lo cargado y elegido
const estado = {
  hospitales: new Map(),      // id → datos del hospital
  ajustes: { max_por_reserva: 4, edicion: 1 }, // ajustes del servidor
  fechas: [],                 // días con donación
  fecha: null,                // día elegido
  zona: null,                 // zona elegida
  franjasFecha: [],           // franjas del día elegido (todas las zonas)
  destacados: new Map(),      // id de hospital destacado el día elegido → { hora_ini_destacado, hora_fin_destacado }
  resumen: null,              // totales generales
  franjaPendiente: null,      // franja a la espera de confirmación
  cantidad: 1,                // personas elegidas en la confirmación
  haySesion: false,           // true si este navegador ya superó el captcha
  tokenCaptcha: null,         // token del captcha resuelto
  widgetCaptcha: null,        // identificador del captcha dibujado
  reserva: null,              // reserva de este navegador (si existe)
  reservando: false,          // evita dobles clics
  temporizador: null,         // actualización periódica
};

// =====================================================================
// UTILIDADES
// =====================================================================

// Atajo para buscar un elemento por su id
const $ = (id) => document.getElementById(id);

// Crea un elemento HTML con propiedades e hijos (usa textContent: seguro ante código malicioso)
function crear(etiqueta, props = {}, hijos = []) {
  // Crea el elemento vacío
  const el = document.createElement(etiqueta);
  // Copia las propiedades (className, textContent, href, disabled…)
  Object.assign(el, props);
  // Añade los hijos (texto o elementos), ignorando los vacíos
  for (const hijo of [].concat(hijos)) if (hijo !== null && hijo !== undefined) el.append(hijo);
  // Devuelve el elemento listo
  return el;
}

// Sustituye {marcas} de un texto por valores: rellenar('{a} y {b}', {a:1, b:2}) → '1 y 2'
function rellenar(plantilla, valores) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => (clave in valores ? valores[clave] : ''));
}

// Formatea un número con separador de miles: 1234 → "1.234"
function numero(n) {
  return Number(n || 0).toLocaleString('es-ES');
}

// "1 persona" / "3 personas"
function textoPersonas(n) {
  return `${n} ${n === 1 ? 'persona' : 'personas'}`;
}

// "1 plaza" / "3 plazas"
function textoPlazas(n) {
  return `${n} ${n === 1 ? 'plaza' : 'plazas'}`;
}

// Convierte "2026-11-05" en "Jueves, 5 de noviembre"
function formatearFecha(fecha) {
  // Se usa mediodía para evitar saltos de día por zona horaria
  const d = new Date(fecha + 'T12:00:00');
  // Formatea en español
  const texto = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  // Primera letra en mayúscula
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "09:00:00" → "09:00"
function horaCorta(hora) {
  return hora.slice(0, 5);
}

// Hora de fin de una franja (siempre 1 hora después)
function horaFin(hora) {
  // Separa horas y minutos
  const [h, m] = hora.split(':').map(Number);
  // Suma una hora y formatea con dos dígitos
  return String((h + 1) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// "09:00–10:00"
function rangoHora(hora) {
  return `${horaCorta(hora)}–${horaFin(hora)}`;
}

// Plazas libres de una franja (nunca negativas)
function libres(f) {
  return Math.max(0, f.capacidad - f.ocupados);
}

// Personas apuntadas por encima de la capacidad (lista de espera)
function extra(f) {
  return Math.max(0, f.ocupados - f.capacidad);
}

// ¿La franja tiene lista de espera? (max_espera: 0 = no; -1 = sin límite; N = máximo N)
function tieneEspera(f) {
  return !!f.max_espera;
}

// Hueco que queda en lista de espera (0 si no hay lista; Infinity si no tiene límite)
function huecoEspera(f) {
  if (f.max_espera === -1) return Infinity;
  if (!f.max_espera) return 0;
  return Math.max(0, f.max_espera - extra(f));
}

// Personas con plaza (nunca más que la capacidad)
function conPlaza(f) {
  return Math.min(f.ocupados, f.capacidad);
}

// Máximo de personas que aún admite una franja (plazas libres + hueco de espera)
function admitidas(f) {
  return libres(f) + huecoEspera(f);
}

// Estado visual de una franja (semáforo): libre (verde), espera (naranja, queda lista de espera) o cerrada (roja, no cabe nadie)
function estadoFranja(f) {
  if (libres(f) > 0) return 'libre';
  if (huecoEspera(f) > 0) return 'espera';
  return 'cerrada';
}

// Suma apuntadas, plazas y extra de una lista de franjas
function totales(lista) {
  return lista.reduce((t, f) => ({
    apuntadas: t.apuntadas + f.ocupados,
    plazas: t.plazas + f.capacidad,
    extra: t.extra + extra(f),
  }), { apuntadas: 0, plazas: 0, extra: 0 });
}

// Lee todas las filas de una consulta en bloques de 1000 (límite por petición de Supabase)
async function leerTodo(crearConsulta) {
  // Tamaño de bloque y acumulador
  const TAM = 1000;
  let desde = 0;
  let filas = [];
  // Pide bloques hasta que llegue uno incompleto
  while (true) {
    const { data, error } = await crearConsulta().range(desde, desde + TAM - 1);
    if (error) throw error;
    filas = filas.concat(data);
    if (data.length < TAM) return filas;
    desde += TAM;
  }
}

// =====================================================================
// CARGA DE DATOS DESDE SUPABASE
// =====================================================================

// Carga los ajustes generales (máximo por reserva, límite de lista de espera, edición)
async function cargarAjustes() {
  const { data, error } = await db.from('ajustes').select('max_por_reserva,edicion').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (data) estado.ajustes = data;
}

// Carga todos los hospitales
async function cargarHospitales() {
  const filas = await leerTodo(() =>
    db.from('hospitales').select('id,nombre,zona,direccion,maps_url').order('id'));
  estado.hospitales = new Map(filas.map(h => [h.id, h]));
}

// Carga los días con donación (función SQL fechas_campania)
async function cargarFechas() {
  const { data, error } = await db.rpc('fechas_campania');
  if (error) throw error;
  estado.fechas = data.map(fila => fila.fecha);
}

// Carga las franjas y los hospitales destacados del día elegido (a la vez)
async function cargarDia() {
  // Si no hay día elegido, no hace nada
  if (!estado.fecha) return;
  // Guarda el día pedido para descartar respuestas que lleguen tarde
  const fecha = estado.fecha;
  // Lanza las dos consultas en paralelo
  const [franjas, destacados] = await Promise.all([
    leerTodo(() => db.from('franjas').select(COLUMNAS_FRANJA).eq('fecha', fecha).order('id')),
    leerTodo(() => db.from('destacados').select('hospital_id,hora_ini_destacado,hora_fin_destacado').eq('fecha', fecha).order('hospital_id')),
  ]);
  // Solo guarda si el usuario no ha cambiado de día mientras tanto
  if (fecha !== estado.fecha) return;
  estado.franjasFecha = franjas;
  estado.destacados = new Map(destacados.map(d => [d.hospital_id, d]));
}

// Carga los totales generales (función SQL resumen_global)
async function cargarResumen() {
  const { data, error } = await db.rpc('resumen_global');
  if (error) throw error;
  estado.resumen = data;
}

// Pregunta al servidor si la sesión de este navegador ya tiene una reserva
async function cargarMiReserva() {
  const { data, error } = await db.rpc('mi_reserva');
  if (error) throw error;
  return data;
}

// =====================================================================
// TEXTOS, BANNER Y FALDÓN
// =====================================================================

// Coloca en la página todos los textos de textos.js
function aplicarTextos() {
  // Título de la pestaña y de la página (si está vacío, se oculta y la pestaña usa un nombre por defecto)
  document.title = TEXTOS.titulo || TEXTOS.tituloPestana || 'Donación de sangre';
  $('titulo').textContent = TEXTOS.titulo;
  $('titulo').hidden = !TEXTOS.titulo;
  // Instrucciones (HTML de confianza: lo escribes tú en textos.js)
  $('instrucciones-titulo').textContent = TEXTOS.instruccionesTitulo;
  $('instrucciones-texto').innerHTML = TEXTOS.instruccionesHTML;
  // Avisos de "ya reservado"
  $('texto-ya-reservado').textContent = TEXTOS.avisoYaReservado;
  $('nota-ver-registro').textContent = TEXTOS.notaVerRegistro;
  // Aviso importante de la pantalla final
  $('final-importante').innerHTML = TEXTOS.importanteHTML;
  // Caja "Liberar mi espacio"
  $('texto-liberar').textContent = TEXTOS.textoLiberar;
  // Nota bajo el código de reserva
  $('nota-codigo').textContent = TEXTOS.notaCodigo;
  // Botones de compartir por WhatsApp que haya en los textos (<a data-whatsapp>)
  prepararCompartir();
  // Banner y faldón
  pintarBanner('banner', TEXTOS.banner, 'Espacio para el banner');
  pintarBanner('faldon', TEXTOS.faldon, 'Espacio para el faldón');
}

// Dibuja un banner o faldón: la imagen (con enlace opcional) o un hueco reservado
function pintarBanner(id, datos, textoHueco) {
  // Contenedor y datos (con valores por defecto)
  const cont = $(id);
  const d = Object.assign({ imagen: '', enlace: '', alt: '', mostrarHueco: true }, datos || {});
  // Etiqueta accesible
  cont.setAttribute('aria-label', d.alt || textoHueco);
  // Sin imagen: hueco gris (o nada)
  if (!d.imagen) {
    cont.hidden = !d.mostrarHueco;
    cont.classList.add('hueco');
    cont.textContent = textoHueco;
    return;
  }
  // Con imagen: la muestra, envuelta en un enlace si lo hay
  const img = crear('img', { src: d.imagen, alt: d.alt || '' });
  cont.classList.remove('hueco');
  cont.hidden = false;
  cont.replaceChildren(d.enlace ? crear('a', { href: d.enlace, target: '_blank', rel: 'noopener' }, img) : img);
}

// =====================================================================
// VISTA PRINCIPAL: FECHA, ZONAS Y TABLA
// =====================================================================

// Rellena el desplegable de fechas (solo días con donación)
function pintarSelectorFecha() {
  const sel = $('selector-fecha');
  sel.replaceChildren(...estado.fechas.map(f => crear('option', { value: f, textContent: formatearFecha(f) })));
  sel.value = estado.fecha;
  sel.disabled = estado.fechas.length < 1;
}

// Zonas que tienen al menos un hospital en la base de datos (en el orden fijo)
function zonasDisponibles() {
  const conHospital = new Set([...estado.hospitales.values()].map(h => h.zona));
  return ZONAS.filter(z => conHospital.has(z));
}

// Dibuja los botones de opción de las zonas (una sola vez al arrancar)
function pintarZonas() {
  // Zonas con hospital
  const zonas = zonasDisponibles();
  // Si la zona elegida no existe, elige la primera (CAPITAL si existe)
  if (!zonas.includes(estado.zona)) estado.zona = zonas[0] || null;
  // Oculta el bloque si no hay ninguna
  $('zonas').hidden = !zonas.length;
  // Crea un botón de opción por zona
  $('opciones-zona').replaceChildren(...zonas.map(z => {
    // Botón de opción
    const input = crear('input', { type: 'radio', name: 'zona', value: z, checked: z === estado.zona });
    // Al elegirlo, cambia la zona y redibuja
    input.addEventListener('change', () => { estado.zona = z; pintarDia(); });
    // Contador "apuntadas/plazas" de esa zona (se rellena después)
    const contador = crear('small', { className: 'contador-zona' });
    contador.dataset.zona = z;
    // Etiqueta completa
    return crear('label', { className: 'zona-opcion' }, [input, crear('span', {}, [z, contador])]);
  }));
}

// Franjas del día elegido que pertenecen a una zona
function franjasDeZona(zona) {
  return estado.franjasFecha.filter(f => {
    const h = estado.hospitales.get(f.hospital_id);
    return h && h.zona === zona;
  });
}

// Actualiza los contadores "apuntadas/plazas" de cada zona
function pintarContadoresZona() {
  document.querySelectorAll('.contador-zona').forEach(el => {
    const t = totales(franjasDeZona(el.dataset.zona));
    el.textContent = t.plazas ? `${numero(t.apuntadas)}/${numero(t.plazas)}` : 'sin franjas';
  });
}

// Escribe el resumen de la zona elegida en el día elegido
function pintarResumenZona() {
  const p = $('resumen-zona');
  // Sin zona o sin día, vacío
  if (!estado.zona || !estado.fecha) { p.replaceChildren(); return; }
  // Totales de la zona
  const t = totales(franjasDeZona(estado.zona));
  // "CAPITAL, jueves 5 de noviembre: 340 personas apuntadas / 500 plazas (incluye 20 en lista de espera)"
  p.replaceChildren(
    crear('strong', { textContent: `${estado.zona}` }),
    `, ${formatearFecha(estado.fecha).toLowerCase()}: `,
    crear('strong', { textContent: numero(t.apuntadas) }),
    ' personas apuntadas / ',
    crear('strong', { textContent: numero(t.plazas) }),
    ' plazas',
    t.extra ? ` (incluye ${numero(t.extra)} en lista de espera)` : '',
  );
}

// Dibuja la tabla de la zona elegida
function pintarTabla() {
  // Contenedor
  const cont = $('tabla-zona');

  // Casos sin datos
  if (!estado.fechas.length) { cont.replaceChildren(crear('p', { className: 'vacio', textContent: 'Todavía no hay fechas con donación.' })); return; }
  if (!estado.zona) { cont.replaceChildren(crear('p', { className: 'vacio', textContent: 'No hay hospitales asignados a ninguna zona.' })); return; }

  // Agrupa las franjas de la zona por hospital
  const porHospital = new Map();
  for (const f of franjasDeZona(estado.zona)) {
    if (!porHospital.has(f.hospital_id)) porHospital.set(f.hospital_id, []);
    porHospital.get(f.hospital_id).push(f);
  }
  // Ordena las franjas de cada hospital por hora
  for (const lista of porHospital.values()) lista.sort((a, b) => a.hora.localeCompare(b.hora));

  // Hospitales: primero los destacados, después el resto; dentro de cada grupo, por nombre
  const hospitales = [...porHospital.keys()].map(id => estado.hospitales.get(id)).sort((a, b) => {
    const da = estado.destacados.has(a.id), dbb = estado.destacados.has(b.id);
    return da === dbb ? a.nombre.localeCompare(b.nombre, 'es') : (da ? -1 : 1);
  });

  // Si la zona no tiene franjas ese día
  if (!hospitales.length) {
    // Mensaje editable en textos.js (textoZonaSinFranjas); {zona} se sustituye por el nombre de la zona
    cont.replaceChildren(crear('p', { className: 'sin-franjas', textContent: rellenar(TEXTOS.textoZonaSinFranjas, { zona: estado.zona }) }));
    return;
  }

  // ¿Modo solo consulta? (este navegador ya reservó)
  const soloVer = !!estado.reserva;

  // Fila de cabecera: cada hospital ocupa dos columnas
  const cabecera = crear('tr');
  for (const h of hospitales) {
    // ¿Es destacado este día?
    const dest = estado.destacados.has(h.id);
    // Totales del hospital en el día
    const t = totales(porHospital.get(h.id));
    // Celda que abarca 2 columnas
    const th = crear('th', { colSpan: 2, scope: 'colgroup', className: dest ? 'destacado' : '' });
    // Etiqueta de destacado
    if (dest) th.append(crear('span', { className: 'etiqueta-destacado', textContent: TEXTOS.etiquetaDestacado }));
    // Nombre
    th.append(crear('span', { className: 'nombre-hospital', textContent: h.nombre }));
    // Enlace a Google Maps
    if (h.maps_url) th.append(crear('a', { href: h.maps_url, target: '_blank', rel: 'noopener', className: 'enlace-mapa', textContent: 'Cómo llegar' }));
    // Totales del día: apuntadas y en espera
    th.append(crear('div', { className: 'totales-hospital' }, [
      crear('span', {}, ['Apuntadas hoy: ', crear('strong', { textContent: numero(t.apuntadas) })]),
      crear('span', {}, ['En espera: ', crear('strong', { textContent: numero(t.extra) })]),
    ]));
    cabecera.append(th);
  }

  // Cuerpo: tantas filas como franjas tenga el hospital con más franjas
  const cuerpo = crear('tbody');
  const maxFilas = Math.max(...hospitales.map(h => porHospital.get(h.id).length));
  for (let i = 0; i < maxFilas; i++) {
    const tr = crear('tr');
    for (const h of hospitales) {
      // Franja i-ésima de este hospital (puede no existir)
      const f = porHospital.get(h.id)[i];
      // Sin franja: dos celdas vacías para que la tabla cuadre
      if (!f) { tr.append(crear('td', { className: 'vacia' }), crear('td', { className: 'vacia' })); continue; }
      // Clase de color: franja de concentración (muy visible) o, si no, columna de hospital destacado
      const claseDest = franjaDestacada(f) ? ' franja-destacada' : (estado.destacados.has(h.id) ? ' destacado' : '');
      // Estado visual y si se puede pulsar
      const est = estadoFranja(f);
      const pulsable = !soloVer && est !== 'cerrada';
      // Celda de la hora
      const tdHora = crear('td', { className: 'hora' + claseDest, textContent: rangoHora(f.hora) });
      // Botón con "reservas con plaza / plazas" y, si la franja tiene lista de espera, "+N en espera"
      const ex = extra(f);
      const boton = crear('button', {
        type: 'button',
        className: `plazas ${est}` + (soloVer ? ' solo-ver' : ''),
        disabled: !pulsable,
        title: soloVer ? 'Ya has hecho tu reserva desde este navegador'
             : est === 'libre' ? 'Reservar en esta franja'
             : est === 'espera' ? 'Franja completa: apuntarse en lista de espera'
             : 'Franja completa',
      }, [
        crear('span', { className: 'cifra', textContent: `${conPlaza(f)}/${f.capacidad}` }),
        tieneEspera(f) ? crear('span', { className: 'en-espera' + (ex ? ' hay' : ''), textContent: `+${ex} en espera` }) : null,
      ]);
      // Al pulsar, pide confirmación
      if (pulsable) {
        boton.addEventListener('click', () => pedirConfirmacion(f));
        tdHora.style.cursor = 'pointer';
        tdHora.addEventListener('click', () => pedirConfirmacion(f));
      }
      // Añade las dos celdas
      tr.append(tdHora, crear('td', { className: claseDest.trim() }, boton));
    }
    cuerpo.append(tr);
  }

  // Anchos fijos: dos columnas por hospital (hora y plazas), sea cual sea el número de hospitales
  const columnas = crear('colgroup', {}, hospitales.flatMap(() => [
    crear('col', { style: `width:${ANCHO_HORA}px` }),
    crear('col', { style: `width:${ANCHO_PLAZAS}px` }),
  ]));

  // Monta la tabla con desplazamiento horizontal y sustituye la anterior de golpe
  const tabla = crear('table', { className: 'tabla-zona' }, [columnas, crear('thead', {}, cabecera), cuerpo]);
  tabla.style.width = `${hospitales.length * (ANCHO_HORA + ANCHO_PLAZAS)}px`;
  cont.replaceChildren(crear('div', { className: 'tabla-scroll' }, tabla));
}

// Redibuja todo lo que depende del día y la zona
function pintarDia() {
  pintarContadoresZona();
  pintarResumenZona();
  pintarTabla();
}

// Dibuja el recuadro de totales generales (antes de la tabla)
function pintarTotalGlobal() {
  const r = estado.resumen;
  if (!r) return;
  // Etiquetas (editables en textos.js) y cifras
  const e = TEXTOS.totalesEtiquetas;
  const celdas = [[e.total, r.apuntadas], [e.plaza, r.en_plaza], [e.espera, r.en_espera]];
  // Tabla vertical: título arriba y una fila por cifra (cifra grande y su etiqueta debajo)
  const filas = celdas.map(([etiqueta, valor]) => crear('tr', {},
    crear('td', {}, [crear('strong', { textContent: numero(valor) }), crear('span', { textContent: etiqueta })])));
  $('totales').replaceChildren(
    crear('thead', {}, crear('tr', {}, crear('th', { textContent: TEXTOS.totalesTitulo }))),
    crear('tbody', {}, filas),
  );
  $('totales').hidden = false;
}

// =====================================================================
// CONFIRMACIÓN: NÚMERO DE PERSONAS Y CAPTCHA
// =====================================================================

// Abre la ventana "¿Quieres reservar en…?"
async function pedirConfirmacion(franja) {
  // Nunca se permite si este navegador ya reservó
  if (!franja || estado.reserva) return;
  // Hospital de la franja
  const h = estado.hospitales.get(franja.hospital_id);
  // Guarda la franja y empieza con 1 persona
  estado.franjaPendiente = franja;
  estado.cantidad = 1;
  // Pregunta
  $('texto-confirmar').textContent =
    `¿Quieres reservar en ${h.nombre}, el ${formatearFecha(franja.fecha).toLowerCase()}, de ${rangoHora(franja.hora)}?`;
  // Botones de cantidad y avisos
  pintarCantidades();
  $('error-confirmar').textContent = '';
  // Abre la ventana y prepara el captcha
  $('dialogo-confirmar').showModal();
  await prepararCaptcha();
}

// Dibuja los botones de número de personas y explica si alguien irá a lista de espera
function pintarCantidades() {
  // Franja y máximos
  const f = estado.franjaPendiente;
  const maxAjuste = estado.ajustes.max_por_reserva;
  const maxFranja = Math.min(maxAjuste, admitidas(f));
  // Ajusta la cantidad si ya no cabe
  if (estado.cantidad > maxFranja) estado.cantidad = Math.max(1, maxFranja);
  // Botones 1..máximo real de esta franja (nunca más de los que caben, ni más del máximo por reserva)
  $('cantidades').replaceChildren(...Array.from({ length: Math.max(0, maxFranja) }, (_, i) => {
    const n = i + 1;
    const b = crear('button', { type: 'button', className: 'cantidad', textContent: String(n) });
    b.setAttribute('aria-pressed', String(n === estado.cantidad));
    b.addEventListener('click', () => { estado.cantidad = n; pintarCantidades(); });
    return b;
  }));
  // Reparto entre plaza y lista de espera
  const l = libres(f);
  const enPlaza = Math.min(estado.cantidad, l);
  const enEspera = estado.cantidad - enPlaza;
  // Texto de ayuda
  $('nota-cantidad').textContent =
    maxFranja < 1 ? 'Esta franja se acaba de cerrar. Elige otra, por favor.'
    : l === 0 ? 'Esta franja está completa: os apuntaréis en lista de espera.'
    : enEspera > 0 ? `Solo quedan ${textoPlazas(l)} libres: ${enPlaza} con plaza y ${enEspera} en lista de espera.`
    : maxFranja < maxAjuste ? `En esta franja caben como máximo ${textoPersonas(maxFranja)}.`
    : `Máximo ${textoPersonas(maxAjuste)} por reserva.`;
  // Revisa el botón "Sí, reservar"
  actualizarBotonSi();
}

// Espera a que cargue el script de Turnstile
function esperarTurnstile() {
  return new Promise(resolver => {
    const comprobar = () => (window.turnstile ? resolver() : setTimeout(comprobar, 100));
    comprobar();
  });
}

// Muestra el captcha solo si este navegador todavía no lo ha superado
async function prepararCaptcha() {
  // ¿Hay sesión anónima guardada?
  const { data } = await db.auth.getSession();
  estado.haySesion = !!data.session;
  const cont = $('captcha');
  // Con sesión no hace falta captcha
  if (estado.haySesion) { cont.hidden = true; actualizarBotonSi(); return; }
  // Sin sesión: lo muestra
  cont.hidden = false;
  estado.tokenCaptcha = null;
  actualizarBotonSi();
  await esperarTurnstile();
  // Si ya estaba dibujado, lo reinicia; si no, lo dibuja
  if (estado.widgetCaptcha !== null) { turnstile.reset(estado.widgetCaptcha); return; }
  estado.widgetCaptcha = turnstile.render('#captcha', {
    // sitekey: clave pública de Turnstile
    sitekey: CONFIG.TURNSTILE_SITE_KEY,
    // language: idioma
    language: 'es',
    // callback: al superarlo guarda el token
    callback: (token) => { estado.tokenCaptcha = token; actualizarBotonSi(); },
    // expired-callback: el token caduca a los pocos minutos
    'expired-callback': () => { estado.tokenCaptcha = null; actualizarBotonSi(); },
    // error-callback: fallo al cargar
    'error-callback': () => {
      estado.tokenCaptcha = null;
      $('error-confirmar').textContent = 'No se ha podido cargar la verificación. Recarga la página.';
      actualizarBotonSi();
    },
  });
}

// Reinicia el captcha tras un fallo (cada token solo vale una vez)
function reiniciarCaptcha() {
  estado.tokenCaptcha = null;
  if (window.turnstile && estado.widgetCaptcha !== null) turnstile.reset(estado.widgetCaptcha);
}

// Activa "Sí, reservar" solo si no se está enviando, hay captcha (o sesión) y caben las personas
function actualizarBotonSi() {
  const f = estado.franjaPendiente;
  const caben = !!f && admitidas(f) >= estado.cantidad;
  const verificado = estado.haySesion || !!estado.tokenCaptcha;
  $('btn-si').disabled = estado.reservando || !caben || !verificado;
}

// Tras recargar datos, actualiza la franja que se está confirmando
function refrescarPendiente() {
  if (!estado.franjaPendiente || !$('dialogo-confirmar').open) return;
  const nueva = estado.franjasFecha.find(f => f.id === estado.franjaPendiente.id);
  if (nueva) { estado.franjaPendiente = nueva; pintarCantidades(); }
}

// =====================================================================
// RESERVA
// =====================================================================

// Envía la reserva al servidor
async function confirmarReserva() {
  // Evita dobles clics
  if (estado.reservando || !estado.franjaPendiente) return;
  estado.reservando = true;
  $('btn-si').textContent = 'Reservando…';
  $('error-confirmar').textContent = '';
  actualizarBotonSi();

  // Respuesta
  let data = null, error = null;
  try {
    // Si no hay sesión, crea una sesión anónima; Supabase verifica el captcha en su servidor
    if (!estado.haySesion) {
      const r = await db.auth.signInAnonymously({ options: { captchaToken: estado.tokenCaptcha } });
      if (r.error) throw { message: 'CAPTCHA', detalle: r.error };
      estado.haySesion = true;
      $('captcha').hidden = true;
    }
    // Llama a la función SQL "reservar"
    ({ data, error } = await db.rpc('reservar', { p_franja: estado.franjaPendiente.id, p_cantidad: estado.cantidad }));
  } catch (e) {
    error = e;
  }
  estado.reservando = false;
  $('btn-si').textContent = 'Sí, reservar';

  // Error: lo explica
  if (error) { await gestionarError(error); actualizarBotonSi(); return; }

  // Éxito
  terminarConReserva(data, false);
}

// Explica cada tipo de error
async function gestionarError(error) {
  const msg = String(error.message || '');
  console.error(error.detalle || error);

  // Ya había una reserva con esta sesión: la recupera
  if (msg.includes('YA_RESERVADO')) {
    try { const mia = await cargarMiReserva(); if (mia) { terminarConReserva(mia, true); return; } } catch (e) { console.error(e); }
    $('error-confirmar').textContent = 'Ya hay una reserva hecha desde este navegador.';
    return;
  }
  // No caben (lista de espera llena) o la franja ya no está disponible
  if (msg.includes('SIN_PLAZAS') || msg.includes('FRANJA_NO_DISPONIBLE')) {
    $('error-confirmar').textContent = 'Esta franja ya no admite a tantas personas. Elige menos personas u otra hora.';
    await actualizar();
    return;
  }
  // Número de personas fuera del máximo (por si se cambió el ajuste)
  if (msg.includes('CANTIDAD_INVALIDA')) {
    try { await cargarAjustes(); pintarCantidades(); } catch (e) { console.error(e); }
    $('error-confirmar').textContent = `El máximo es ${textoPersonas(estado.ajustes.max_por_reserva)} por reserva.`;
    return;
  }
  // Captcha no verificado
  if (msg === 'CAPTCHA') {
    $('error-confirmar').textContent = 'No se ha podido verificar que eres una persona. Vuelve a intentarlo.';
    reiniciarCaptcha();
    return;
  }
  // Otro problema
  $('error-confirmar').textContent = 'No se ha podido completar la reserva. Inténtalo de nuevo en unos segundos.';
}

// Guarda la reserva, cierra la ventana y muestra la pantalla final
function terminarConReserva(reserva, yaExistia) {
  guardarReserva(reserva);
  if ($('dialogo-confirmar').open) $('dialogo-confirmar').close();
  mostrarFinal(reserva, yaExistia);
}

// Guarda la reserva en el navegador
function guardarReserva(reserva) {
  estado.reserva = reserva;
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(reserva)); } catch (e) { /* modo privado: se ignora */ }
}

// Lee la reserva guardada (o null)
function leerReserva() {
  try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL)); } catch (e) { return null; }
}

// Borra la reserva guardada
function borrarReserva() {
  estado.reserva = null;
  try { localStorage.removeItem(CLAVE_LOCAL); } catch (e) { /* se ignora */ }
}

// Busca si este navegador ya tiene reserva válida (en el navegador o en el servidor)
async function buscarReservaPrevia() {
  // Reserva guardada en el navegador
  const local = leerReserva();
  // Si es de la edición actual, vale
  if (local && local.edicion === estado.ajustes.edicion) return local;
  // Si es de una edición anterior (se hizo un reset), se descarta junto con la sesión
  if (local) {
    borrarReserva();
    try { await db.auth.signOut({ scope: 'local' }); } catch (e) { /* se ignora */ }
    return null;
  }
  // Sin reserva local: si hay sesión, pregunta al servidor
  try {
    const { data } = await db.auth.getSession();
    if (!data.session) return null;
    return await cargarMiReserva();
  } catch (e) {
    console.error(e);
    return null;
  }
}

// =====================================================================
// FRANJAS DE CONCENTRACIÓN, CÓDIGO, LIBERAR Y COMPARTIR
// =====================================================================

// Pasa "HH:MM" o "HH:MM:SS" a minutos desde medianoche
function minutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// ¿La franja se solapa con las horas de concentración de su hospital ese día?
function franjaDestacada(f) {
  // Destacado del hospital (si lo hay) y sus horas
  const d = estado.destacados.get(f.hospital_id);
  if (!d || !d.hora_ini_destacado || !d.hora_fin_destacado) return false;
  // Solape: la franja empieza antes del fin y termina después del inicio
  const ini = minutos(f.hora), fin = ini + 60;
  return ini < minutos(d.hora_fin_destacado) && fin > minutos(d.hora_ini_destacado);
}

// Copia el código de reserva al portapapeles
async function copiarCodigo() {
  const codigo = $('final-codigo').textContent;
  try {
    await navigator.clipboard.writeText(codigo);
    $('btn-copiar-codigo').textContent = '¡Copiado!';
  } catch (e) {
    // Si el navegador no deja copiar, selecciona el texto para copiarlo a mano
    const rango = document.createRange();
    rango.selectNodeContents($('final-codigo'));
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rango);
    $('btn-copiar-codigo').textContent = 'Cópialo a mano';
  }
  setTimeout(() => { $('btn-copiar-codigo').textContent = 'Copiar código'; }, 2500);
}

// Libera una reserva a partir del código escrito en la caja
async function liberarEspacio() {
  // Código escrito (sin espacios, en mayúsculas)
  const codigo = $('codigo-liberar').value.trim().toUpperCase();
  const msg = $('mensaje-liberar');
  msg.className = 'mensaje-liberar';
  // Sin código, avisa
  if (!codigo) { msg.textContent = 'Escribe tu número de reserva.'; return; }
  // Pide confirmación
  if (!window.confirm(`¿Seguro que quieres liberar la reserva ${codigo}? Las plazas quedarán libres para otras personas.`)) return;
  // Llama a la función SQL "liberar"
  $('btn-liberar').disabled = true;
  msg.textContent = 'Liberando…';
  let data = null, error = null;
  try { ({ data, error } = await db.rpc('liberar', { p_codigo: codigo })); } catch (e) { error = e; }
  $('btn-liberar').disabled = false;
  // Error: código inexistente u otro problema
  if (error) {
    if (!String(error.message || '').includes('CODIGO_NO_ENCONTRADO')) console.error(error);
    msg.classList.add('error');
    msg.textContent = String(error.message || '').includes('CODIGO_NO_ENCONTRADO')
      ? 'No existe ninguna reserva con ese número (o ya se liberó). Revisa que esté bien escrito.'
      : 'No se ha podido liberar. Inténtalo de nuevo en unos segundos.';
    return;
  }
  // Éxito: explica qué se ha liberado
  msg.classList.add('ok');
  msg.textContent = `Hecho: ${textoPlazas(data.cantidad)} ${data.cantidad === 1 ? 'liberada' : 'liberadas'} en ${data.hospital}, ` +
                    `${formatearFecha(data.fecha).toLowerCase()} de ${rangoHora(data.hora)}. ¡Gracias por avisar!`;
  $('codigo-liberar').value = '';
  // Si era la reserva de este navegador, la olvida para poder reservar de nuevo
  if (estado.reserva && estado.reserva.codigo === data.codigo) {
    borrarReserva();
    mostrarPrincipal();
  } else {
    actualizar();
  }
}

// Prepara los enlaces de WhatsApp que haya en los textos (<a data-whatsapp>)
function prepararCompartir() {
  // Mensaje: texto de textos.js + dirección de esta página
  const url = location.href.split('#')[0].split('?')[0];
  const mensaje = `${TEXTOS.textoCompartir} ${url}`;
  document.querySelectorAll('[data-whatsapp]').forEach(a => {
    a.href = 'https://wa.me/?text=' + encodeURIComponent(mensaje);
    a.target = '_blank';
    a.rel = 'noopener';
  });
}

// =====================================================================
// CAMBIO DE VISTAS
// =====================================================================

// Muestra las tablas (con aviso de solo consulta si ya se reservó)
function mostrarPrincipal() {
  $('vista-final').hidden = true;
  $('vista-principal').hidden = false;
  $('aviso-ya-reservado').hidden = !estado.reserva;
  pintarDia();
  actualizar();
  iniciarActualizacion();
  window.scrollTo(0, 0);
}

// Muestra la pantalla final con los datos de la reserva
function mostrarFinal(reserva, yaExistia) {
  // Guarda la reserva y deja de actualizar
  estado.reserva = reserva;
  detenerActualizacion();
  // Cambia de vista
  $('vista-principal').hidden = true;
  $('vista-final').hidden = false;
  $('final-ya-reservado').hidden = !yaExistia;
  // Datos, incluido el código de reserva (sirve para liberar la plaza)
  $('final-codigo').textContent = reserva.codigo || '';
  $('final-hospital').textContent = reserva.hospital;
  $('final-direccion').textContent = reserva.direccion;
  $('final-fecha').textContent = formatearFecha(reserva.fecha);
  $('final-hora').textContent = rangoHora(reserva.hora);
  $('final-personas').textContent = textoPersonas(reserva.cantidad || 1);
  // Lista de espera
  const espera = reserva.en_espera || 0;
  const plaza = reserva.en_plaza ?? (reserva.cantidad || 1);
  $('final-espera').hidden = espera === 0;
  $('final-espera').textContent = plaza === 0 ? TEXTOS.textoEsperaTotal
                                : rellenar(TEXTOS.textoEsperaParcial, { plaza, espera });
  // Enlace a Maps
  const mapa = $('final-mapa');
  mapa.hidden = !reserva.maps_url;
  if (reserva.maps_url) mapa.href = reserva.maps_url;
  // Calendario
  $('enlace-google').href = urlGoogleCalendar(reserva);
  window.scrollTo(0, 0);
}

// =====================================================================
// CALENDARIO
// =====================================================================

// Convierte fecha y hora de Madrid en un instante exacto (con horario de verano)
function horaMadridADate(fecha, hora) {
  // Partes de la fecha y la hora
  const [a, m, d] = fecha.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  // Aproximación como si fuera UTC
  const supuesto = Date.UTC(a, m - 1, d, h, mi);
  // Qué hora sería ese instante en Madrid
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(supuesto));
  const v = Object.fromEntries(partes.map(p => [p.type, p.value]));
  // Diferencia Madrid–UTC y corrección
  const desfase = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute) - supuesto;
  return new Date(supuesto - desfase);
}

// Formato de calendario: 20261105T080000Z
function formatoCalendario(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Descripción del evento (sin código de reserva)
function textoDetalles(r) {
  return (r.codigo ? `Código de reserva (para liberarla): ${r.codigo}\n` : '') +
         `Personas: ${r.cantidad || 1}` +
         (r.en_espera ? ` (${r.en_espera} en lista de espera)` : '') +
         `\nHorario orientativo: es posible que haya que esperar.` +
         (r.maps_url ? `\nCómo llegar: ${r.maps_url}` : '');
}

// Enlace de Google Calendar con el evento ya relleno
function urlGoogleCalendar(r) {
  const inicio = horaMadridADate(r.fecha, r.hora);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Donación de sangre – ${r.hospital}`,
    dates: `${formatoCalendario(inicio)}/${formatoCalendario(fin)}`,
    details: textoDetalles(r),
    location: r.direccion,
  });
  return 'https://calendar.google.com/calendar/render?' + params.toString();
}

// Genera y descarga un archivo .ics (Apple Calendar, Outlook…) en el propio navegador
function descargarIcs() {
  const r = estado.reserva;
  if (!r) return;
  // Inicio y fin
  const inicio = horaMadridADate(r.fecha, r.hora);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  // Escapa caracteres especiales del formato .ics
  const esc = (t) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  // Contenido, con aviso 2 horas antes
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Donacion de sangre//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${r.codigo}@donacion-sangre`,
    `DTSTAMP:${formatoCalendario(new Date())}`,
    `DTSTART:${formatoCalendario(inicio)}`,
    `DTEND:${formatoCalendario(fin)}`,
    `SUMMARY:${esc('Donación de sangre – ' + r.hospital)}`,
    `LOCATION:${esc(r.direccion)}`,
    `DESCRIPTION:${esc(textoDetalles(r))}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Donación de sangre', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  // Crea el archivo, lo descarga y libera la memoria
  const url = URL.createObjectURL(new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const enlace = crear('a', { href: url, download: 'donacion-sangre.ics' });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =====================================================================
// ACTUALIZACIÓN PERIÓDICA (POLLING)
// =====================================================================

// Pide los datos nuevos y repinta
async function actualizar() {
  try {
    await Promise.all([cargarDia(), cargarResumen()]);
    pintarDia();
    pintarTotalGlobal();
    refrescarPendiente();
    $('estado-actualizacion').textContent = 'Actualizado a las ' +
      new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    $('estado-actualizacion').textContent = 'Sin conexión, reintentando…';
    console.error(e);
  }
}

// Arranca la actualización cada X segundos (solo con la pestaña visible)
function iniciarActualizacion() {
  detenerActualizacion();
  estado.temporizador = setInterval(() => { if (!document.hidden) actualizar(); }, CONFIG.INTERVALO_SEGUNDOS * 1000);
}

// Detiene la actualización periódica
function detenerActualizacion() {
  clearInterval(estado.temporizador);
  estado.temporizador = null;
}

// =====================================================================
// EVENTOS
// =====================================================================

// Cambio de fecha: recarga la tabla
$('selector-fecha').addEventListener('change', (e) => {
  estado.fecha = e.target.value;
  estado.franjasFecha = [];
  estado.destacados = new Map();
  $('tabla-zona').replaceChildren(crear('p', { className: 'vacio', textContent: 'Cargando ocupación…' }));
  actualizar();
});

// Botones de la ventana de confirmación
$('btn-cancelar').addEventListener('click', () => $('dialogo-confirmar').close());
$('btn-si').addEventListener('click', confirmarReserva);

// Al cerrar la ventana (también con Esc), olvida la franja pendiente
$('dialogo-confirmar').addEventListener('close', () => { estado.franjaPendiente = null; });

// Pantalla final: calendario y volver a las tablas
$('btn-ics').addEventListener('click', descargarIcs);
$('btn-ver-registro').addEventListener('click', mostrarPrincipal);

// Copiar el código de reserva
$('btn-copiar-codigo').addEventListener('click', copiarCodigo);

// Liberar mi espacio (botón y tecla Intro en la caja)
$('btn-liberar').addEventListener('click', liberarEspacio);
$('codigo-liberar').addEventListener('keydown', (e) => { if (e.key === 'Enter') liberarEspacio(); });

// Aviso de las tablas: volver a la reserva
$('btn-volver-final').addEventListener('click', () => mostrarFinal(estado.reserva, true));

// Al volver a la pestaña, actualiza en el momento
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && estado.temporizador) actualizar();
});

// =====================================================================
// ARRANQUE
// =====================================================================

// Prepara la página al abrirla
async function iniciar() {
  // Textos, banner y faldón
  aplicarTextos();

  // Sin configuración válida no se puede seguir
  if (!CONFIG_OK) {
    $('tabla-zona').replaceChildren(crear('p', { className: 'aviso',
      textContent: 'Falta el archivo config.js o no tiene las claves rellenas.' }));
    return;
  }

  // Carga ajustes, hospitales, fechas y totales a la vez
  try {
    await Promise.all([cargarAjustes(), cargarHospitales(), cargarFechas(), cargarResumen()]);
  } catch (e) {
    $('tabla-zona').replaceChildren(crear('p', { className: 'aviso',
      textContent: 'No se han podido cargar los datos. Recarga la página en unos segundos.' }));
    console.error(e);
    return;
  }

  // Diagnóstico en la consola (F12 → Console)
  console.info(`Diagnóstico: ${estado.hospitales.size} hospitales, ${estado.fechas.length} días, zonas: ${zonasDisponibles().join(', ') || 'ninguna'}.`);

  // Prepara fecha y zonas
  estado.fecha = estado.fechas[0] || null;
  pintarSelectorFecha();
  pintarZonas();
  pintarTotalGlobal();

  // Si este navegador ya reservó, muestra la pantalla final; si no, las tablas
  const previa = await buscarReservaPrevia();
  if (previa) { guardarReserva(previa); mostrarFinal(previa, true); }
  else mostrarPrincipal();
}

// Ejecuta el arranque
iniciar();
