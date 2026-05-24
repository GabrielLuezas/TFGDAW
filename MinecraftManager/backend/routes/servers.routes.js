// Rutas de gestión de servidores del usuario autenticado
// Todas las rutas están protegidas por authMiddleware
//
// GET    /api/servers              → Lista servidores del usuario (jugador y admin)
// POST   /api/servers              → Añadir nuevo servidor
// DELETE /api/servers/:id          → Eliminar servidor
// PATCH  /api/servers/:id          → Editar nombre/contraseña
// POST   /api/servers/:id/password → Admin genera contraseña para jugadores

const { Router } = require("express");
const crypto = require("crypto");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const { getDb } = require("../db");
const authMiddleware = require("../middleware/auth.middleware");

const router = Router();

// Aplicar auth a todas las rutas
router.use(authMiddleware);

// ── GET /api/servers ──────────────────────────────────────────
router.get("/", async (req, res) => {
  const db = getDb();
  try {
    const servers = await db("servers")
      .select("id", "name", "ip", "api_host", "api_port", "ws_port", "role", "created_at")
      .where({ user_id: req.user.id })
      .orderBy("created_at", "asc");

    const players = servers.filter((s) => s.role === "player");
    const admins  = servers.filter((s) => s.role === "admin");

    return res.json({ players, admins });
  } catch (err) {
    console.error("[Servers] GET error:", err.message);
    return res.status(500).json({ error: "Error al obtener servidores" });
  }
});

// ── POST /api/servers ─────────────────────────────────────────
router.post("/", async (req, res) => {
  let { name, ip, api_host, api_port = 8081, ws_port = 8082, role, unique_token, password } = req.body;

  if (!name || !ip || !role) {
    return res.status(400).json({ error: "name, ip y role son obligatorios" });
  }
  if (!["player", "admin"].includes(role)) {
    return res.status(400).json({ error: "role debe ser 'player' o 'admin'" });
  }

  const db = getDb();

  if (role === "admin") {
    // ── ADMIN: proporciona el token del plugin (/linkear) ──
    if (!unique_token) {
      return res.status(400).json({ error: "unique_token es obligatorio para administradores" });
    }

    // Verifica el token contra el plugin
    const pluginHost = api_host || ip;
    try {
      const pluginUrl = `http://${pluginHost}:${api_port}/api/token/verify`;
      await axios.get(pluginUrl, {
        headers: { "X-Plugin-Token": unique_token },
        timeout: 8000,
      });
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        return res.status(400).json({ error: "Token inválido. Usa /linkear en el servidor Minecraft para obtener el token correcto." });
      }
      console.warn(`[Servers] No se pudo verificar el plugin en ${pluginHost}:${api_port} — se añade igualmente.`);
    }

  } else {
    // ── JUGADOR: necesita la contraseña del servidor ──
    if (!password) {
      return res.status(400).json({ error: "La contraseña del servidor es obligatoria para jugadores." });
    }

    // Buscar un admin que tenga un servidor con la misma IP y tenga contraseña configurada
    const adminServer = await db("servers")
      .where({ ip, role: "admin" })
      .whereNotNull("server_password")
      .first();

    if (!adminServer) {
      return res.status(400).json({
        error: "No se encontró un servidor administrado en esa IP, o el administrador aún no ha generado una contraseña para jugadores."
      });
    }

    // Verificar la contraseña contra el hash del admin
    const valid = await bcrypt.compare(password, adminServer.server_password);
    if (!valid) {
      return res.status(400).json({ error: "Contraseña del servidor incorrecta." });
    }

    // Copiar el token real del plugin desde el registro del admin
    unique_token = adminServer.unique_token;
    api_host = adminServer.api_host;
    api_port = adminServer.api_port;
    ws_port  = adminServer.ws_port;
  }

  try {
    // Comprobar duplicado
    const exists = await db("servers")
      .where({ user_id: req.user.id, ip, role })
      .first();
    if (exists) {
      return res.status(409).json({ error: "Ya tienes este servidor añadido" });
    }

    const [{ id }] = await db("servers").insert({
      user_id: req.user.id,
      name,
      ip,
      api_host: api_host || null,
      api_port,
      ws_port,
      unique_token,
      role,
    }).returning("id");

    const fullServer = await db("servers")
      .where({ id })
      .first();

    // Conectar dinámicamente el WebSocket si el rol es admin
    if (role === "admin") {
      try {
        const websocketService = require("../services/websocket.service");
        websocketService.connectToServer(fullServer);
      } catch (wsErr) {
        console.error(`[Servers] Error al iniciar WebSocket para servidor #${id}:`, wsErr.message);
      }
    }

    const server = {
      id: fullServer.id,
      name: fullServer.name,
      ip: fullServer.ip,
      api_host: fullServer.api_host,
      api_port: fullServer.api_port,
      ws_port: fullServer.ws_port,
      role: fullServer.role,
      created_at: fullServer.created_at
    };

    return res.status(201).json({ server });
  } catch (err) {
    console.error("[Servers] POST error:", err.message);
    return res.status(500).json({ error: "Error al añadir servidor" });
  }
});

// ── POST /api/servers/:id/password ────────────────────────────
// El admin genera una contraseña que los jugadores usarán para unirse
router.post("/:id/password", async (req, res) => {
  const db = getDb();

  try {
    const server = await db("servers")
      .where({ id: req.params.id, user_id: req.user.id, role: "admin" })
      .first();

    if (!server) {
      return res.status(404).json({ error: "Servidor no encontrado o no eres administrador de este servidor." });
    }

    // Generar una contraseña legible de 8 caracteres
    const plainPassword = crypto.randomBytes(4).toString("hex").toUpperCase();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    await db("servers")
      .where({ id: req.params.id })
      .update({ server_password: hashedPassword });

    console.log(`[Servers] Contraseña de servidor generada para servidor #${req.params.id}`);

    // Devolver la contraseña en texto plano (solo se muestra una vez)
    return res.json({
      password: plainPassword,
      message: "Contraseña generada. Compártela con los jugadores. No se podrá volver a ver."
    });
  } catch (err) {
    console.error("[Servers] Password generation error:", err.message);
    return res.status(500).json({ error: "Error al generar contraseña" });
  }
});

// ── PATCH /api/servers/:id ────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const { name } = req.body;
  const db = getDb();

  try {
    const server = await db("servers")
      .where({ id: req.params.id, user_id: req.user.id })
      .first();

    if (!server) {
      return res.status(404).json({ error: "Servidor no encontrado" });
    }

    const updates = {};
    if (name) updates.name = name;
    if (req.body.api_host !== undefined) updates.api_host = req.body.api_host || null;

    await db("servers").where({ id: req.params.id }).update(updates);
    const updated = await db("servers")
      .select("id", "name", "ip", "api_host", "api_port", "ws_port", "role", "created_at")
      .where({ id: req.params.id })
      .first();

    return res.json({ server: updated });
  } catch (err) {
    console.error("[Servers] PATCH error:", err.message);
    return res.status(500).json({ error: "Error al actualizar servidor" });
  }
});

// ── DELETE /api/servers/:id ───────────────────────────────────
router.delete("/:id", async (req, res) => {
  const db = getDb();
  try {
    const serverId = parseInt(req.params.id);
    const deleted = await db("servers")
      .where({ id: serverId, user_id: req.user.id })
      .delete();

    if (!deleted) {
      return res.status(404).json({ error: "Servidor no encontrado" });
    }

    // Desconectar dinámicamente el WebSocket asociado
    try {
      const websocketService = require("../services/websocket.service");
      websocketService.disconnectFromServer(serverId);
    } catch (wsErr) {
      console.error(`[Servers] Error al desconectar WebSocket para servidor #${serverId}:`, wsErr.message);
    }

    return res.json({ message: "Servidor eliminado" });
  } catch (err) {
    console.error("[Servers] DELETE error:", err.message);
    return res.status(500).json({ error: "Error al eliminar servidor" });
  }
});

module.exports = router;
