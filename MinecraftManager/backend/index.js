require('dotenv').config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const config = require("./config");
const { initDb } = require("./db");
const websocketService = require("./services/websocket.service");

async function bootstrap() {
  await initDb();

  const server = http.createServer(app);

  // ── 3. Configurar Socket.IO ───────────────────────────────
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // ── 4. Inicializar bridge WebSocket multi-servidor ────────
  websocketService.init(io);

  // ── 5. Arrancar el servidor ───────────────────────────────
  server.listen(config.PORT, () => {
    console.log(`Backend Server running on http://localhost:${config.PORT}`);
    console.log(`Minecraft textures loaded for version ${config.MC_VERSION}`);
  });
}

bootstrap().catch((err) => {
  console.error("Error al arrancar el servidor:", err);
  process.exit(1);
});
