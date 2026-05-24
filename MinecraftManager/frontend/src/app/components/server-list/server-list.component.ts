import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ServerEntry } from '../../models/server.model';
import { AddServerComponent } from '../add-server/add-server.component';

@Component({
  selector: 'app-server-list',
  standalone: true,
  imports: [CommonModule, AddServerComponent],
  template: `
    <div class="mc-dirt-bg sl-wrap">

      <header class="sl-header">
        <div class="sl-header-title">
          <span style="font-size:1.6rem;filter:drop-shadow(0 0 6px rgba(255,170,0,0.5))">⛏️</span>
          <span class="header-brand"><span class="Brand-gold">Minecraft</span>Manager</span>
        </div>
        <div class="sl-header-right">
          <span class="header-user">👤 {{ auth.user()?.username }}</span>
          <button id="btn-logout" class="mc-btn mc-btn-red header-logout-btn" (click)="logout()">
            Salir
          </button>
        </div>
      </header>

      <main class="sl-main">
        <h2 class="sl-title">Multijugador</h2>

        @if (loading()) {
          <p class="sl-loading">Cargando servidores...</p>
        } @else {
          <div class="sl-columns">

            <div class="sl-column">
              <div class="sl-col-header sl-col-green">
                <span>🎮 Servidores donde juego</span>
                <span class="sl-count">{{ playerServers().length }}</span>
              </div>
              <div class="sl-list">
                @for (srv of playerServers(); track srv.id) {
                  <div class="sl-card sl-card-player" (click)="selectServer(srv)"
                    [id]="'server-player-' + srv.id">
                    <div class="sl-card-icon">🌍</div>
                    <div class="sl-card-info">
                      <div class="sl-card-name">{{ srv.name }}</div>
                      <div class="sl-card-ip">{{ srv.ip }}:{{ srv.api_port }}</div>
                    </div>
                    <div class="sl-card-meta">
                      <span class="sl-badge sl-badge-green">Jugador</span>
                      <button class="sl-del" (click)="deleteServer($event, srv)">✕</button>
                    </div>
                  </div>
                }
                @if (playerServers().length === 0) {
                  <p class="sl-empty">Sin servidores registrados</p>
                }
              </div>
            </div>

            <div class="sl-column">
              <div class="sl-col-header sl-col-red">
                <span>⚙ Servidores que administro</span>
                <span class="sl-count">{{ adminServers().length }}</span>
              </div>
              <div class="sl-list">
                @for (srv of adminServers(); track srv.id) {
                  <div class="sl-card sl-card-admin" (click)="selectServer(srv)"
                    [id]="'server-admin-' + srv.id">
                    <div class="sl-card-icon">🛡️</div>
                    <div class="sl-card-info">
                      <div class="sl-card-name">{{ srv.name }}</div>
                      <div class="sl-card-ip">{{ srv.ip }}:{{ srv.api_port }}</div>
                    </div>
                    <div class="sl-card-meta">
                      <span class="sl-badge sl-badge-red">Admin</span>
                      <button class="sl-del" (click)="deleteServer($event, srv)">✕</button>
                    </div>
                  </div>
                }
                @if (adminServers().length === 0) {
                  <p class="sl-empty">Sin servidores registrados</p>
                }
              </div>
            </div>
          </div>

          <div class="sl-actions">
            <button id="btn-add-server" class="mc-btn mc-btn-green sl-btn"
              (click)="showAddModal.set(true)">
              ＋ Añadir servidor
            </button>
            <button class="mc-btn sl-btn" (click)="loadServers()">
              ↻ Actualizar
            </button>
          </div>
        }
      </main>

      @if (showAddModal()) {
        <app-add-server
          (serverAdded)="onServerAdded($event)"
          (closed)="showAddModal.set(false)"
        />
      }
    </div>
  `,
  styles: [`
    .sl-wrap { min-height: 100vh; display: flex; flex-direction: column; }

    .sl-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 24px;
      background: rgba(0,0,0,0.6);
      border-bottom: 3px solid rgba(0,0,0,0.5);
      box-shadow: 0 2px 0 rgba(255,255,255,0.04);
    }
    .sl-header-title { display: flex; align-items: center; gap: 12px; }
    .header-brand {
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      color: #fff;
      text-shadow: 2px 2px #3f3f3f;
    }
    .Brand-gold { color: var(--mc-gold); text-shadow: 2px 2px #5a3d00; }
    .sl-header-right { display: flex; align-items: center; gap: 16px; }
    .header-user {
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      color: #aaa;
    }
    .header-logout-btn { min-width: auto; padding: 10px 14px; font-size: 9px; }

    .sl-main { flex: 1; padding: 2.5rem 2rem; max-width: 1040px; margin: 0 auto; width: 100%; }

    .sl-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 18px;
      color: #fff;
      text-shadow: 3px 3px #3f3f3f;
      text-align: center;
      margin: 0 0 2.5rem;
    }

    .sl-loading {
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      color: #aaa;
      text-align: center;
      margin-top: 4rem;
    }

    .sl-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.75rem;
    }
    @media (max-width: 680px) { .sl-columns { grid-template-columns: 1fr; } }

    .sl-column {
      background: rgba(0,0,0,0.5);
      border: 2px solid rgba(255,255,255,0.07);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03), 2px 2px 0 rgba(0,0,0,0.6);
      min-height: 260px;
    }

    .sl-col-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 16px;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      letter-spacing: 0.04em;
      border-bottom: 2px solid rgba(0,0,0,0.4);
    }
    .sl-col-green { border-top: 4px solid var(--mc-emerald); color: #aaffcc; text-shadow: 1px 1px #083d1a; }
    .sl-col-red   { border-top: 4px solid var(--mc-red);     color: #ffaaaa; text-shadow: 1px 1px #500; }
    .sl-count {
      background: rgba(0,0,0,0.45);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 3px 10px;
      font-size: 8px;
    }

    .sl-list { padding: 10px; display: flex; flex-direction: column; gap: 7px; }
    .sl-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
      transition: background 0.08s;
      box-shadow: inset 1px 1px 0 rgba(255,255,255,0.05);
    }
    .sl-card:hover { background: rgba(255,255,255,0.1); }
    .sl-card-player:hover { border-color: var(--mc-emerald); }
    .sl-card-admin:hover  { border-color: var(--mc-red); }

    .sl-card-icon { font-size: 1.6rem; flex-shrink: 0; }
    .sl-card-info { flex: 1; min-width: 0; }
    .sl-card-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      color: #fff;
      text-shadow: 1px 1px #3f3f3f;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sl-card-ip {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #666;
      margin-top: 5px;
    }

    .sl-card-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .sl-badge {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      padding: 4px 9px;
      border: 1px solid;
    }
    .sl-badge-green { background: rgba(34,197,94,0.15); color: #86efac; border-color: rgba(34,197,94,0.35); }
    .sl-badge-red   { background: rgba(239,68,68,0.15);  color: #fca5a5; border-color: rgba(239,68,68,0.35); }

    .sl-del {
      background: none; border: none; color: #555; font-size: 12px;
      cursor: pointer; padding: 3px 5px; transition: color 0.1s; font-family: monospace;
    }
    .sl-del:hover { color: var(--mc-red); }
    .sl-empty {
      font-family: 'Press Start 2P', monospace; font-size: 8px; color: #444;
      text-align: center; padding: 2rem 0;
    }

    .sl-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .sl-btn { max-width: 260px; font-size: 10px; padding: 14px; }
  `]
})
export class ServerListComponent implements OnInit {
  playerServers = signal<ServerEntry[]>([]);
  adminServers  = signal<ServerEntry[]>([]);
  loading       = signal(true);
  showAddModal  = signal(false);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void { this.loadServers(); }

  loadServers(): void {
    this.loading.set(true);
    this.api.getServers().subscribe({
      next: (res) => { this.playerServers.set(res.players); this.adminServers.set(res.admins); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectServer(srv: ServerEntry): void {
    this.auth.setActiveServer(srv);
    const destination = srv.role === 'admin' ? '/dashboard' : '/players';
    this.router.navigate([destination]);
  }

  deleteServer(event: Event, srv: ServerEntry): void {
    event.stopPropagation();
    if (!confirm(`¿Eliminar el servidor "${srv.name}"?`)) return;
    this.api.deleteServer(srv.id).subscribe({ next: () => this.loadServers() });
  }

  onServerAdded(srv: ServerEntry): void { this.showAddModal.set(false); this.loadServers(); }
  logout(): void { this.auth.logout(); }
}
