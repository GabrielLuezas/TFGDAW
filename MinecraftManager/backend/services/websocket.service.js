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

  if (connections.has(id)) {
    // Ya existe una conexión, no duplicar
    return;
  }

  let useFallback = false;

  function connect() {
    const targetHost = useFallback ? "127.0.0.1" : wsHost;
    const currentWsUrl = `ws://${targetHost}:${ws_port}`;

    console.log(`[WS] Intentando conectar al servidor #${id} en ${currentWsUrl}...`);

    const ws = new WebSocket(currentWsUrl, {
      headers: { "X-Plugin-Token": unique_token },
      handshakeTimeout: 5000, // Timeout rápido para fallar y probar fallback rápido
    });

    ws.on("open", () => {
      console.log(`[WS] Conectado con éxito al servidor #${id} (${currentWsUrl})`);
      connections.set(id, ws);
    });

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data);
        const eventType = message.type || "chat";

        // Obtener todos los registros de servidores que comparten este mismo token único
        const db = getDb();
        const relatedServers = await db("servers")
          .select("id", "role")
          .where({ unique_token });

        for (const s of relatedServers) {
          // Un jugador común no debe ver la ejecución de comandos
          if (eventType === "command" && s.role === "player") {
            continue;
          }
          // Emitir a la sala de este servidor particular
          io.to(`server_${s.id}`).emit("chat_message", { ...message, serverId: s.id });
        }
      } catch (e) {
        console.error(`[WS] Error parseando/retransmitiendo mensaje de servidor #${id}:`, e);
      }
    });

    ws.on("close", () => {
      console.log(`[WS] Conexión cerrada con el servidor #${id}.`);
      connections.delete(id);
      setTimeout(connect, 5000);
    });

    ws.on("error", (err) => {
      console.error(`[WS] Error de conexión en servidor #${id} (${currentWsUrl}):`, err.message);
      // Si falló el host principal, intentamos el fallback local en el siguiente intento
      if (!useFallback && targetHost !== "127.0.0.1" && targetHost !== "localhost") {
        console.log(`[WS] Servidor #${id} falló con el host principal. Probando fallback local (127.0.0.1)...`);
        useFallback = true;
      } else {
        useFallback = false;
      }
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
