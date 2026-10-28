/* =====================================================================
   config.js — CLAVES Y OPCIONES
   1) Copia este archivo y llama a la copia "config.js" (en la misma carpeta que index.html).
   2) Rellena los tres valores.
   3) En las próximas actualizaciones NO se te entregará config.js, así que no tendrás que volver a tocarlo.
   ===================================================================== */

// Crea el objeto global de configuración que lee app.js
window.CONFIG = {
  // URL del proyecto (Supabase → botón "Connect" o Project Settings → API)
  SUPABASE_URL: 'https://xmsxxtlsaswnkagrhuqs.supabase.co',

  // Clave PÚBLICA (anon o publishable). ¡Nunca la "service_role" ni la "secret"!
  SUPABASE_KEY: 'sb_publishable_IMtZcCI0G7QVR15-TxariA_nl1djhuK',

  // Clave de SITIO de Cloudflare Turnstile (la "secret key" va en Supabase, nunca aquí)
  TURNSTILE_SITE_KEY: '0x4AAAAAAFimzwCqAsZJEsCN',

  // Segundos entre cada actualización automática de las tablas
  INTERVALO_SEGUNDOS: 15,
};
