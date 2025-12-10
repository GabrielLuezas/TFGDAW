const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");
const WebSocket = require("ws");

const app = express();
// El puerto TIENE que ser el que diga Render (process.env.PORT) o fallará el despliegue
const PORT = process.env.PORT || 3000;

// Aquí le decimos: "Usa la variable de Render, y si no existe (estoy en mi PC), usa localhost"
const PLUGIN_API_URL = process.env.PLUGIN_API_URL || "http://localhost:8081/api";
const PLUGIN_WS_URL = process.env.PLUGIN_WS_URL || "ws://localhost:8082";

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// WebSocket Bridge to Plugin
let pluginWs;

function connectToPlugin() {
  pluginWs = new WebSocket(PLUGIN_WS_URL);

  pluginWs.on("open", () => {
    console.log("Connected to Minecraft Plugin WebSocket");
  });

  pluginWs.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      // Broadcast to Frontend
      io.emit("chat_message", message);
    } catch (e) {
      console.error("Error parsing WS message:", e);
    }
  });

  pluginWs.on("close", () => {
    console.log("Disconnected from Plugin WS. Reconnecting in 5s...");
    setTimeout(connectToPlugin, 5000);
  });

  pluginWs.on("error", (err) => {
    console.error("Plugin WS Error:", err.message);
    pluginWs.close();
  });
}

connectToPlugin();

// Proxy to Plugin: Get Players
app.get("/api/players", async (req, res) => {
  try {
    const response = await axios.get(`${PLUGIN_API_URL}/players`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching players:", error.message);
    res.status(500).json({ error: "Failed to connect to Minecraft Server" });
  }
});

// Proxy to Plugin: Send Command
app.post("/api/command", async (req, res) => {
  try {
    const response = await axios.post(`${PLUGIN_API_URL}/command`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Error sending command:", error.message);
    res.status(500).json({ error: "Failed to execute command" });
  }
});

// Proxy to Plugin: Get Inventory
app.get("/api/inventory/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const response = await axios.get(`${PLUGIN_API_URL}/inventory/${uuid}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching inventory:", error.message);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Proxy to Plugin: Get Advancements
app.get("/api/advancements/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    const response = await axios.get(`${PLUGIN_API_URL}/advancements/${uuid}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching advancements:", error.message);
    res.status(500).json({ error: "Failed to fetch advancements" });
  }
});

server.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
