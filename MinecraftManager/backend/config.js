// Configuración centralizada del backend
// Todas las variables de entorno se leen desde aquí

module.exports = {
  PORT: process.env.PORT || 3000,

  // ── Base de datos (PostgreSQL) ────────────────────────────
  DATABASE_URL: process.env.DATABASE_URL,

  // ── JWT ──────────────────────────────────────────────────
  JWT_SECRET: process.env.JWT_SECRET || "cambiar_en_produccion_secret_muy_largo",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  MICROSOFT_CLIENT_ID:     process.env.MICROSOFT_CLIENT_ID     || "",
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || "",
  MICROSOFT_REDIRECT_URI:  process.env.MICROSOFT_REDIRECT_URI  || "http://localhost:3000/api/auth/microsoft/callback",
  // URL a la que el backend redirige al frontend tras autenticación
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:4200",

  // ── Plugin (se usan como fallback, ahora es dinámico por servidor) ──
  PLUGIN_API_URL: process.env.PLUGIN_API_URL || "http://localhost:8081/api",
  PLUGIN_WS_URL: process.env.PLUGIN_WS_URL || "ws://localhost:8082",

  // ── BlueMap ──────────────────────────────────────────────
  BLUEMAP_URL: process.env.BLUEMAP_URL || "http://localhost:8100",

  // ── Minecraft ────────────────────────────────────────────
  MC_VERSION: "1.21.5",
};
