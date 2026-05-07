-- ============================================================
-- MinecraftManager - Schema SQL
-- Compatible con PostgreSQL (y SQLite via Knex)
--
-- Para migrar a PostgreSQL:
--   1. Apuntar DATABASE_URL=postgres://user:pass@host:5432/db
--   2. Ejecutar este script en la base de datos PostgreSQL
--   3. El resto del código no cambia
-- ============================================================

-- Tabla de usuarios de la aplicación web
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,          -- INTEGER AUTOINCREMENT en SQLite (Knex lo abstrae)
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    birthdate   DATE,                        -- Nullable (puede no proporcionarse)
    password_hash VARCHAR(255),              -- NULL si usa autenticación Microsoft
    microsoft_id  VARCHAR(255) UNIQUE,       -- ID del proveedor OAuth de Microsoft
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de servidores vinculados por usuario
-- Cada usuario puede tener varios servidores con rol diferente por servidor
CREATE TABLE IF NOT EXISTS servers (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    ip           VARCHAR(255) NOT NULL,
    api_host     VARCHAR(255),               -- Host alternativo para la API del plugin (nullable)
    api_port     INTEGER      NOT NULL DEFAULT 8081,
    ws_port      INTEGER      NOT NULL DEFAULT 8082,
    -- Token generado por el plugin con /linkear — se valida al añadir el servidor
    unique_token VARCHAR(255) NOT NULL,
    -- 'player' = solo monitorización limitada, 'admin' = control total
    role         VARCHAR(10)  NOT NULL CHECK (role IN ('player', 'admin')),
    -- Contraseña hasheada del servidor (solo para admins; los jugadores la usan para unirse)
    server_password VARCHAR(255),
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Un usuario no puede vincular dos veces el mismo servidor con el mismo rol
    UNIQUE (user_id, unique_token)
);

-- ============================================================
-- Índices para mejorar rendimiento en consultas frecuentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_servers_user_id    ON servers(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id);
