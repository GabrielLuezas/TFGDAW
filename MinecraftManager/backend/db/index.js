// ============================================================
// Capa de base de datos con Knex.js — PostgreSQL (Neon)
// ============================================================
const knex = require("knex");
const config = require("../config");

let db;

function createConnection() {
  const dbUrl = config.DATABASE_URL;

  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL no está configurada. Establece la variable de entorno con la cadena de conexión PostgreSQL."
    );
  }

  console.log("[DB] Conectando a PostgreSQL:", dbUrl.replace(/:\/\/.*@/, "://*****@"));
  return knex({
    client: "pg",
    connection: {
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
  });
}

/**
 * Inicializa la conexión y crea las tablas si no existen.
 * Llamar una sola vez al arrancar el servidor.
 */
async function initDb() {
  db = createConnection();

  // --- Tabla: users ---
  const hasUsers = await db.schema.hasTable("users");
  if (!hasUsers) {
    await db.schema.createTable("users", (t) => {
      t.increments("id").primary();
      t.string("username", 50).notNullable().unique();
      t.string("email", 255).notNullable().unique();
      t.date("birthdate").nullable();
      t.string("password_hash", 255).nullable();
      t.string("microsoft_id", 255).nullable().unique();
      t.timestamp("created_at").notNullable().defaultTo(db.fn.now());
    });
    console.log("[DB] Tabla 'users' creada.");
  } else {
    // Migraciones para tablas existentes
    const hasMsId = await db.schema.hasColumn("users", "microsoft_id");
    if (!hasMsId) {
      await db.schema.alterTable("users", (t) => {
        t.string("microsoft_id", 255).nullable().unique();
      });
      console.log("[DB] Columna 'microsoft_id' añadida a 'users'.");
    }
  }

  // --- Tabla: servers ---
  const hasServers = await db.schema.hasTable("servers");
  if (!hasServers) {
    await db.schema.createTable("servers", (t) => {
      t.increments("id").primary();
      t.integer("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      t.string("name", 100).notNullable();
      t.string("ip", 255).notNullable();
      t.string("api_host", 255).nullable();
      t.integer("api_port").notNullable().defaultTo(8081);
      t.integer("ws_port").notNullable().defaultTo(8082);
      t.string("unique_token", 255).notNullable();
      t.string("role", 10).notNullable(); // 'player' o 'admin'
      t.string("server_password", 255).nullable();
      t.timestamp("created_at").notNullable().defaultTo(db.fn.now());
      t.unique(["user_id", "unique_token"]);
    });
    console.log("[DB] Tabla 'servers' creada.");
  } else {
    // Migración: añadir api_host si no existe
    const hasApiHost = await db.schema.hasColumn("servers", "api_host");
    if (!hasApiHost) {
      await db.schema.alterTable("servers", (t) => {
        t.string("api_host", 255).nullable();
      });
      console.log("[DB] Columna 'api_host' añadida a 'servers'.");
    }

    const hasServerPwd = await db.schema.hasColumn("servers", "server_password");
    if (!hasServerPwd) {
      await db.schema.alterTable("servers", (t) => {
        t.string("server_password", 255).nullable();
      });
      console.log("[DB] Columna 'server_password' añadida a 'servers'.");
    }
  }

  console.log("[DB] Inicialización completada.");
  return db;
}

/**
 * Devuelve la instancia de Knex ya inicializada.
 * Usar en los servicios/rutas tras llamar a initDb().
 */
function getDb() {
  if (!db) throw new Error("La base de datos no ha sido inicializada. Llama a initDb() primero.");
  return db;
}

module.exports = { initDb, getDb };
