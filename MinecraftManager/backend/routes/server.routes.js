// GET /api/server?serverId=X — Estado del servidor Minecraft
const { Router } = require("express");
const pluginService = require("../services/plugin.service");

const router = Router();

router.get("/", async (req, res) => {
  const { serverId } = req.query;
  if (!serverId) return res.status(400).json({ error: "serverId es obligatorio" });

  try {
    const response = await pluginService.getServerInfo(serverId, req.user.id);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching server info:", error.message);
    res.status(500).json({ error: "Failed to fetch server info" });
  }
});

module.exports = router;
