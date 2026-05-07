import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Player } from '../models/player.model';
import { InventoryResponse } from '../models/inventory.model';
import { Advancement } from '../models/advancement.model';
import { ServerEntry, ServersResponse } from '../models/server.model';
import { AuthService } from './auth.service';

export interface ServerInfo {
  version: string;
  bukkitVersion: string;
  motd: string;
  onlinePlayers: number;
  maxPlayers: number;
  tps: { last1min: number; last5min: number; last15min: number };
  memory: { used: number; total: number; max: number };
  uptimeMillis: number;
  cpuUsage: number;
  worlds: WorldInfo[];
}

export interface WorldInfo {
  name: string;
  environment: string;
  loadedChunks: number;
  entities: number;
  time: number;
  weather: string;
}

export interface WhitelistResponse {
  players: WhitelistPlayer[];
  enabled: boolean;
}

export interface WhitelistPlayer {
  uuid: string;
  name: string;
  isOnline: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  // ── Helper: cabeceras con JWT ─────────────────────────────

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private get serverId(): number {
    const s = this.auth.activeServer();
    if (!s) throw new Error('No hay servidor activo seleccionado');
    return s.id;
  }

  // ── Gestión de servidores del usuario ─────────────────────

  getServers(): Observable<ServersResponse> {
    return this.http.get<ServersResponse>(`${this.apiUrl}/servers`, { headers: this.headers() });
  }

  addServer(data: {
    name: string;
    ip: string;
    api_port?: number;
    ws_port?: number;
    role: 'player' | 'admin';
    unique_token: string;
    password?: string;
  }): Observable<{ server: ServerEntry }> {
    return this.http.post<{ server: ServerEntry }>(`${this.apiUrl}/servers`, data, { headers: this.headers() });
  }

  deleteServer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/servers/${id}`, { headers: this.headers() });
  }

  generateServerPassword(serverId: number): Observable<{ password: string; message: string }> {
    return this.http.post<{ password: string; message: string }>(
      `${this.apiUrl}/servers/${serverId}/password`, {}, { headers: this.headers() }
    );
  }

  // ── Datos del servidor activo ─────────────────────────────

  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.apiUrl}/players?serverId=${this.serverId}`, { headers: this.headers() });
  }

  sendCommand(command: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/command`, { command, serverId: this.serverId }, { headers: this.headers() });
  }

  getInventory(uuid: string): Observable<InventoryResponse> {
    return this.http.get<InventoryResponse>(`${this.apiUrl}/inventory/${uuid}?serverId=${this.serverId}`, { headers: this.headers() });
  }

  getAdvancements(uuid: string): Observable<{ advancements: Advancement[] }> {
    return this.http.get<{ advancements: Advancement[] }>(`${this.apiUrl}/advancements/${uuid}?serverId=${this.serverId}`, { headers: this.headers() });
  }

  getServerInfo(): Observable<ServerInfo> {
    return this.http.get<ServerInfo>(`${this.apiUrl}/server?serverId=${this.serverId}`, { headers: this.headers() });
  }

  getWhitelist(): Observable<WhitelistResponse> {
    return this.http.get<WhitelistResponse>(`${this.apiUrl}/whitelist?serverId=${this.serverId}`, { headers: this.headers() });
  }

  updateWhitelist(action: string, player?: string): Observable<any> {
    const body: any = { action, serverId: this.serverId };
    if (player) body.player = player;
    return this.http.post(`${this.apiUrl}/whitelist`, body, { headers: this.headers() });
  }

  getMapUrl(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/map-url`, { headers: this.headers() });
  }
}
