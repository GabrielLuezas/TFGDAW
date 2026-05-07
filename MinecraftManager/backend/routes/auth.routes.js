// Rutas de autenticación
// POST /api/auth/register                → Registro de usuario
// POST /api/auth/login                   → Login con email + contraseña → JWT
// GET  /api/auth/microsoft               → Redirige a Microsoft OAuth
// GET  /api/auth/microsoft/callback      → Callback de Microsoft OAuth

const { Router } = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const axios  = require("axios");
const qs     = require("querystring");
const { getDb } = require("../db");
const config = require("../config");

const router = Router();

// Almacén temporal de PKCE code_verifiers, keyed by state
const pkceStore = new Map();

// ── Helpers ──────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── POST /api/auth/register ───────────────────────────────────
router.post("/register", async (req, res) => {
  const { username, email, birthdate, password, confirmPassword } = req.body;

  if (!username || !email || !birthdate || !password || !confirmPassword)
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  if (!validateEmail(email))
    return res.status(400).json({ error: "Email no válido" });
  if (password !== confirmPassword)
    return res.status(400).json({ error: "Las contraseñas no coinciden" });
  if (password.length < 6)
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  if (username.length < 3 || username.length > 50)
    return res.status(400).json({ error: "El nombre de usuario debe tener entre 3 y 50 caracteres" });

  const db = getDb();
  try {
    const existing = await db("users").where({ email }).orWhere({ username }).first();
    if (existing) {
      if (existing.email === email)
        return res.status(409).json({ error: "El email ya está registrado" });
      return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [{ id }] = await db("users").insert({ username, email, birthdate, password_hash }).returning("id");
    const user = await db("users").where({ id }).first();
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("[Auth] Error en registro:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña son obligatorios" });

  const db = getDb();
  try {
    const user = await db("users").where({ email }).first();
    if (!user || !user.password_hash)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error("[Auth] Error en login:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ── GET /api/auth/microsoft ───────────────────────────────────
// Redirige al usuario a la pantalla de login de Microsoft
router.get("/microsoft", (req, res) => {
  if (!config.MICROSOFT_CLIENT_ID) {
    return res.status(503).json({
      error: "Microsoft OAuth no configurado. Define MICROSOFT_CLIENT_ID y MICROSOFT_CLIENT_SECRET en las variables de entorno."
    });
  }

  // Generar PKCE code_verifier y code_challenge
  const codeVerifier  = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");

  // Guardar el verifier para usarlo en el callback
  pkceStore.set(state, codeVerifier);
  // Limpiar automáticamente después de 10 min
  setTimeout(() => pkceStore.delete(state), 10 * 60 * 1000);

  const params = new URLSearchParams({
    client_id:            config.MICROSOFT_CLIENT_ID,
    response_type:        "code",
    redirect_uri:         config.MICROSOFT_REDIRECT_URI,
    response_mode:        "query",
    scope:                "openid profile email User.Read",
    state,
    code_challenge:       codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
  console.log("[Auth/Microsoft] Redirigiendo a:", authUrl);
  res.redirect(authUrl);
});

// ── GET /api/auth/microsoft/status ────────────────────────────
// Endpoint de diagnóstico: comprueba si las credenciales están configuradas
router.get("/microsoft/status", (req, res) => {
  const clientId     = config.MICROSOFT_CLIENT_ID;
  const clientSecret = config.MICROSOFT_CLIENT_SECRET;
  const redirectUri  = config.MICROSOFT_REDIRECT_URI;

  const secretLooksLikeUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientSecret);

  return res.json({
    configured: !!clientId && !!clientSecret,
    client_id_set:        !!clientId,
    client_secret_set:    !!clientSecret,
    redirect_uri:         redirectUri,
    warning: secretLooksLikeUUID
      ? "⚠️ El MICROSOFT_CLIENT_SECRET parece un UUID (Secret ID). En Azure, copia el campo \"Valor\", no el \"Id. de secreto\"."
      : null,
  });
});

// ── GET /api/auth/microsoft/callback ─────────────────────────
// Microsoft redirige aquí con el código de autorización
router.get("/microsoft/callback", async (req, res) => {
  const { code, error: msError, error_description, state } = req.query;

  if (msError) {
    console.error("[Auth/Microsoft] Error devuelto por Microsoft:", msError, error_description);
    if (state) pkceStore.delete(state);
    const msg = encodeURIComponent(error_description || msError);
    return res.redirect(`${config.FRONTEND_URL}/login?error=microsoft_denied&msg=${msg}`);
  }

  if (!code) {
    return res.redirect(`${config.FRONTEND_URL}/login?error=no_code`);
  }

  // Recuperar el code_verifier de PKCE
  const codeVerifier = state ? pkceStore.get(state) : undefined;
  if (state) pkceStore.delete(state);

  try {
    // 1. Intercambiar código por access_token
    console.log("[Auth/Microsoft] Intercambiando código por token...");
    let tokenResponse;
    try {
      const tokenBody = {
          client_id:     config.MICROSOFT_CLIENT_ID,
          client_secret: config.MICROSOFT_CLIENT_SECRET,
          code,
          redirect_uri:  config.MICROSOFT_REDIRECT_URI,
          grant_type:    "authorization_code",
        };
      // Incluir code_verifier si se generó PKCE
      if (codeVerifier) tokenBody.code_verifier = codeVerifier;

      tokenResponse = await axios.post(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        qs.stringify(tokenBody),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
    } catch (tokenErr) {
      // Log completo del error de Microsoft para diagnóstico
      const msData = tokenErr.response?.data;
      console.error("[Auth/Microsoft] Error al obtener token:",
        "HTTP", tokenErr.response?.status,
        "|", msData?.error,
        "|", msData?.error_description
      );
      const msg = encodeURIComponent(
        msData?.error_description || msData?.error || tokenErr.message
      );
      return res.redirect(`${config.FRONTEND_URL}/login?error=microsoft_failed&msg=${msg}`);
    }

    const { access_token } = tokenResponse.data;

    // 2. Obtener datos del usuario desde Microsoft Graph
    console.log("[Auth/Microsoft] Obteniendo perfil de Microsoft Graph...");
    const profileResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const msUser   = profileResponse.data;
    const msId     = msUser.id;
    const email    = msUser.mail || msUser.userPrincipalName || `${msId}@microsoft.com`;
    const username = msUser.displayName || msUser.givenName || `ms_${msId.substring(0, 8)}`;

    console.log("[Auth/Microsoft] Perfil obtenido:", { msId, email, username });

    const db = getDb();

    // 3. Buscar o crear usuario por microsoft_id o email
    let user = await db("users").where({ microsoft_id: msId }).first()
      || await db("users").where({ email }).first();

    if (!user) {
      let finalUsername = username;
      const existing = await db("users").where({ username }).first();
      if (existing) finalUsername = `${username}_${msId.substring(0, 4)}`;

      const [{ id }] = await db("users").insert({
        username: finalUsername,
        email,
        microsoft_id: msId,
        password_hash: null,
        birthdate: null,
      }).returning("id");
      user = await db("users").where({ id }).first();
      console.log("[Auth/Microsoft] Usuario nuevo creado:", user.id, user.username);
    } else if (!user.microsoft_id) {
      await db("users").where({ id: user.id }).update({ microsoft_id: msId });
      console.log("[Auth/Microsoft] microsoft_id vinculado al usuario existente:", user.id);
    } else {
      console.log("[Auth/Microsoft] Usuario existente encontrado:", user.id, user.username);
    }

    // 4. Generar JWT y redirigir al frontend
    const token = signToken(user);
    const redirectUrl = new URL(`${config.FRONTEND_URL}/auth/microsoft-callback`);
    redirectUrl.searchParams.set("token",    token);
    redirectUrl.searchParams.set("userId",   user.id);
    redirectUrl.searchParams.set("username", user.username);
    redirectUrl.searchParams.set("email",    user.email);

    console.log("[Auth/Microsoft] ✅ Login exitoso, redirigiendo al frontend");
    return res.redirect(redirectUrl.toString());

  } catch (err) {
    console.error("[Auth/Microsoft] Error inesperado:", err.message);
    return res.redirect(`${config.FRONTEND_URL}/login?error=microsoft_failed`);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
const authMiddleware = require("../middleware/auth.middleware");

router.get("/me", authMiddleware, async (req, res) => {
  const db = getDb();
  try {
    const user = await db("users")
      .select("id", "username", "email", "birthdate", "created_at")
      .where({ id: req.user.id })
      .first();
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
