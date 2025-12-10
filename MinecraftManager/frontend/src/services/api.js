import axios from "axios";

// BUSCA LA VARIABLE DE ENTORNO. SI NO EXISTE (EN TU PC), USA LOCALHOST.
// Nota: Fíjate que quito el "/api" del string por defecto y lo añado después para evitar dobles barras
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_URL = `${BASE_URL}/api`;

export const api = {
  getPlayers: async () => {
    // Esto resultará en: https://tu-backend.onrender.com/api/players
    const response = await axios.get(`${API_URL}/players`);
    return response.data;
  },
  sendCommand: async (command) => {
    const response = await axios.post(`${API_URL}/command`, { command });
    return response.data;
  },
  getInventory: async (uuid) => {
    const response = await axios.get(`${API_URL}/inventory/${uuid}`);
    return response.data;
  },
  getAdvancements: async (uuid) => {
    const response = await axios.get(`${API_URL}/advancements/${uuid}`);
    return response.data;
  },
};