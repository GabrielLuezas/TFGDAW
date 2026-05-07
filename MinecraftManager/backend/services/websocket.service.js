// Servicio WebSocket multi-servidor
// Gestiona conexiones WS independientes hacia cada servidor Minecraft registrado como admin
// y retransmite los eventos al frontend vía Socket.IO con rooms por serverId

const WebSocket = require("ws");
const { getDb } = require("../db");

let io;
// Map de serverId → instancia WebSocket activa
const connections = new Map();

/**
 * Inicializa el servicio con la instancia de Socket.IO.
 * @param {import("socket.io").Server} socketIo
 */
function init(socketIo) {
  io = socketIo;

  // Cuando un cliente frontend se conecta, puede unirse a la room de un servidor
  io.on("connection", (socket) => {
    socket.on("join_server", (serverId) => {
      socket.join(`server_${serverId}`);
    });

    socket.on("leave_server", (serverId) => {
      socket.leave(`server_${serverId}`);
    });
  });

  // Conectar a todos los servidores admin registrados en BD
  connectAllAdminServers();
}

/**
 * Conecta a todos los servidores con rol 'admin' almacenados en la BD.
 * Se llama al arrancar y se puede volver a llamar para reconectar.
 */
async function connectAllAdminServers() {
  try {
    const db = getDb();
    const servers = await db("servers").where({ role: "admin" });
    for (const server of servers) {
      connectToServer(server);
    }
  } catch (err) {
    console.warn("[WS] No se pudieron cargar servidores de BD:", err.message);
  }
}

/**
 * Añade una conexión WebSocket a un nuevo servidor (llamar tras POST /api/servers con role=admin).
 * @param {{ id: number, ip: string, ws_port: number, unique_token: string }} server
 */
function connectToServer(server) {
  const { id, ip, api_host, ws_port, unique_token } = server;
  // Usa api_host si está definido (ej: localhost para FeatherMC), si no usa ip
  const wsHost = api_host || ip;
  const wsUrl = `ws://${wsHost}:${ws_port}`;

  if (connections.has(id)) {
    // Ya existe una conexión, no duplicar
    return;
  }

  function connect() {
    const ws = new WebSocket(wsUrl, {
      headers: { "X-Plugin-Token": unique_token },
    });

    ws.on("open", () => {
      console.log(`[WS] Conectado al servidor #${id} (${wsUrl})`);
      connections.set(id, ws);
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        // Emitir solo a los clientes suscritos a este servidor
        io.to(`server_${id}`).emit("chat_message", { ...message, serverId: id });
      } catch (e) {
        console.error(`[WS] Error parseando mensaje de servidor #${id}:`, e);
      }
    });

    ws.on("close", () => {
      console.log(`[WS] Desconectado del servidor #${id}. Reconectando en 5s...`);
      connections.delete(id);
      setTimeout(connect, 5000);
    });

    ws.on("error", (err) => {
      console.error(`[WS] Error en servidor #${id}:`, err.message);
      ws.close();
    });
  }

  connect();
}

/**
 * Desconecta el WebSocket de un servidor (llamar tras DELETE /api/servers/:id).
 * @param {number} serverId
 */
function disconnectFromServer(serverId) {
  const ws = connections.get(serverId);
  if (ws) {
    ws.terminate();
    connections.delete(serverId);
    console.log(`[WS] Desconectado y eliminado servidor #${serverId}`);
  }
}

module.exports = { init, connectToServer, disconnectFromServer, connectAllAdminServers };
