const { Router } = require("express");
const textureService = require("../services/texture.service");

const router = Router();

// GET /api/texture/:itemName - Textura PNG de un ítem de Minecraft
router.get("/:itemName", (req, res) => {
  try {
    const imgBuffer = textureService.getTexture(req.params.itemName);

    if (imgBuffer) {
      // Caché de 1 año (las texturas son inmutables por versión)
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.send(imgBuffer);
    } else {
      res.status(404).json({ error: `Texture not found: ${req.params.itemName}` });
    }
  } catch (error) {
    console.error("Error serving texture:", error.message);
    res.status(500).json({ error: "Failed to serve texture" });
  }
});

module.exports = router;
