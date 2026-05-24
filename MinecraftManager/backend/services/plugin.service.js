// Servicio de comunicación con el Plugin de Minecraft

const axios = require("axios");
const { getDb } = require("../db");

/**
 * Obtiene la URL base de la API del plugin para un servidor dado.
 * @param {number} serverId - ID del servidor en la BD
 * @param {number} userId   - ID del usuario (para verificar pertenencia)
 * @returns {Promise<string>} URL base del plugin (ej: http://192.168.1.10:8081/api)
 */
async function getPluginBaseUrl(serverId, userId) {
  const db = getDb();
  const server = await db("servers")
    .where({ id: serverId, user_id: userId })
    .first();

  if (!server) throw new Error("Servidor no encontrado o no autorizado");
  // Usa api_host si está definido; si no, usa ip (comportamiento anterior)
  const host = server.api_host || server.ip;
  return `http://${host}:${server.api_port}/api`;
}

/**
 * Crea un cliente axios configurado para un servidor específico con interceptor de auto-recuperación local.
 * @param {string} host   - Host principal
 * @param {number} port   - Puerto de la API del plugin
 * @param {string} token  - Token de autenticación del plugin
 */
function createPluginClient(host, port, token) {
  const primaryUrl = `http://${host}:${port}/api`;
  const fallbackUrl = `http://127.0.0.1:${port}/api`;

  const client = axios.create({
    baseURL: primaryUrl,
    timeout: 8000,
    headers: { "X-Plugin-Token": token },
  });

  // Interceptor para reintentar con 127.0.0.1 si falla el host principal
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config } = error;
      // Si ya falló o si el host principal ya era localhost/127.0.0.1, no reintentamos
      if (!config || config.__isRetry || host === "127.0.0.1" || host === "localhost") {
        return Promise.reject(error);
      }

      // Solo reintentar en errores de red o timeouts
      if (error.code === "ECONNABORTED" || error.code === "ECONNREFUSED" || !error.response) {
        console.warn(`[Plugin API] Falló petición a ${config.baseURL}${config.url} (${error.message}). Reintentando en fallback local (127.0.0.1)...`);
        config.__isRetry = true;
        config.baseURL = fallbackUrl;
        return axios(config);
      }

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Helper principal: resuelve la URL y el token del plugin y devuelve el cliente.
 * @param {number} serverId
 * @param {number} userId
 */
async function getPluginClient(serverId, userId) {
  const db = getDb();
  const server = await db("servers")
    .where({ id: serverId, user_id: userId })
    .first();

  if (!server) throw new Error("Servidor no encontrado o no autorizado");

  // Usa api_host si está definido; si no, usa ip (comportamiento anterior)
  const host = server.api_host || server.ip;
  return createPluginClient(host, server.api_port, server.unique_token);
}

module.exports = {
  getPluginClient,
  getPluginBaseUrl,
  // Métodos de conveniencia que reciben serverId y userId
  getPlayers:      (serverId, userId) => getPluginClient(serverId, userId).then(c => c.get("/players")),
  sendCommand:     (serverId, userId, command) => getPluginClient(serverId, userId).then(c => c.post("/command", { command })),
  getInventory:    (serverId, userId, uuid)    => getPluginClient(serverId, userId).then(c => c.get(`/inventory/${uuid}`)),
  getAdvancements: (serverId, userId, uuid)    => getPluginClient(serverId, userId).then(c => c.get(`/advancements/${uuid}`)),
  getServerInfo:   (serverId, userId) => getPluginClient(serverId, userId).then(c => c.get("/server")),
  getWhitelist:    (serverId, userId) => getPluginClient(serverId, userId).then(c => c.get("/whitelist")),
  updateWhitelist: (serverId, userId, body)    => getPluginClient(serverId, userId).then(c => c.post("/whitelist", body)),
};
