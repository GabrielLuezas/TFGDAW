// ============================================================
// Configuración global de tests — Base de datos en memoria (SQLite)
// ============================================================
const knex = require("knex");

let testDb;

/**
 * Crea una base de datos SQLite en memoria con el esquema del proyecto.
 * Se usa para tests sin depender de PostgreSQL externo.
 */
async function setupTestDb() {
  testDb = knex({
    client: "better-sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });

  // Crear tabla users
  await testDb.schema.createTable("users", (t) => {
    t.increments("id").primary();
    t.string("username", 50).notNullable().unique();
    t.string("email", 255).notNullable().unique();
    t.date("birthdate").nullable();
    t.string("password_hash", 255).nullable();
    t.string("microsoft_id", 255).nullable().unique();
    t.timestamp("created_at").notNullable().defaultTo(testDb.fn.now());
  });

  // Crear tabla servers
  await testDb.schema.createTable("servers", (t) => {
    t.increments("id").primary();
    t.integer("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.string("name", 100).notNullable();
    t.string("ip", 255).notNullable();
    t.string("api_host", 255).nullable();
    t.integer("api_port").notNullable().defaultTo(8081);
    t.integer("ws_port").notNullable().defaultTo(8082);
    t.string("unique_token", 255).notNullable();
    t.string("role", 10).notNullable();
    t.string("server_password", 255).nullable();
    t.timestamp("created_at").notNullable().defaultTo(testDb.fn.now());
    t.unique(["user_id", "unique_token"]);
  });

  return testDb;
}

function getTestDb() {
  return testDb;
}

async function teardownTestDb() {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
}

module.exports = { setupTestDb, getTestDb, teardownTestDb };
