export interface ServerEntry {
  id: number;
  name: string;
  ip: string;
  api_port: number;
  ws_port: number;
  role: 'player' | 'admin';
  created_at: string;
}

export interface ServersResponse {
  players: ServerEntry[];
  admins: ServerEntry[];
}
