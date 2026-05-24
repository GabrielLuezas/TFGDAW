import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ServerEntry } from '../../models/server.model';

type Role = 'player' | 'admin';

@Component({
  selector: 'app-add-server',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onClose()">
      <div class="modal-box mc-panel" (click)="$event.stopPropagation()">
        <h2 class="modal-title">Añadir nuevo servidor</h2>

        <div class="role-section">
          <span class="mc-label" style="font-size:9px">Tipo de usuario</span>
          <div class="role-tabs">
            <button id="role-player" type="button"
              class="mc-btn role-tab" [class.mc-btn-green]="role() === 'player'"
              (click)="role.set('player')">🎮 Jugador</button>
            <button id="role-admin" type="button"
              class="mc-btn role-tab" [class.mc-btn-red]="role() === 'admin'"
              (click)="role.set('admin')">⚙ Admin</button>
          </div>
        </div>

        <form (ngSubmit)="onSubmit()" class="modal-form">
          <div class="field-group">
            <span class="mc-label">Nombre del servidor</span>
            <input id="srv-name" type="text" [(ngModel)]="form.name" name="name"
              class="mc-input" placeholder="Mi servidor Minecraft" required />
          </div>
          <div class="field-group">
            <span class="mc-label">IP del servidor</span>
            <input id="srv-ip" type="text" [(ngModel)]="form.ip" name="ip"
              class="mc-input" placeholder="192.168.1.100" required />
          </div>

          @if (role() === 'admin') {
            <div class="ports-row">
              <div class="field-group">
                <span class="mc-label">Puerto API</span>
                <input id="srv-api-port" type="number" [(ngModel)]="form.api_port"
                  name="api_port" class="mc-input" placeholder="8081" />
              </div>
              <div class="field-group">
                <span class="mc-label">Puerto WS</span>
                <input id="srv-ws-port" type="number" [(ngModel)]="form.ws_port"
                  name="ws_port" class="mc-input" placeholder="8082" />
              </div>
            </div>

            <div class="field-group">
              <span class="mc-label">Host API del plugin <span style="color:#aaa;font-size:7px">(opcional)</span></span>
              <input id="srv-api-host" type="text" [(ngModel)]="form.api_host"
                name="api_host" class="mc-input"
                placeholder="localhost — solo si el plugin no es accesible por la IP pública" />
              <p class="field-hint">Deja vacío si la IP pública ya expone el puerto del plugin.
                Úsa <code>localhost</code> cuando el servidor corre en tu misma máquina (ej: FeatherMC).</p>
            </div>
          }

          @if (role() === 'player') {
            <div class="field-group">
              <span class="mc-label">Contraseña del servidor <span style="color:#ff5555;font-size:7px">(obligatoria)</span></span>
              <input id="srv-password" type="password" [(ngModel)]="form.password"
                name="password" class="mc-input" placeholder="Pídela al administrador del servidor" required />
              <p class="field-hint">El administrador genera esta contraseña desde su panel y te la comparte.</p>
            </div>
          }

          @if (role() === 'admin') {
            <div class="field-group">
              <span class="mc-label">Token de vinculación</span>
              <input id="srv-token" type="text" [(ngModel)]="form.unique_token"
                name="unique_token" class="mc-input token-input"
                placeholder="Ejecuta /linkear en Minecraft" required />
              <p class="field-hint">Usa el comando <code>/linkear</code> en el servidor para obtener el token de vinculación.</p>
            </div>
          }

          @if (error())   { <div class="mc-error">⚠ {{ error() }}</div> }
          @if (success()) { <div class="mc-success">✔ {{ success() }}</div> }

          <div class="modal-btn-row">
            <button id="btn-cancel-add" type="button" class="mc-btn modal-btn"
              (click)="onClose()">Cancelar</button>
            <button id="btn-confirm-add" type="submit" class="mc-btn modal-btn"
              [class.mc-btn-green]="role() === 'player'"
              [class.mc-btn-red]="role() === 'admin'"
              [disabled]="loading()">
              @if (loading()) { <span class="mc-spinner"></span> }
              @else { Añadir servidor }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.78);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.12s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-box {
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem 2rem;
      animation: popUp 0.14s ease;
    }
    @keyframes popUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .modal-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 13px;
      color: #fff;
      text-shadow: 3px 3px #3f3f3f;
      text-align: center;
      margin: 0 0 1.75rem;
    }

    .role-section { margin-bottom: 1.5rem; }
    .role-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .role-tab  { font-size: 9px; padding: 13px; }

    .modal-form  { display: flex; flex-direction: column; gap: 16px; }
    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .ports-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .modal-box .mc-input { font-size: 10px; padding: 13px 14px; }
    .modal-box .mc-label { font-size: 9px; }

    .token-input { font-family: monospace; letter-spacing: 0.08em; }
    .field-hint {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #666;
      margin: 2px 0 0;
      line-height: 1.8;
    }
    .field-hint code {
      background: rgba(255,255,255,0.08);
      padding: 1px 4px;
      color: var(--mc-gold);
    }

    .modal-btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px; }
    .modal-btn { font-size: 9px; padding: 14px; }
  `]
})
export class AddServerComponent {
  @Output() serverAdded = new EventEmitter<ServerEntry>();
  @Output() closed      = new EventEmitter<void>();

  role    = signal<Role>('player');
  loading = signal(false);
  error   = signal('');
  success = signal('');

  form = { name: '', ip: '', api_host: '', api_port: 8081, ws_port: 8082, unique_token: '', password: '' };

  constructor(private api: ApiService) {}

  onSubmit(): void {
    this.error.set(''); this.success.set('');
    if (!this.form.name || !this.form.ip) { this.error.set('Nombre e IP son obligatorios'); return; }
    if (this.role() === 'admin' && !this.form.unique_token) {
      this.error.set('El token del plugin es obligatorio para administradores'); return;
    }

    if (this.role() === 'player' && !this.form.password) {
      this.error.set('La contraseña del servidor es obligatoria'); return;
    }

    const payload: any = {
      name: this.form.name,
      ip: this.form.ip,
      role: this.role(),
    };

    if (this.role() === 'admin') {
      payload.api_host = this.form.api_host?.trim() || undefined;
      payload.api_port = this.form.api_port || 8081;
      payload.ws_port = this.form.ws_port || 8082;
      payload.unique_token = this.form.unique_token;
    } else {
      payload.password = this.form.password;
    }

    this.loading.set(true);
    this.api.addServer(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set('Servidor añadido correctamente');
        setTimeout(() => this.serverAdded.emit(res.server), 800);
      },
      error: (err) => { this.loading.set(false); this.error.set(err.error?.error ?? 'Error al añadir el servidor'); }
    });
  }

  onClose(): void { this.closed.emit(); }
}
