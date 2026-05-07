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
 * Crea un cliente axios configurado para un servidor específico.
 * @param {string} baseUrl - URL base del plugin
 * @param {string} token   - Token del plugin para autenticación
 */
function createPluginClient(baseUrl, token) {
  return axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    headers: { "X-Plugin-Token": token },
  });
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
  const baseUrl = `http://${host}:${server.api_port}/api`;
  return createPluginClient(baseUrl, server.unique_token);
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
