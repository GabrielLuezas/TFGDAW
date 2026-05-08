// ============================================================
// Tests de Carga — Rendimiento del backend bajo estrés
// Ejecutar con: node tests/load.test.js
// Requiere que el backend esté corriendo (npm start)
// ============================================================
const autocannon = require("autocannon");
const http = require("http");

const BASE_URL = "http://localhost:3000";

// ── Helpers ──────────────────────────────────────────────────

async function registerAndLogin() {
  const timestamp = Date.now();
  const userData = JSON.stringify({
    username: `loaduser_${timestamp}`,
    email: `load_${timestamp}@test.com`,
    birthdate: "2000-01-15",
    password: "password123",
    confirmPassword: "password123",
  });

  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.token);
        } catch (e) {
          reject(new Error("No se pudo obtener token: " + data));
        }
      });
    });
    req.on("error", reject);
    req.write(userData);
    req.end();
  });
}

function formatResults(result) {
  return {
    titulo: result.title,
    duracion: `${result.duration}s`,
    conexiones: result.connections,
    peticiones_totales: result.requests.total,
    peticiones_por_segundo: Math.round(result.requests.average),
    latencia_media_ms: Math.round(result.latency.average * 100) / 100,
    latencia_p99_ms: result.latency.p99,
    errores: result.errors,
    timeouts: result.timeouts,
    throughput_MB_s: Math.round(result.throughput.average / 1024 / 1024 * 100) / 100,
    codigos_2xx: result["2xx"],
    codigos_non_2xx: result.non2xx,
  };
}

// ── Tests de Carga ───────────────────────────────────────────

async function runLoadTests() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  PRUEBAS DE CARGA — MinecraftManager Backend");
  console.log("═══════════════════════════════════════════════════\n");

  // Obtener token para rutas protegidas
  let token;
  try {
    token = await registerAndLogin();
    console.log("✅ Token obtenido para pruebas autenticadas\n");
  } catch (e) {
    console.error("❌ Error obteniendo token. ¿El backend está corriendo?");
    console.error("   Ejecuta: npm start (en otra terminal)\n");
    process.exit(1);
  }

  // ── Test 1: Ruta pública (login) ──────────────────────────
  console.log("── Test 1: POST /api/auth/login (ruta pública) ──");
  const loginResult = await autocannon({
    title: "Login - Ruta pública",
    url: `${BASE_URL}/api/auth/login`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `load_${Date.now()}@test.com`, password: "password123" }),
    connections: 10,        // 10 conexiones simultáneas
    duration: 10,           // 10 segundos
    pipelining: 1,
  });
  console.log(formatResults(loginResult));
  console.log();

  // ── Test 2: Ruta protegida (listar servidores) ────────────
  console.log("── Test 2: GET /api/servers (ruta protegida) ──");
  const serversResult = await autocannon({
    title: "Servidores - Ruta protegida",
    url: `${BASE_URL}/api/servers`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    connections: 10,
    duration: 10,
    pipelining: 1,
  });
  console.log(formatResults(serversResult));
  console.log();

  // ── Test 3: Ruta protegida bajo presión ───────────────────
  console.log("── Test 3: GET /api/servers (50 conexiones simultáneas) ──");
  const stressResult = await autocannon({
    title: "Servidores - Estrés (50 conn)",
    url: `${BASE_URL}/api/servers`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    connections: 50,        // 50 conexiones simultáneas
    duration: 10,
    pipelining: 1,
  });
  console.log(formatResults(stressResult));
  console.log();

  // ── Test 4: Ruta sin autenticación (debe devolver 401) ────
  console.log("── Test 4: GET /api/servers sin token (error handling) ──");
  const unauthResult = await autocannon({
    title: "Sin autenticación - Error handling",
    url: `${BASE_URL}/api/servers`,
    method: "GET",
    // Sin header de autorización
    connections: 20,
    duration: 10,
    pipelining: 1,
  });
  console.log(formatResults(unauthResult));
  console.log();

  // ── Resumen ───────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════");
  console.log("  RESUMEN DE PRUEBAS DE CARGA");
  console.log("═══════════════════════════════════════════════════");
  console.log();

  const results = [
    { name: "Login (10 conn)", ...formatResults(loginResult) },
    { name: "Servers (10 conn)", ...formatResults(serversResult) },
    { name: "Servers (50 conn)", ...formatResults(stressResult) },
    { name: "Sin auth (20 conn)", ...formatResults(unauthResult) },
  ];

  console.log("| Test                 | Req/s  | Latencia (ms) | P99 (ms) | Errores |");
  console.log("|----------------------|--------|---------------|----------|---------|");
  for (const r of results) {
    console.log(`| ${r.name.padEnd(20)} | ${String(r.peticiones_por_segundo).padStart(6)} | ${String(r.latencia_media_ms).padStart(13)} | ${String(r.latencia_p99_ms).padStart(8)} | ${String(r.errores).padStart(7)} |`);
  }
  console.log();
  console.log("✅ Pruebas de carga completadas");
}

runLoadTests().catch(console.error);
