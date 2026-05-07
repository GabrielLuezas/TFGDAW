// GET /api/players?serverId=X — Lista de jugadores conectados al servidor X
const { Router } = require("express");
const pluginService = require("../services/plugin.service");

const router = Router();

router.get("/", async (req, res) => {
  const { serverId } = req.query;
  if (!serverId) return res.status(400).json({ error: "serverId es obligatorio" });

  try {
    const response = await pluginService.getPlayers(serverId, req.user.id);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching players:", error.message);
    res.status(500).json({ error: "Failed to connect to Minecraft Server" });
  }
});

module.exports = router;
