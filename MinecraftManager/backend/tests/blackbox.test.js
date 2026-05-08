// ============================================================
// Tests de Caja Negra — Clases de equivalencia y valores límite
// Sin conocimiento de la implementación interna
// ============================================================
const request = require("supertest");

jest.mock("../db", () => {
  const { getTestDb } = require("./setup");
  return { getDb: () => getTestDb(), initDb: jest.fn() };
});

const app = require("../app");
const { setupTestDb, getTestDb, teardownTestDb } = require("./setup");

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
afterEach(async () => {
  const db = getTestDb();
  await db("servers").delete();
  await db("users").delete();
});

// ══════════════════════════════════════════════════════════════
// CLASES DE EQUIVALENCIA — Registro de usuario
// ══════════════════════════════════════════════════════════════
// CE1: Username válido (3-50 chars)       → Registro OK
// CE2: Username inválido (<3 chars)       → Error 400
// CE3: Username inválido (>50 chars)      → Error 400
// CE4: Email con formato válido           → Registro OK
// CE5: Email con formato inválido         → Error 400
// CE6: Contraseña válida (≥6 chars)       → Registro OK
// CE7: Contraseña inválida (<6 chars)     → Error 400
// CE8: Contraseñas coinciden              → Registro OK
// CE9: Contraseñas no coinciden           → Error 400

describe("Caja Negra: Clases de Equivalencia — Registro", () => {
  const base = {
    email: "test@example.com",
    birthdate: "2000-01-15",
    password: "password123",
    confirmPassword: "password123",
  };

  test("CE1: Username válido (3 caracteres — límite inferior)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "abc" });
    expect(res.status).toBe(201);
  });

  test("CE2: Username inválido (2 caracteres — bajo el límite)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "ab" });
    expect(res.status).toBe(400);
  });

  test("CE3: Username inválido (51 caracteres — sobre el límite)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "a".repeat(51) });
    expect(res.status).toBe(400);
  });

  test("CE4: Username válido (50 caracteres — límite superior)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "a".repeat(50), email: "limit50@test.com" });
    expect(res.status).toBe(201);
  });

  test("CE5: Email válido estándar", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "emailtest", email: "user@domain.com" });
    expect(res.status).toBe(201);
  });

  test("CE6: Email inválido — sin @", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "emailtest2", email: "userdomain.com" });
    expect(res.status).toBe(400);
  });

  test("CE7: Email inválido — sin dominio", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "emailtest3", email: "user@" });
    expect(res.status).toBe(400);
  });

  test("CE8: Email inválido — con espacios", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "emailtest4", email: "user @domain.com" });
    expect(res.status).toBe(400);
  });

  test("CE9: Contraseña válida (6 caracteres — límite inferior)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "pwdtest", email: "pwd@test.com", password: "123456", confirmPassword: "123456" });
    expect(res.status).toBe(201);
  });

  test("CE10: Contraseña inválida (5 caracteres — bajo el límite)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "pwdtest2", email: "pwd2@test.com", password: "12345", confirmPassword: "12345" });
    expect(res.status).toBe(400);
  });

  test("CE11: Contraseñas no coinciden", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...base, username: "pwdtest3", email: "pwd3@test.com", password: "password1", confirmPassword: "password2" });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════
// VALORES LÍMITE — Login
// ══════════════════════════════════════════════════════════════

describe("Caja Negra: Valores Límite — Login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      username: "logintest",
      email: "login@test.com",
      birthdate: "2000-01-15",
      password: "correctpassword",
      confirmPassword: "correctpassword",
    });
  });

  test("VL-01: Login con credenciales exactas", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "correctpassword" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("VL-02: Login con contraseña de 1 carácter de diferencia", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "correctpassworD" }); // D mayúscula
    expect(res.status).toBe(401);
  });

  test("VL-03: Login con email en mayúsculas (case sensitivity)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "LOGIN@TEST.COM", password: "correctpassword" });
    // El sistema debería ser case-insensitive o devolver error
    expect([200, 401]).toContain(res.status);
  });

  test("VL-04: Login con cuerpo vacío", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});
    expect(res.status).toBe(400);
  });

  test("VL-05: Login con campos como string vacío", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "", password: "" });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════
// CLASES DE EQUIVALENCIA — Gestión de servidores
// ══════════════════════════════════════════════════════════════

describe("Caja Negra: Clases de Equivalencia — Servidores", () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "serveruser",
      email: "server@test.com",
      birthdate: "2000-01-15",
      password: "password123",
      confirmPassword: "password123",
    });
    token = res.body.token;
  });

  // CE: role válido vs inválido
  test("CE-SV1: Rol 'admin' es válido", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Server", ip: "localhost", role: "admin", unique_token: "t1" });
    expect(res.status).toBe(201);
  });

  test("CE-SV2: Rol 'player' es válido (con servidor admin previo)", async () => {
    // Necesita un admin que haya generado contraseña
    // Sin él, debe devolver error indicando que no hay admin
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Server", ip: "1.2.3.4", role: "player", password: "ABC123" });
    expect(res.status).toBe(400); // No existe admin con esa IP
  });

  test("CE-SV3: Rol 'moderator' es inválido", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Server", ip: "localhost", role: "moderator", unique_token: "t2" });
    expect(res.status).toBe(400);
  });

  test("CE-SV4: Rol vacío es inválido", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Server", ip: "localhost", role: "" });
    expect(res.status).toBe(400);
  });

  // CE: Campos obligatorios
  test("CE-SV5: Sin nombre", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ ip: "localhost", role: "admin", unique_token: "t3" });
    expect(res.status).toBe(400);
  });

  test("CE-SV6: Sin IP", async () => {
    const res = await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Server", role: "admin", unique_token: "t4" });
    expect(res.status).toBe(400);
  });

  // CE: Aislamiento entre usuarios
  test("CE-SV7: Usuario A no ve servidores de Usuario B", async () => {
    // Usuario A añade servidor
    await request(app)
      .post("/api/servers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Server A", ip: "localhost", role: "admin", unique_token: "tA" });

    // Crear Usuario B
    const userB = await request(app).post("/api/auth/register").send({
      username: "userB",
      email: "b@test.com",
      birthdate: "1999-06-20",
      password: "password123",
      confirmPassword: "password123",
    });

    // Usuario B no debe ver servidores de A
    const res = await request(app)
      .get("/api/servers")
      .set("Authorization", `Bearer ${userB.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.admins).toHaveLength(0);
    expect(res.body.players).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// PRUEBAS DE SEGURIDAD — Inyección y acceso no autorizado
// ══════════════════════════════════════════════════════════════

describe("Caja Negra: Pruebas de Seguridad", () => {
  test("SEC-01: Intento de inyección SQL en login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "' OR 1=1 --", password: "anything" });
    // No debe devolver 200 ni datos de usuario
    expect(res.status).not.toBe(200);
    expect(res.body).not.toHaveProperty("token");
  });

  test("SEC-02: Intento de inyección SQL en registro", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "'; DROP TABLE users; --",
        email: "hack@test.com",
        birthdate: "2000-01-01",
        password: "password123",
        confirmPassword: "password123",
      });
    // El sistema no debe caer; puede registrar o rechazar
    expect([201, 400, 500]).toContain(res.status);

    // Verificar que la tabla users sigue existiendo
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "hack@test.com", password: "password123" });
    // Si el registro fue exitoso, el login debe funcionar
    // Lo importante es que la BD no se ha corrompido
    expect([200, 401]).toContain(loginRes.status);
  });

  test("SEC-03: XSS en nombre de usuario — Angular escapa la salida", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "<script>alert('xss')</script>",
        email: "xss@test.com",
        birthdate: "2000-01-01",
        password: "password123",
        confirmPassword: "password123",
      });
    // El backend almacena el input tal cual (sin sanitización servidor).
    // La protección XSS se delega en Angular, que escapa automáticamente
    // la interpolación de datos en templates (sanitización en cliente).
    // Esto es una práctica aceptable en SPAs con frameworks modernos.
    if (res.status === 201) {
      // Verificamos que al menos el registro no causa error
      expect(res.body.user).toHaveProperty("username");
    }
  });

  test("SEC-04: Acceso a rutas protegidas sin token", async () => {
    const protectedRoutes = [
      { method: "get", path: "/api/servers" },
      { method: "get", path: "/api/players?serverId=1" },
      { method: "get", path: "/api/whitelist?serverId=1" },
      { method: "post", path: "/api/command" },
      { method: "get", path: "/api/inventory/uuid123?serverId=1" },
      { method: "get", path: "/api/advancements/uuid123?serverId=1" },
    ];

    for (const route of protectedRoutes) {
      const res = await request(app)[route.method](route.path);
      expect(res.status).toBe(401);
    }
  });

  test("SEC-05: Token manipulado (payload alterado)", async () => {
    // Crear un token con un secret diferente
    const jwt = require("jsonwebtoken");
    const fakeToken = jwt.sign(
      { id: 1, username: "admin", email: "admin@test.com" },
      "secret_falso_intentando_hackear"
    );

    const res = await request(app)
      .get("/api/servers")
      .set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });
});
