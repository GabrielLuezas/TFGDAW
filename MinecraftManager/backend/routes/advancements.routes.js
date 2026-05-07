// GET /api/advancements/:uuid?serverId=X — Logros de un jugador
const { Router } = require("express");
const pluginService = require("../services/plugin.service");

const router = Router();

router.get("/:uuid", async (req, res) => {
  const { uuid } = req.params;
  const { serverId } = req.query;
  if (!serverId) return res.status(400).json({ error: "serverId es obligatorio" });

  try {
    const response = await pluginService.getAdvancements(serverId, req.user.id, uuid);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching advancements:", error.message);
    res.status(500).json({ error: "Failed to fetch advancements" });
  }
});

module.exports = router;
