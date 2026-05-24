import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="mc-sidebar">
      <div class="sidebar-logo-area">
        <div class="sidebar-logo-text">
          <span class="logo-mc">MC</span><span class="logo-mgr">Manager</span>
        </div>
        <div class="sidebar-server-name">
          📡 {{ auth.activeServer()?.name ?? 'Sin servidor' }}
        </div>
      </div>

      <div class="sidebar-role" [class.role-admin]="auth.isAdmin()" [class.role-player]="!auth.isAdmin()">
        {{ auth.isAdmin() ? '⚙ ADMINISTRADOR' : '🎮 JUGADOR' }}
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="nav-item-active"
            [routerLinkActiveOptions]="{ exact: false }"
            class="nav-item"
            [id]="'nav-' + item.id"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <span class="user-head">🪖</span>
          <span class="user-name">{{ auth.user()?.username }}</span>
        </div>
        <div class="sidebar-action-row">
          <button id="btn-change-server" class="mc-btn sidebar-action-btn"
            (click)="changeServer()" title="Cambiar servidor">🔄</button>
          <button id="btn-logout-sidebar" class="mc-btn mc-btn-red sidebar-action-btn"
            (click)="logout()" title="Cerrar sesión">🚪</button>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .mc-sidebar {
      width: 250px;
      flex-shrink: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #1a1000;
      background-image:
        repeating-linear-gradient(0deg,   transparent, transparent 15px, rgba(0,0,0,0.25) 15px, rgba(0,0,0,0.25) 16px),
        repeating-linear-gradient(90deg,  transparent, transparent 15px, rgba(0,0,0,0.25) 15px, rgba(0,0,0,0.25) 16px);
      border-right: 3px solid rgba(0,0,0,0.5);
      box-shadow: 2px 0 0 rgba(255,255,255,0.04);
      overflow: hidden;
    }

    .sidebar-logo-area {
      padding: 16px 14px 12px;
      background: rgba(0,0,0,0.45);
      border-bottom: 2px solid rgba(0,0,0,0.5);
      box-shadow: 0 1px 0 rgba(255,255,255,0.04);
    }
    .sidebar-logo-text {
      display: flex;
      align-items: baseline;
      gap: 0;
      margin-bottom: 8px;
    }
    .logo-mc {
      font-family: 'Press Start 2P', monospace;
      font-size: 19px;
      color: var(--mc-gold);
      text-shadow: 3px 3px #5a3d00;
    }
    .logo-mgr {
      font-family: 'Press Start 2P', monospace;
      font-size: 11px;
      color: #fff;
      text-shadow: 2px 2px #3f3f3f;
      align-self: flex-end;
      margin-bottom: 2px;
    }
    .sidebar-server-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #777;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar-role {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      padding: 10px 14px;
      text-align: center;
      letter-spacing: 0.08em;
    }
    .role-admin  { background: rgba(180,0,0,0.3); color: #ffaaaa; border-bottom: 2px solid rgba(180,0,0,0.4); text-shadow: 1px 1px #500; }
    .role-player { background: rgba(0,140,60,0.25); color: #aaffcc; border-bottom: 2px solid rgba(0,140,60,0.3); text-shadow: 1px 1px #083d1a; }

    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 16px;
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      color: #999;
      text-decoration: none;
      text-shadow: 1px 1px #000;
      border-left: 3px solid transparent;
      transition: background 0.08s, color 0.08s;
    }
    .nav-item:hover {
      background: rgba(255,255,255,0.07);
      color: #fff;
    }
    .nav-item-active {
      color: var(--mc-gold) !important;
      background: rgba(255,170,0,0.12) !important;
      border-left-color: var(--mc-gold) !important;
      text-shadow: 1px 1px #5a3d00 !important;
    }
    .nav-icon { width: 22px; text-align: center; font-size: 16px; }
    .nav-label {}

    .sidebar-footer {
      padding: 12px 14px;
      background: rgba(0,0,0,0.45);
      border-top: 2px solid rgba(0,0,0,0.5);
      box-shadow: 0 -1px 0 rgba(255,255,255,0.04);
    }
    .sidebar-user {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .user-head { font-size: 18px; }
    .user-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      color: #aaa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .sidebar-action-row { display: flex; gap: 6px; }
    .sidebar-action-btn {
      flex: 1;
      min-width: auto;
      padding: 7px 4px;
      font-size: 11px;
    }
  `]
})
export class SidebarComponent {
  auth   = inject(AuthService);
  router = inject(Router);

  navItems() {
    const isAdmin = this.auth.isAdmin();
    const all = [
      { id: 'dashboard',       path: '/dashboard',       label: 'Servidor',    icon: '📊', adminOnly: true },
      { id: 'players',         path: '/players',          label: 'Jugadores',   icon: '👥' },
      { id: 'chat',            path: '/chat',             label: 'Chat',        icon: '💬' },
      { id: 'advancements',    path: '/advancements',     label: 'Logros',      icon: '🏆' },
      { id: 'inventory',       path: '/inventory',        label: 'Inventarios', icon: '🎒' },
      { id: 'whitelist',       path: '/whitelist',        label: 'Whitelist',   icon: '📋', adminOnly: true },
      { id: 'map',             path: '/map',              label: 'Mapa',        icon: '🗺️' },
      { id: 'server-password', path: '/server-password',  label: 'Contraseña',  icon: '🔑', adminOnly: true },
    ];
    return isAdmin ? all : all.filter(i => !i.adminOnly);
  }

  changeServer(): void {
    this.auth.clearActiveServer();
    this.router.navigate(['/servers']);
  }

  logout(): void { this.auth.logout(); }
}
