package com.tfg.minecraftmanager;

import com.google.gson.Gson;
import com.tfg.minecraftmanager.commands.LinkearCommand;
import com.tfg.minecraftmanager.http.HttpApiServer;
import com.tfg.minecraftmanager.listeners.PlayerEventListener;
import com.tfg.minecraftmanager.websocket.ChatWebSocketServer;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.UUID;

/**
 * Clase principal del plugin MinecraftManager.
 * Se encarga únicamente del ciclo de vida: inicializar y detener los componentes.
 */
public class MinecraftManagerPlugin extends JavaPlugin {

    private HttpApiServer httpApiServer;
    private ChatWebSocketServer wsServer;
    private final Gson gson = new Gson();

    @Override
    public void onEnable() {
        long startTime = System.currentTimeMillis();
        saveDefaultConfig();

        // ── Leer/generar token de vinculación ──────────────────
        String pluginToken = getConfig().getString("plugin-token", null);
        if (pluginToken == null || pluginToken.isEmpty()) {
            pluginToken = UUID.randomUUID().toString();
            getConfig().set("plugin-token", pluginToken);
            saveConfig();
            getLogger().info("Token de vinculación generado: " + pluginToken);
        } else {
            getLogger().info("Token de vinculación cargado desde config.");
        }

        int apiPort = getConfig().getInt("api-port", 8081);
        int wsPort  = getConfig().getInt("websocket-port", 8082);

        // ── WebSocket Server ───────────────────────────────────
        wsServer = new ChatWebSocketServer(new InetSocketAddress(wsPort));
        wsServer.start();
        getLogger().info("WebSocket Server started on port " + wsPort);

        // ── HTTP API Server ────────────────────────────────────
        httpApiServer = new HttpApiServer();
        try {
            httpApiServer.start(apiPort, pluginToken, gson, this, startTime);
            getLogger().info("API Server started on port " + apiPort);
        } catch (IOException e) {
            getLogger().severe("Could not start API Server: " + e.getMessage());
            e.printStackTrace();
        }

        // ── Event Listeners ────────────────────────────────────
        getServer().getPluginManager().registerEvents(
            new PlayerEventListener(wsServer, gson), this);

        // ── Commands ───────────────────────────────────────────
        getCommand("linkear").setExecutor(new LinkearCommand(pluginToken));

        getLogger().info("MinecraftManager plugin enabled! Token: " + pluginToken);
    }

    @Override
    public void onDisable() {
        if (httpApiServer != null) httpApiServer.stop();
        if (wsServer != null) {
            try { wsServer.stop(); } catch (InterruptedException e) { e.printStackTrace(); }
        }
        getLogger().info("API & WebSocket Server stopped.");
    }
}
