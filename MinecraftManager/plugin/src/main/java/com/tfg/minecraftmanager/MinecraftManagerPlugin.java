package com.tfg.minecraftmanager;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;
import org.java_websocket.server.WebSocketServer;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class MinecraftManagerPlugin extends JavaPlugin implements Listener {

    private HttpServer server;
    private ChatWebSocketServer wsServer;
    private final Gson gson = new Gson();
    private static final int PORT = 8081; // HTTP Port
    private static final int WS_PORT = 8082; // WebSocket Port

    @Override
    public void onEnable() {
        getLogger().info("Starting MinecraftManager API on port " + PORT);
        getServer().getPluginManager().registerEvents(this, this);

        // Start WebSocket Server
        wsServer = new ChatWebSocketServer(new InetSocketAddress(WS_PORT));
        wsServer.start();
        getLogger().info("WebSocket Server started on port " + WS_PORT);

        try {
            server = HttpServer.create(new InetSocketAddress(PORT), 0);

            // Endpoint: /api/players
            server.createContext("/api/players", new HttpHandler() {
                @Override
                public void handle(HttpExchange exchange) throws IOException {
                    if (!"GET".equals(exchange.getRequestMethod())) {
                        sendResponse(exchange, 405, "Method Not Allowed");
                        return;
                    }

                    JsonArray playersArray = new JsonArray();
                    for (Player player : Bukkit.getOnlinePlayers()) {
                        JsonObject playerObj = new JsonObject();
                        playerObj.addProperty("uuid", player.getUniqueId().toString());
                        playerObj.addProperty("name", player.getName());
                        playerObj.addProperty("health", player.getHealth());
                        playerObj.addProperty("food", player.getFoodLevel());
                        // Add location for map
                        JsonObject loc = new JsonObject();
                        loc.addProperty("x", player.getLocation().getX());
                        loc.addProperty("y", player.getLocation().getY());
                        loc.addProperty("z", player.getLocation().getZ());
                        loc.addProperty("world", player.getWorld().getName());
                        playerObj.add("location", loc);

                        playersArray.add(playerObj);
                    }

                    String response = gson.toJson(playersArray);
                    sendResponse(exchange, 200, response);
                }
            });

            // Endpoint: /api/command (POST)
            server.createContext("/api/command", new HttpHandler() {
                @Override
                public void handle(HttpExchange exchange) throws IOException {
                    if (!"POST".equals(exchange.getRequestMethod())) {
                        sendResponse(exchange, 405, "Method Not Allowed");
                        return;
                    }

                    String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                    JsonObject json = gson.fromJson(body, JsonObject.class);

                    if (json.has("command")) {
                        String command = json.get("command").getAsString();

                        // Run on main thread
                        new BukkitRunnable() {
                            @Override
                            public void run() {
                                Bukkit.dispatchCommand(Bukkit.getConsoleSender(), command);
                            }
                        }.runTask(MinecraftManagerPlugin.this);

                        sendResponse(exchange, 200, "{\"status\":\"executed\"}");
                    } else {
                        sendResponse(exchange, 400, "Missing command");
                    }
                }
            });

            // Endpoint: /api/inventory/{uuid}
            server.createContext("/api/inventory", new HttpHandler() {
                @Override
                public void handle(HttpExchange exchange) throws IOException {
                    if (!"GET".equals(exchange.getRequestMethod())) {
                        sendResponse(exchange, 405, "Method Not Allowed");
                        return;
                    }

                    String path = exchange.getRequestURI().getPath();
                    String uuidStr = path.substring(path.lastIndexOf('/') + 1);

                    try {
                        UUID uuid = UUID.fromString(uuidStr);
                        Player player = Bukkit.getPlayer(uuid);

                        if (player != null) {
                            JsonArray inventoryArray = new JsonArray();
                            // Main Inventory
                            for (int i = 0; i < player.getInventory().getSize(); i++) {
                                org.bukkit.inventory.ItemStack item = player.getInventory().getItem(i);
                                if (item != null) {
                                    JsonObject itemObj = new JsonObject();
                                    itemObj.addProperty("slot", i);
                                    itemObj.addProperty("type", item.getType().toString());
                                    itemObj.addProperty("amount", item.getAmount());

                                    // Enchantments
                                    if (item.hasItemMeta() && item.getItemMeta().hasEnchants()) {
                                        JsonArray enchantsArray = new JsonArray();
                                        item.getItemMeta().getEnchants().forEach((ench, level) -> {
                                            JsonObject enchObj = new JsonObject();
                                            enchObj.addProperty("name", ench.getKey().getKey());
                                            enchObj.addProperty("level", level);
                                            enchantsArray.add(enchObj);
                                        });
                                        itemObj.add("enchantments", enchantsArray);
                                    }
                                    inventoryArray.add(itemObj);
                                }
                            }

                            // Ender Chest
                            JsonArray enderArray = new JsonArray();
                            for (int i = 0; i < player.getEnderChest().getSize(); i++) {
                                org.bukkit.inventory.ItemStack item = player.getEnderChest().getItem(i);
                                if (item != null) {
                                    JsonObject itemObj = new JsonObject();
                                    itemObj.addProperty("slot", i);
                                    itemObj.addProperty("type", item.getType().toString());
                                    itemObj.addProperty("amount", item.getAmount());

                                    // Enchantments
                                    if (item.hasItemMeta() && item.getItemMeta().hasEnchants()) {
                                        getLogger().info("Found enchanted item: " + item.getType() + " with "
                                                + item.getItemMeta().getEnchants().size() + " enchants");
                                        JsonArray enchantsArray = new JsonArray();
                                        item.getItemMeta().getEnchants().forEach((ench, level) -> {
                                            JsonObject enchObj = new JsonObject();
                                            enchObj.addProperty("name", ench.getKey().getKey());
                                            enchObj.addProperty("level", level);
                                            enchantsArray.add(enchObj);
                                        });
                                        itemObj.add("enchantments", enchantsArray);
                                    } else {
                                        // Debug log for items that SHOULD have enchants but don't seem to
                                        if (item.getType().toString().endsWith("_SWORD")) {
                                            getLogger().info("Sword found: " + item.getType() + ". HasMeta: "
                                                    + item.hasItemMeta() + ", HasEnchants: "
                                                    + (item.hasItemMeta() ? item.getItemMeta().hasEnchants() : "N/A"));
                                        }
                                    }
                                    enderArray.add(itemObj);
                                }
                            }

                            JsonObject responseJson = new JsonObject();
                            responseJson.add("inventory", inventoryArray);
                            responseJson.add("enderChest", enderArray);

                            // Potion Effects
                            JsonArray effectsArray = new JsonArray();
                            for (org.bukkit.potion.PotionEffect effect : player.getActivePotionEffects()) {
                                JsonObject effectObj = new JsonObject();
                                effectObj.addProperty("type", effect.getType().getName());
                                effectObj.addProperty("amplifier", effect.getAmplifier());
                                effectObj.addProperty("duration", effect.getDuration());
                                effectsArray.add(effectObj);
                            }
                            responseJson.add("potionEffects", effectsArray);

                            sendResponse(exchange, 200, gson.toJson(responseJson));
                        } else {
                            sendResponse(exchange, 404, "Player not found");
                        }
                    } catch (IllegalArgumentException e) {
                        sendResponse(exchange, 400, "Invalid UUID");
                    }
                }
            });

            // Endpoint: /api/advancements/{uuid}
            server.createContext("/api/advancements", new HttpHandler() {
                @Override
                public void handle(HttpExchange exchange) throws IOException {
                    if (!"GET".equals(exchange.getRequestMethod())) {
                        sendResponse(exchange, 405, "Method Not Allowed");
                        return;
                    }

                    String path = exchange.getRequestURI().getPath();
                    String uuidStr = path.substring(path.lastIndexOf('/') + 1);

                    try {
                        UUID uuid = UUID.fromString(uuidStr);
                        Player player = Bukkit.getPlayer(uuid);

                        if (player != null) {
                            JsonArray advancementsArray = new JsonArray();

                            // Iterate over all advancements
                            java.util.Iterator<org.bukkit.advancement.Advancement> it = Bukkit.advancementIterator();
                            while (it.hasNext()) {
                                org.bukkit.advancement.Advancement adv = it.next();
                                org.bukkit.advancement.AdvancementProgress progress = player
                                        .getAdvancementProgress(adv);

                                // We want all advancements that have display data (visible ones)
                                if (adv.getDisplay() != null) {
                                    JsonObject advObj = new JsonObject();
                                    advObj.addProperty("key", adv.getKey().toString());
                                    advObj.addProperty("done", progress.isDone());

                                    // Parent
                                    if (adv.getParent() != null) {
                                        advObj.addProperty("parent", adv.getParent().getKey().toString());
                                    }

                                    // Display Info
                                    JsonObject display = new JsonObject();
                                    display.addProperty("title",
                                            net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer
                                                    .plainText().serialize(adv.getDisplay().title()));
                                    display.addProperty("description",
                                            net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer
                                                    .plainText().serialize(adv.getDisplay().description()));
                                    display.addProperty("icon", adv.getDisplay().icon().getType().toString());
                                    display.addProperty("frame", adv.getDisplay().frame().toString());
                                    // Background only exists on root advancements usually
                                    // Note: Spigot API might not expose background texture easily without NMS,
                                    // but we can check if it's a root (no parent) and infer or use a placeholder.

                                    advObj.add("display", display);

                                    JsonArray criteria = new JsonArray();
                                    for (String crit : progress.getAwardedCriteria()) {
                                        criteria.add(crit);
                                    }
                                    advObj.add("awardedCriteria", criteria);

                                    advancementsArray.add(advObj);
                                }
                            }

                            JsonObject responseJson = new JsonObject();
                            responseJson.add("advancements", advancementsArray);

                            sendResponse(exchange, 200, gson.toJson(responseJson));
                        } else {
                            sendResponse(exchange, 404, "Player not found");
                        }
                    } catch (IllegalArgumentException e) {
                        sendResponse(exchange, 400, "Invalid UUID");
                    }
                }
            });

            server.setExecutor(null);
            server.start();
            getLogger().info("API Server started!");

        } catch (IOException e) {
            getLogger().severe("Could not start API Server: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void onDisable() {
        if (server != null) {
            server.stop(0);
        }
        if (wsServer != null) {
            try {
                wsServer.stop();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        getLogger().info("API & WebSocket Server stopped.");
    }

    @EventHandler
    public void onChat(AsyncPlayerChatEvent event) {
        if (wsServer != null) {
            JsonObject chatObj = new JsonObject();
            chatObj.addProperty("type", "chat");
            chatObj.addProperty("player", event.getPlayer().getName());
            chatObj.addProperty("message", event.getMessage());
            chatObj.addProperty("timestamp", System.currentTimeMillis());

            wsServer.broadcast(gson.toJson(chatObj));
        }
    }

    // Inner WebSocket Server Class
    private class ChatWebSocketServer extends WebSocketServer {

        public ChatWebSocketServer(InetSocketAddress address) {
            super(address);
        }

        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
            // System.out.println("New connection: " + conn.getRemoteSocketAddress());
        }

        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        }

        @Override
        public void onMessage(WebSocket conn, String message) {
        }

        @Override
        public void onError(WebSocket conn, Exception ex) {
            ex.printStackTrace();
        }

        @Override
        public void onStart() {
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }
}
