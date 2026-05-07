// POST /api/command — Ejecutar comando en el servidor
// Body: { command: string, serverId: number }
const { Router } = require("express");
const pluginService = require("../services/plugin.service");

const router = Router();

router.post("/", async (req, res) => {
  const { command, serverId } = req.body;
  if (!serverId) return res.status(400).json({ error: "serverId es obligatorio" });
  if (!command)  return res.status(400).json({ error: "command es obligatorio" });

  try {
    const response = await pluginService.sendCommand(serverId, req.user.id, command);
    res.json(response.data);
  } catch (error) {
    console.error("Error sending command:", error.message);
    res.status(500).json({ error: "Failed to execute command" });
  }
});

module.exports = router;
