// GET  /api/whitelist?serverId=X — Lista de jugadores en whitelist
// POST /api/whitelist              — Gestionar whitelist (add/remove/toggle)
//   Body: { serverId, action, player? }
const { Router } = require("express");
const pluginService = require("../services/plugin.service");

const router = Router();

router.get("/", async (req, res) => {
  const { serverId } = req.query;
  if (!serverId) return res.status(400).json({ error: "serverId es obligatorio" });

  try {
    const response = await pluginService.getWhitelist(serverId, req.user.id);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching whitelist:", error.message);
    res.status(500).json({ error: "Failed to fetch whitelist" });
  }
});

router.post("/", async (req, res) => {
  const { serverId, ...body } = req.body;
  if (!serverId) return res.status(400).json({ error: "serverId es obligatorio" });

  try {
    const response = await pluginService.updateWhitelist(serverId, req.user.id, body);
    res.json(response.data);
  } catch (error) {
    console.error("Error updating whitelist:", error.message);
    res.status(500).json({ error: "Failed to update whitelist" });
  }
});

module.exports = router;
