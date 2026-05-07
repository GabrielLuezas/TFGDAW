// Configuración de la aplicación Express
// Middleware y montaje de rutas

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const authMiddleware = require("./middleware/auth.middleware");

// Importar rutas
const authRoutes       = require("./routes/auth.routes");
const serversRoutes    = require("./routes/servers.routes");
const playersRoutes    = require("./routes/players.routes");
const commandRoutes    = require("./routes/command.routes");
const inventoryRoutes  = require("./routes/inventory.routes");
const advancementsRoutes = require("./routes/advancements.routes");
const serverRoutes     = require("./routes/server.routes");
const whitelistRoutes  = require("./routes/whitelist.routes");
const textureRoutes    = require("./routes/texture.routes");
const mapRoutes        = require("./routes/map.routes");

const app = express();

// ── Middleware global ─────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Swagger UI ────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "MinecraftManager API",
  customCss: ".topbar { display: none }",
}));

// ── Rutas públicas (sin autenticación) ───────────────────────
app.use("/api/auth", authRoutes);

// ── Rutas protegidas con JWT ──────────────────────────────────
// authMiddleware verifica el Bearer token y añade req.user
app.use("/api/servers",    authMiddleware, serversRoutes);
app.use("/api/players",    authMiddleware, playersRoutes);
app.use("/api/command",    authMiddleware, commandRoutes);
app.use("/api/inventory",  authMiddleware, inventoryRoutes);
app.use("/api/advancements", authMiddleware, advancementsRoutes);
app.use("/api/server",     authMiddleware, serverRoutes);
app.use("/api/whitelist",  authMiddleware, whitelistRoutes);
app.use("/api/texture",    textureRoutes);    // Texturas públicas (caché de assets)
app.use("/api/map-url",    authMiddleware, mapRoutes);

module.exports = app;
