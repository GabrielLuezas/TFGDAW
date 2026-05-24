import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-server-password',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sp-outer">
      <div class="sp-card mc-panel">

        <h1 class="sp-title">🔑 Contraseña del servidor</h1>

        <div class="sp-server-row">
          <span class="sp-label">Servidor activo</span>
          <span class="sp-server-name">📡 {{ auth.activeServer()?.name }}</span>
        </div>

        <div class="sp-divider"></div>

        @if (generatedPassword()) {
          <div class="sp-result">
            <span class="sp-label">✅ Contraseña generada</span>
            <div class="sp-password-box">
              <code class="sp-password-code">{{ generatedPassword() }}</code>
              <button id="btn-copy-password" class="mc-btn mc-btn-small"
                (click)="copyPassword()">
                {{ copied() ? '✔ Copiado' : '📋 Copiar' }}
              </button>
            </div>
            <div class="sp-warning">
              ⚠ Guarda esta contraseña ahora. No se volverá a mostrar.<br>
              Generar una nueva invalidará la anterior.
            </div>
          </div>
        } @else {
          <div class="sp-empty">
            <span class="sp-empty-icon">🔒</span>
            <p class="sp-empty-text">No hay contraseña generada.<br>Pulsa el botón para crear una.</p>
          </div>
        }

        @if (error()) {
          <div class="mc-error" style="margin-top:1rem">⚠ {{ error() }}</div>
        }

        <button id="btn-generate-password" class="mc-btn mc-btn-red sp-gen-btn"
          [disabled]="loading()"
          (click)="generatePassword()">
          @if (loading()) { <span class="mc-spinner"></span> }
          @else { 🔑 {{ generatedPassword() ? 'Generar nueva contraseña' : 'Generar contraseña' }} }
        </button>

        <div class="sp-hint">
          <p>Comparte esta contraseña con los jugadores para que puedan añadir tu servidor seleccionando el tipo <strong>Jugador</strong>.</p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .sp-outer {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      box-sizing: border-box;
    }

    .sp-card {
      width: 100%;
      max-width: 520px;
      padding: 2rem;
    }

    .sp-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 13px;
      color: #fff;
      text-shadow: 3px 3px #3f3f3f;
      margin: 0 0 1.5rem;
      text-align: center;
    }

    .sp-server-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 1.25rem;
    }
    .sp-label {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #555;
      text-transform: uppercase;
    }
    .sp-server-name {
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      color: var(--mc-gold);
    }

    .sp-divider {
      height: 2px;
      background: rgba(255,255,255,0.07);
      margin: 1.25rem 0;
    }

    .sp-result { display: flex; flex-direction: column; gap: 12px; }

    .sp-password-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0,0,0,0.5);
      border: 2px solid rgba(255,255,255,0.1);
      padding: 14px 16px;
    }

    .sp-password-code {
      font-family: monospace;
      font-size: 26px;
      color: #55ff55;
      letter-spacing: 0.2em;
      flex: 1;
      text-shadow: 0 0 12px rgba(85,255,85,0.4);
    }

    .mc-btn-small {
      font-size: 8px;
      padding: 8px 12px;
      white-space: nowrap;
      flex-shrink: 0;
      width: auto !important;
      min-width: unset !important;
    }

    .sp-warning {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #ffaa00;
      line-height: 2;
      background: rgba(255,170,0,0.1);
      border: 1px solid rgba(255,170,0,0.3);
      padding: 10px 12px;
    }

    .sp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 1.5rem 0;
    }
    .sp-empty-icon { font-size: 44px; opacity: 0.35; }
    .sp-empty-text {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      color: #555;
      text-align: center;
      line-height: 2;
    }

    .sp-gen-btn {
      width: 100%;
      margin-top: 1.5rem;
      padding: 16px;
      font-size: 10px;
    }

    .sp-hint {
      margin-top: 1rem;
      padding: 10px 12px;
      background: rgba(255,255,255,0.04);
      border-left: 3px solid rgba(255,255,255,0.15);
    }
    .sp-hint p {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #666;
      margin: 0;
      line-height: 2;
    }
    .sp-hint strong { color: #aaa; }
  `]
})
export class ServerPasswordComponent {
  auth    = inject(AuthService);
  private api = inject(ApiService);

  loading           = signal(false);
  error             = signal('');
  generatedPassword = signal('');
  copied            = signal(false);

  generatePassword(): void {
    const server = this.auth.activeServer();
    if (!server) { this.error.set('No hay servidor activo'); return; }

    this.loading.set(true);
    this.error.set('');
    this.generatedPassword.set('');

    this.api.generateServerPassword(server.id).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.generatedPassword.set(res.password);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.error ?? 'Error al generar contraseña');
      }
    });
  }

  copyPassword(): void {
    navigator.clipboard.writeText(this.generatedPassword()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
