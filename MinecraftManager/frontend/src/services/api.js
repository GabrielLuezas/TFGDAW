import axios from "axios";

const API_URL = "http://localhost:3000/api";

export const api = {
  getPlayers: async () => {
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
