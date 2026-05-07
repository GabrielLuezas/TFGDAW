// Especificación OpenAPI 3.0 del backend MinecraftManager

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "MinecraftManager Backend API",
    description:
      "API REST del backend de MinecraftManager. Gestiona autenticación de usuarios, " +
      "servidores vinculados y actúa como proxy seguro entre el frontend y los plugins de Minecraft.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Servidor local de desarrollo",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token JWT obtenido en /api/auth/login o /api/auth/register",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Mensaje de error" },
        },
      },
      UserAuth: {
        type: "object",
        properties: {
          token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
          user: {
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              username: { type: "string", example: "Steve" },
              email: { type: "string", example: "steve@example.com" },
            },
          },
        },
      },
      Server: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Mi servidor SMP" },
          ip: { type: "string", example: "play.miservidor.com" },
          api_host: { type: "string", nullable: true, example: "192.168.1.50" },
          api_port: { type: "integer", example: 8081 },
          ws_port: { type: "integer", example: 8082 },
          role: { type: "string", enum: ["admin", "player"], example: "admin" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Player: {
        type: "object",
        properties: {
          uuid: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
          name: { type: "string", example: "Steve" },
          health: { type: "number", example: 20.0 },
          food: { type: "integer", example: 18 },
          location: {
            type: "object",
            properties: {
              x: { type: "number", example: 100.5 },
              y: { type: "number", example: 64.0 },
              z: { type: "number", example: -200.3 },
              world: { type: "string", example: "world" },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: "Autenticación", description: "Registro, login y OAuth con Microsoft" },
    { name: "Servidores", description: "Gestión de servidores vinculados del usuario" },
    { name: "Jugadores", description: "Información de jugadores conectados (proxy al plugin)" },
    { name: "Servidor MC", description: "Estado y comandos del servidor Minecraft (proxy al plugin)" },
    { name: "Whitelist", description: "Gestión de la lista blanca (proxy al plugin)" },
    { name: "Recursos", description: "Texturas de Minecraft y mapa BlueMap" },
  ],
  paths: {
    // ═══════════════════════════════════════════════════════════
    //  AUTENTICACIÓN
    // ═══════════════════════════════════════════════════════════
    "/api/auth/register": {
      post: {
        tags: ["Autenticación"],
        summary: "Registrar usuario",
        description: "Crea una nueva cuenta de usuario con email y contraseña. Devuelve un JWT.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "email", "birthdate", "password", "confirmPassword"],
                properties: {
                  username: { type: "string", example: "Steve", minLength: 3, maxLength: 50 },
                  email: { type: "string", format: "email", example: "steve@example.com" },
                  birthdate: { type: "string", format: "date", example: "2000-01-15" },
                  password: { type: "string", minLength: 6, example: "miContraseña123" },
                  confirmPassword: { type: "string", example: "miContraseña123" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Usuario registrado exitosamente",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserAuth" } } },
          },
          400: { description: "Datos de entrada inválidos", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Email o username ya existe", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Autenticación"],
        summary: "Iniciar sesión",
        description: "Autentica al usuario con email y contraseña. Devuelve un JWT válido durante 7 días.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "steve@example.com" },
                  password: { type: "string", example: "miContraseña123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login exitoso",
            content: { "application/json": { schema: { $ref: "#/components/schemas/UserAuth" } } },
          },
          400: { description: "Faltan campos obligatorios" },
          401: { description: "Credenciales incorrectas" },
        },
      },
    },
    "/api/auth/microsoft": {
      get: {
        tags: ["Autenticación"],
        summary: "Login con Microsoft",
        description: "Redirige al usuario a la pantalla de login de Microsoft OAuth 2.0 con PKCE.",
        responses: {
          302: { description: "Redirección a Microsoft login" },
          503: { description: "Microsoft OAuth no configurado" },
        },
      },
    },
    "/api/auth/microsoft/status": {
      get: {
        tags: ["Autenticación"],
        summary: "Estado de configuración Microsoft OAuth",
        description: "Endpoint de diagnóstico que indica si las credenciales de Microsoft están configuradas.",
        responses: {
          200: {
            description: "Estado de la configuración",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    configured: { type: "boolean", example: true },
                    client_id_set: { type: "boolean", example: true },
                    client_secret_set: { type: "boolean", example: true },
                    redirect_uri: { type: "string", example: "http://localhost:3000/api/auth/microsoft/callback" },
                    warning: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/microsoft/callback": {
      get: {
        tags: ["Autenticación"],
        summary: "Callback de Microsoft OAuth",
        description: "Endpoint al que Microsoft redirige tras la autenticación. Crea/busca el usuario y redirige al frontend con el JWT.",
        parameters: [
          { name: "code", in: "query", schema: { type: "string" }, description: "Código de autorización de Microsoft" },
          { name: "state", in: "query", schema: { type: "string" }, description: "Estado PKCE" },
        ],
        responses: {
          302: { description: "Redirección al frontend con token JWT en query params" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Autenticación"],
        summary: "Obtener usuario actual",
        description: "Devuelve los datos del usuario autenticado.",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Datos del usuario",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "integer", example: 1 },
                        username: { type: "string", example: "Steve" },
                        email: { type: "string", example: "steve@example.com" },
                        birthdate: { type: "string", nullable: true, example: "2000-01-15" },
                        created_at: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Token no proporcionado o inválido" },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════
    //  SERVIDORES
    // ═══════════════════════════════════════════════════════════
    "/api/servers": {
      get: {
        tags: ["Servidores"],
        summary: "Listar servidores del usuario",
        description: "Devuelve los servidores vinculados al usuario, separados por rol (admin y player).",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Servidores del usuario",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    players: { type: "array", items: { $ref: "#/components/schemas/Server" } },
                    admins: { type: "array", items: { $ref: "#/components/schemas/Server" } },
                  },
                },
              },
            },
          },
          401: { description: "No autenticado" },
        },
      },
      post: {
        tags: ["Servidores"],
        summary: "Añadir servidor",
        description:
          "Vincula un nuevo servidor. Si el rol es **admin**, se requiere el `unique_token` del plugin (/linkear). " +
          "Si es **player**, se requiere la contraseña generada por el admin.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              examples: {
                admin: {
                  summary: "Añadir como administrador",
                  value: {
                    name: "Mi servidor SMP",
                    ip: "play.miservidor.com",
                    api_host: "192.168.1.50",
                    api_port: 8081,
                    ws_port: 8082,
                    role: "admin",
                    unique_token: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                  },
                },
                player: {
                  summary: "Unirse como jugador",
                  value: {
                    name: "Servidor de amigos",
                    ip: "play.miservidor.com",
                    role: "player",
                    password: "A1B2C3D4",
                  },
                },
              },
              schema: {
                type: "object",
                required: ["name", "ip", "role"],
                properties: {
                  name: { type: "string", example: "Mi servidor SMP" },
                  ip: { type: "string", example: "play.miservidor.com" },
                  api_host: { type: "string", nullable: true, example: "192.168.1.50" },
                  api_port: { type: "integer", default: 8081 },
                  ws_port: { type: "integer", default: 8082 },
                  role: { type: "string", enum: ["admin", "player"] },
                  unique_token: { type: "string", description: "Token del plugin (solo admin)" },
                  password: { type: "string", description: "Contraseña del servidor (solo player)" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Servidor añadido", content: { "application/json": { schema: { type: "object", properties: { server: { $ref: "#/components/schemas/Server" } } } } } },
          400: { description: "Datos inválidos o token/contraseña incorrectos" },
          409: { description: "Servidor ya añadido" },
        },
      },
    },
    "/api/servers/{id}": {
      patch: {
        tags: ["Servidores"],
        summary: "Editar servidor",
        description: "Actualiza el nombre o api_host de un servidor del usuario.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "ID del servidor" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Nuevo nombre" },
                  api_host: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Servidor actualizado", content: { "application/json": { schema: { type: "object", properties: { server: { $ref: "#/components/schemas/Server" } } } } } },
          404: { description: "Servidor no encontrado" },
        },
      },
      delete: {
        tags: ["Servidores"],
        summary: "Eliminar servidor",
        description: "Desvincula un servidor del usuario.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "ID del servidor" }],
        responses: {
          200: { description: "Servidor eliminado", content: { "application/json": { schema: { type: "object", properties: { message: { type: "string", example: "Servidor eliminado" } } } } } },
          404: { description: "Servidor no encontrado" },
        },
      },
    },
    "/api/servers/{id}/password": {
      post: {
        tags: ["Servidores"],
        summary: "Generar contraseña para jugadores",
        description: "El administrador genera una contraseña aleatoria de 8 caracteres que los jugadores usarán para unirse. Solo se muestra una vez.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" }, description: "ID del servidor (debe ser admin)" }],
        responses: {
          200: {
            description: "Contraseña generada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    password: { type: "string", example: "A1B2C3D4" },
                    message: { type: "string", example: "Contraseña generada. Compártela con los jugadores." },
                  },
                },
              },
            },
          },
          404: { description: "Servidor no encontrado o no eres admin" },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════
    //  PROXY AL PLUGIN — Jugadores
    // ═══════════════════════════════════════════════════════════
    "/api/players": {
      get: {
        tags: ["Jugadores"],
        summary: "Listar jugadores conectados",
        description: "Proxy al plugin. Devuelve los jugadores online del servidor Minecraft especificado.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "serverId", in: "query", required: true, schema: { type: "integer" }, description: "ID del servidor" }],
        responses: {
          200: {
            description: "Lista de jugadores",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Player" } } } },
          },
          400: { description: "serverId es obligatorio" },
          401: { description: "No autenticado" },
          500: { description: "Error de conexión con el plugin" },
        },
      },
    },
    "/api/inventory/{uuid}": {
      get: {
        tags: ["Jugadores"],
        summary: "Inventario de jugador",
        description: "Proxy al plugin. Devuelve inventario, ender chest y efectos de poción de un jugador.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "uuid", in: "path", required: true, schema: { type: "string" }, description: "UUID del jugador" },
          { name: "serverId", in: "query", required: true, schema: { type: "integer" }, description: "ID del servidor" },
        ],
        responses: {
          200: { description: "Inventario del jugador" },
          400: { description: "serverId obligatorio o UUID inválido" },
          404: { description: "Jugador no encontrado (offline)" },
        },
      },
    },
    "/api/advancements/{uuid}": {
      get: {
        tags: ["Jugadores"],
        summary: "Avances de jugador",
        description: "Proxy al plugin. Devuelve todos los avances con el progreso del jugador.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "uuid", in: "path", required: true, schema: { type: "string" }, description: "UUID del jugador" },
          { name: "serverId", in: "query", required: true, schema: { type: "integer" }, description: "ID del servidor" },
        ],
        responses: {
          200: { description: "Avances del jugador" },
          400: { description: "serverId obligatorio o UUID inválido" },
          404: { description: "Jugador no encontrado (offline)" },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════
    //  PROXY AL PLUGIN — Servidor MC
    // ═══════════════════════════════════════════════════════════
    "/api/server": {
      get: {
        tags: ["Servidor MC"],
        summary: "Información del servidor Minecraft",
        description: "Proxy al plugin. Devuelve versión, TPS, memoria, CPU, uptime y mundos cargados.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "serverId", in: "query", required: true, schema: { type: "integer" }, description: "ID del servidor" }],
        responses: {
          200: { description: "Información del servidor" },
          400: { description: "serverId obligatorio" },
          500: { description: "Error de conexión con el plugin" },
        },
      },
    },
    "/api/command": {
      post: {
        tags: ["Servidor MC"],
        summary: "Ejecutar comando",
        description: "Proxy al plugin. Ejecuta un comando en la consola del servidor Minecraft.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["command", "serverId"],
                properties: {
                  command: { type: "string", example: "say Hola desde el panel", description: "Comando sin la barra /" },
                  serverId: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Comando ejecutado", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "executed" } } } } } },
          400: { description: "Faltan campos obligatorios" },
          500: { description: "Error de conexión con el plugin" },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════
    //  PROXY AL PLUGIN — Whitelist
    // ═══════════════════════════════════════════════════════════
    "/api/whitelist": {
      get: {
        tags: ["Whitelist"],
        summary: "Obtener whitelist",
        description: "Proxy al plugin. Devuelve la whitelist y si está activada.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "serverId", in: "query", required: true, schema: { type: "integer" }, description: "ID del servidor" }],
        responses: {
          200: { description: "Whitelist del servidor" },
          400: { description: "serverId obligatorio" },
        },
      },
      post: {
        tags: ["Whitelist"],
        summary: "Gestionar whitelist",
        description: "Proxy al plugin. Permite añadir/quitar jugadores o activar/desactivar la whitelist.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              examples: {
                toggle: { summary: "Toggle whitelist", value: { serverId: 1, action: "toggle" } },
                add: { summary: "Añadir jugador", value: { serverId: 1, action: "add", player: "Steve" } },
                remove: { summary: "Quitar jugador", value: { serverId: 1, action: "remove", player: "Steve" } },
              },
              schema: {
                type: "object",
                required: ["serverId", "action"],
                properties: {
                  serverId: { type: "integer", example: 1 },
                  action: { type: "string", enum: ["toggle", "add", "remove"] },
                  player: { type: "string", description: "Nombre del jugador (para add/remove)" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Acción ejecutada" },
          400: { description: "serverId obligatorio" },
        },
      },
    },

    // ═══════════════════════════════════════════════════════════
    //  RECURSOS
    // ═══════════════════════════════════════════════════════════
    "/api/texture/{itemName}": {
      get: {
        tags: ["Recursos"],
        summary: "Textura de ítem Minecraft",
        description: "Devuelve la textura PNG de un ítem de Minecraft. Respuesta cacheada 1 año.",
        parameters: [{ name: "itemName", in: "path", required: true, schema: { type: "string" }, example: "diamond_sword", description: "Nombre del ítem en minúsculas" }],
        responses: {
          200: { description: "Imagen PNG", content: { "image/png": { schema: { type: "string", format: "binary" } } } },
          404: { description: "Textura no encontrada" },
        },
      },
    },
    "/api/map-url": {
      get: {
        tags: ["Recursos"],
        summary: "URL de BlueMap",
        description: "Devuelve la URL configurada del mapa BlueMap del servidor.",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "URL del mapa",
            content: { "application/json": { schema: { type: "object", properties: { url: { type: "string", example: "http://localhost:8100" } } } } },
          },
        },
      },
    },
  },
};
