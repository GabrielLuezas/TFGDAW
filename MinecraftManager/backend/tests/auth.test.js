// ============================================================
// Tests de Autenticación — registro, login, /me
// ============================================================
const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Mock de la base de datos para inyectar la BD de test
jest.mock("../db", () => {
  const { getTestDb } = require("./setup");
  return { getDb: () => getTestDb(), initDb: jest.fn() };
});

const app = require("../app");
const { setupTestDb, getTestDb, teardownTestDb } = require("./setup");

// ── Helpers ──────────────────────────────────────────────────
const TEST_USER = {
  username: "testuser",
  email: "test@example.com",
  birthdate: "2000-01-15",
  password: "password123",
  confirmPassword: "password123",
};

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  const db = getTestDb();
  await db("servers").delete();
  await db("users").delete();
});

// ══════════════════════════════════════════════════════════════
// POST /api/auth/register
// ══════════════════════════════════════════════════════════════

describe("POST /api/auth/register", () => {
  test("PR-01: Registro exitoso con datos válidos", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(TEST_USER);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({
      username: TEST_USER.username,
      email: TEST_USER.email,
    });
  });

  test("PR-02: Registro falla sin campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "test" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Todos los campos son obligatorios");
  });

  test("PR-03: Registro falla con email inválido", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...TEST_USER, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Email no válido");
  });

  test("PR-04: Registro falla cuando las contraseñas no coinciden", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...TEST_USER, confirmPassword: "different" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Las contraseñas no coinciden");
  });

  test("PR-05: Registro falla con contraseña menor a 6 caracteres", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...TEST_USER, password: "123", confirmPassword: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("La contraseña debe tener al menos 6 caracteres");
  });

  test("PR-06: Registro falla con nombre de usuario menor a 3 caracteres", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...TEST_USER, username: "ab" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("El nombre de usuario debe tener entre 3 y 50 caracteres");
  });

  test("PR-07: Registro falla con email duplicado", async () => {
    // Primer registro
    await request(app).post("/api/auth/register").send(TEST_USER);

    // Segundo registro con mismo email
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...TEST_USER, username: "otro_usuario" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("El email ya está registrado");
  });

  test("PR-08: Registro falla con username duplicado", async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...TEST_USER, email: "otro@email.com" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("El nombre de usuario ya está en uso");
  });
});

// ══════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Crear usuario para tests de login
    await request(app).post("/api/auth/register").send(TEST_USER);
  });

  test("PR-09: Login exitoso con credenciales válidas", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  test("PR-10: Login falla sin campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Email y contraseña son obligatorios");
  });

  test("PR-11: Login falla con email no registrado", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "noexiste@email.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Credenciales incorrectas");
  });

  test("PR-12: Login falla con contraseña incorrecta", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Credenciales incorrectas");
  });

  test("PR-13: Token JWT es válido y contiene datos del usuario", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const decoded = jwt.decode(res.body.token);
    expect(decoded).toHaveProperty("id");
    expect(decoded.username).toBe(TEST_USER.username);
    expect(decoded.email).toBe(TEST_USER.email);
    expect(decoded).toHaveProperty("exp"); // tiene expiración
  });
});

// ══════════════════════════════════════════════════════════════
// GET /api/auth/me
// ══════════════════════════════════════════════════════════════

describe("GET /api/auth/me", () => {
  test("PR-14: Obtener perfil con token válido", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(TEST_USER);
    const token = registerRes.body.token;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(TEST_USER.username);
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user).not.toHaveProperty("password_hash"); // No expone el hash
  });

  test("PR-15: Acceso denegado sin token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token no proporcionado");
  });

  test("PR-16: Acceso denegado con token inválido", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer tokenfalso123");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token inválido");
  });

  test("PR-17: Acceso denegado con token expirado", async () => {
    const config = require("../config");
    const expiredToken = jwt.sign(
      { id: 1, username: "test", email: "test@test.com" },
      config.JWT_SECRET,
      { expiresIn: "0s" }
    );

    // Esperar 1 segundo para que expire
    await new Promise((r) => setTimeout(r, 1100));

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Token expirado");
  });
});
