// ============================================================
// Tests de Servidores — CRUD de servidores
// ============================================================
const request = require("supertest");

jest.mock("../db", () => {
  const { getTestDb } = require("./setup");
  return { getDb: () => getTestDb(), initDb: jest.fn() };
});

// Mock de axios para simular el plugin de Minecraft
jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));
const axios = require("axios");

const app = require("../app");
const { setupTestDb, getTestDb, teardownTestDb } = require("./setup");

// ── Helpers ──────────────────────────────────────────────────
let authToken;
let userId;

async function createUserAndLogin() {
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      username: "serveradmin",
      email: "admin@test.com",
      birthdate: "2000-01-15",
      password: "password123",
      confirmPassword: "password123",
    });
  authToken = res.body.token;
  userId = res.body.user.id;
}

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  const db = getTestDb();
  await db("servers").delete();
  await db("users").delete();
  await createUserAndLogin();
  // Mock por defecto: plugin responde correctamente
  axios.get.mockResolvedValue({ data: { valid: true } });
});

// ══════════════════════════════════════════════════════════════
// GET /api/servers
// ══════════════════════════════════════════════════════════════

describe("GET /api/servers", () => {
  test("PR-18: Obtener lista de servidores vacía", async () => {
    const res = await request(app)
      .get("/api/servers")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.players).toEqual([]);
    expect(res.body.admins).toEqual([]);
  });

  test("PR-19: Lista servidores separados por rol", async () => {
    // Añadir servidor admin
    await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Mi Server",
        ip: "localhost",
        role: "admin",
        unique_token: "token123",
      });

    const res = await request(app)
      .get("/api/servers")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.admins).toHaveLength(1);
    expect(res.body.admins[0].name).toBe("Mi Server");
    expect(res.body.players).toHaveLength(0);
  });

  test("PR-20: Acceso denegado sin autenticación", async () => {
    const res = await request(app).get("/api/servers");

    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════
// POST /api/servers
// ══════════════════════════════════════════════════════════════

describe("POST /api/servers", () => {
  test("PR-21: Añadir servidor como admin", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Servidor de Pruebas",
        ip: "localhost",
        role: "admin",
        unique_token: "abc123",
        api_port: 8081,
        ws_port: 8082,
      });

    expect(res.status).toBe(201);
    expect(res.body.server).toMatchObject({
      name: "Servidor de Pruebas",
      ip: "localhost",
      role: "admin",
    });
  });

  test("PR-22: Falla sin campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Solo nombre" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("name, ip y role son obligatorios");
  });

  test("PR-23: Falla con rol inválido", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Test", ip: "1.2.3.4", role: "superuser" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("role debe ser 'player' o 'admin'");
  });

  test("PR-24: Falla sin token para admin", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test",
        ip: "1.2.3.4",
        role: "admin",
        // Sin unique_token
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("unique_token es obligatorio para administradores");
  });

  test("PR-25: Falla al duplicar servidor", async () => {
    const serverData = {
      name: "Duplicado",
      ip: "1.2.3.4",
      role: "admin",
      unique_token: "token_dup",
    };

    await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send(serverData);

    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send(serverData);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Ya tienes este servidor añadido");
  });

  test("PR-26: Jugador falla sin contraseña", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Player Server",
        ip: "1.2.3.4",
        role: "player",
        // Sin password
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("La contraseña del servidor es obligatoria para jugadores.");
  });
});

// ══════════════════════════════════════════════════════════════
// PATCH /api/servers/:id
// ══════════════════════════════════════════════════════════════

describe("PATCH /api/servers/:id", () => {
  let serverId;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Original Name",
        ip: "localhost",
        role: "admin",
        unique_token: "edit_token",
      });
    serverId = res.body.server.id;
  });

  test("PR-27: Editar nombre del servidor", async () => {
    const res = await request(app)
      .patch(`/api/servers/${serverId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Nombre Nuevo" });

    expect(res.status).toBe(200);
    expect(res.body.server.name).toBe("Nombre Nuevo");
  });

  test("PR-28: Editar servidor que no existe", async () => {
    const res = await request(app)
      .patch("/api/servers/99999")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "No existe" });

    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════
// DELETE /api/servers/:id
// ══════════════════════════════════════════════════════════════

describe("DELETE /api/servers/:id", () => {
  let serverId;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "To Delete",
        ip: "localhost",
        role: "admin",
        unique_token: "del_token",
      });
    serverId = res.body.server.id;
  });

  test("PR-29: Eliminar servidor correctamente", async () => {
    const res = await request(app)
      .delete(`/api/servers/${serverId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Servidor eliminado");

    // Verificar que ya no existe
    const list = await request(app)
      .get("/api/servers")
      .set("Authorization", `Bearer ${authToken}`);
    expect(list.body.admins).toHaveLength(0);
  });

  test("PR-30: Eliminar servidor que no existe", async () => {
    const res = await request(app)
      .delete("/api/servers/99999")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });

  test("PR-31: No puede eliminar servidor de otro usuario", async () => {
    // Crear segundo usuario
    const user2 = await request(app)
      .post("/api/auth/register")
      .send({
        username: "otrousuario",
        email: "otro@test.com",
        birthdate: "1999-06-20",
        password: "password456",
        confirmPassword: "password456",
      });

    const res = await request(app)
      .delete(`/api/servers/${serverId}`)
      .set("Authorization", `Bearer ${user2.body.token}`);

    expect(res.status).toBe(404); // No lo encuentra porque no es suyo
  });
});

// ══════════════════════════════════════════════════════════════
// POST /api/servers/:id/password
// ══════════════════════════════════════════════════════════════

describe("POST /api/servers/:id/password", () => {
  let serverId;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Password Server",
        ip: "localhost",
        role: "admin",
        unique_token: "pwd_token",
      });
    serverId = res.body.server.id;
  });

  test("PR-32: Generar contraseña para jugadores", async () => {
    const res = await request(app)
      .post(`/api/servers/${serverId}/password`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("password");
    expect(res.body.password).toHaveLength(8); // 4 bytes hex = 8 chars
    expect(res.body).toHaveProperty("message");
  });

  test("PR-33: Falla generar contraseña para servidor inexistente", async () => {
    const res = await request(app)
      .post("/api/servers/99999/password")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });
});
