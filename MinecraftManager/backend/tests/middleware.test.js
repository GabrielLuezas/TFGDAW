// ============================================================
// Tests de Middleware de Autenticación
// ============================================================
const jwt = require("jsonwebtoken");
const config = require("../config");

// Test directo del middleware sin HTTP
const authMiddleware = require("../middleware/auth.middleware");

// ── Helper para crear req/res/next mocks ─────────────────────
function mockReqResNext(headers = {}) {
  const req = { headers };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("Auth Middleware", () => {
  test("PR-34: Rechaza petición sin header Authorization", () => {
    const { req, res, next } = mockReqResNext({});
    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Token no proporcionado");
    expect(next).not.toHaveBeenCalled();
  });

  test("PR-35: Rechaza token sin prefijo Bearer", () => {
    const { req, res, next } = mockReqResNext({ authorization: "Basic abc123" });
    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Token no proporcionado");
    expect(next).not.toHaveBeenCalled();
  });

  test("PR-36: Rechaza token JWT inválido", () => {
    const { req, res, next } = mockReqResNext({ authorization: "Bearer invalidtoken" });
    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Token inválido");
    expect(next).not.toHaveBeenCalled();
  });

  test("PR-37: Rechaza token expirado", () => {
    const expiredToken = jwt.sign(
      { id: 1, username: "test", email: "test@test.com" },
      config.JWT_SECRET,
      { expiresIn: "-1s" } // Ya expirado
    );

    const { req, res, next } = mockReqResNext({ authorization: `Bearer ${expiredToken}` });
    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Token expirado");
    expect(next).not.toHaveBeenCalled();
  });

  test("PR-38: Acepta token válido y asigna req.user", () => {
    const validToken = jwt.sign(
      { id: 42, username: "player1", email: "player@mc.com" },
      config.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const { req, res, next } = mockReqResNext({ authorization: `Bearer ${validToken}` });
    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({
      id: 42,
      username: "player1",
      email: "player@mc.com",
    });
  });
});
