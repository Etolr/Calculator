// ============================================================
// sw.js — Service Worker del Tutor Ciberpunk
// ============================================================
//
// ¿QUÉ ES UN SERVICE WORKER?
// Es un script que el navegador ejecuta en SEGUNDO PLANO,
// separado de la página. Actúa como intermediario entre
// la app y la red: puede interceptar peticiones y responder
// desde una caché local, lo que permite usar la app sin internet.
//
// ESTRATEGIA USADA: "Cache-first con network fallback"
//   1. Cuando la app pide un archivo, primero buscamos en caché.
//   2. Si está → lo devolvemos inmediatamente (rápido, funciona offline).
//   3. Si no está → lo pedimos a la red, lo guardamos en caché y lo devolvemos.
//
// CICLO DE VIDA:
//   install  → se ejecuta la primera vez que se registra el SW
//   activate → se ejecuta cuando el SW toma el control (borra cachés viejos)
//   fetch    → se ejecuta en cada petición HTTP de la app
// ============================================================

// Nombre de la caché — cambiarlo fuerza una actualización completa
// cuando el usuario abra la app de nuevo.
const CACHE_NAME = "tutor-ciberpunk-v1";

// Archivos esenciales que queremos guardar en caché desde el inicio.
// Incluye el HTML principal, el JS compilado por Vite, y las fuentes.
// Nota: en producción Vite genera nombres con hash (ej: index-3f8a2c.js),
// así que el SW también cachea por red cualquier archivo que no esté aquí.
const ARCHIVOS_ESENCIALES = [
  "/",
  "/index.html",
  "/manifest.json",
];

// ─── EVENTO: install ─────────────────────────────────────────
// Se ejecuta UNA SOLA VEZ cuando el navegador instala el SW por primera vez.
// Abrimos la caché y guardamos los archivos esenciales.
self.addEventListener("install", (event) => {
  console.log("[SW] Instalando Tutor Ciberpunk v1...");

  // waitUntil le dice al navegador "no termines install hasta que esta
  // promesa se resuelva". Así garantizamos que la caché esté lista.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Guardando archivos esenciales en caché");
      // addAll falla si cualquier archivo no se puede descargar,
      // por eso solo incluimos archivos que sabemos que existen.
      return cache.addAll(ARCHIVOS_ESENCIALES);
    })
  );

  // skipWaiting: activa el nuevo SW inmediatamente sin esperar
  // a que se cierren las pestañas existentes.
  self.skipWaiting();
});

// ─── EVENTO: activate ────────────────────────────────────────
// Se ejecuta cuando el SW toma el control de la app.
// Aquí eliminamos cachés de versiones anteriores para liberar espacio.
self.addEventListener("activate", (event) => {
  console.log("[SW] Activando — limpiando cachés antiguas...");

  event.waitUntil(
    caches.keys().then((nombres) => {
      return Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME) // todas excepto la actual
          .map((nombre) => {
            console.log(`[SW] Eliminando caché antigua: ${nombre}`);
            return caches.delete(nombre);
          })
      );
    })
  );

  // clients.claim hace que este SW controle inmediatamente todas
  // las pestañas abiertas de la app, sin necesidad de recargar.
  self.clients.claim();
});

// ─── EVENTO: fetch ────────────────────────────────────────────
// Se ejecuta en CADA petición HTTP que hace la app.
// Aquí implementamos la estrategia cache-first.
self.addEventListener("fetch", (event) => {
  // Solo interceptamos peticiones GET (no POST, PUT, etc.)
  if (event.request.method !== "GET") return;

  // No interceptamos peticiones a APIs externas (mathjs CDN, KaTeX, etc.)
  // para no romper actualizaciones de librerías.
  const url = new URL(event.request.url);
  const esRecursoPropio = url.origin === self.location.origin;

  // Para recursos externos, simplemente dejamos pasar la petición.
  if (!esRecursoPropio) return;

  event.respondWith(
    // Primero buscamos en caché
    caches.match(event.request).then((respuestaCacheada) => {
      if (respuestaCacheada) {
        // ✅ Encontrado en caché — devolvemos inmediatamente
        return respuestaCacheada;
      }

      // ❌ No está en caché — pedimos a la red
      return fetch(event.request)
        .then((respuestaRed) => {
          // Verificamos que sea una respuesta válida antes de cachearla
          if (
            !respuestaRed ||
            respuestaRed.status !== 200 ||
            respuestaRed.type === "opaque" // respuestas cross-origin sin CORS
          ) {
            return respuestaRed;
          }

          // Guardamos una copia en caché para la próxima vez.
          // Usamos clone() porque una respuesta solo se puede leer UNA vez —
          // necesitamos una copia para la caché y otra para el navegador.
          const copiaParaCache = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copiaParaCache);
          });

          return respuestaRed;
        })
        .catch(() => {
          // Sin red y sin caché — devolvemos el index.html como fallback
          // (la app puede mostrar algo aunque no haya conexión)
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
