// Servicio de texturas de Minecraft
// Carga las texturas de ítems/bloques desde el paquete minecraft-assets

const config = require("../config");
const mcAssets = require("minecraft-assets")(config.MC_VERSION);

/**
 * Obtiene la textura PNG de un ítem de Minecraft como Buffer.
 * @param {string} itemName - Nombre del ítem (ej: "diamond_sword", "DIAMOND_SWORD")
 * @returns {Buffer|null} Buffer PNG de la textura o null si no se encuentra
 */
function getTexture(itemName) {
  const name = itemName.toLowerCase().replace(/\s+/g, "_");
  const texture = mcAssets.textureContent[name];

  if (texture && texture.texture) {
    const base64Data = texture.texture.replace(/^data:image\/png;base64,/, "");
    return Buffer.from(base64Data, "base64");
  }

  return null;
}

module.exports = { getTexture };
