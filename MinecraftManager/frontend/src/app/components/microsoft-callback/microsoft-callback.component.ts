import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

/**
 * /auth/microsoft-callback
 *
 * El backend redirige aquí con los parámetros:
 *   ?token=JWT&userId=1&username=Steve&email=steve@example.com
 *
 * Si hay ?error=... mostramos el error y dejamos volver al login.
 */
@Component({
  selector: 'app-microsoft-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mc-dirt-bg cb-wrap">
      <div class="cb-box mc-panel">
        @if (error()) {
          <p class="cb-icon">❌</p>
          <h2 class="cb-title" style="color:#fca5a5">Error al iniciar sesión</h2>
          <p class="cb-msg mc-label">{{ errorMsg() }}</p>
          <button class="mc-btn cb-btn" (click)="goLogin()">Volver al login</button>
        } @else {
          <p class="cb-icon">⏳</p>
          <h2 class="cb-title">Iniciando sesión...</h2>
          <p class="mc-label" style="text-align:center">Espera un momento</p>
          <div style="display:flex;justify-content:center;margin-top:1rem">
            <span class="mc-spinner"></span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .cb-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .cb-box {
      width: 100%;
      max-width: 420px;
      text-align: center;
    }
    .cb-icon { font-size: 2.5rem; margin: 0 0 1rem; }
    .cb-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 11px;
      color: #fff;
      text-shadow: 2px 2px #3f3f3f;
      margin: 0 0 1.25rem;
    }
    .cb-msg {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      color: #fca5a5;
      margin-bottom: 1.25rem;
      display: block;
    }
    .cb-btn { max-width: 260px; margin: 0 auto; }
  `]
})
export class MicrosoftCallbackComponent implements OnInit {
  error    = () => this._error;
  errorMsg = () => this._errorMsg;

  private _error    = false;
  private _errorMsg = '';

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private auth:   AuthService
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;

    // Caso error: Microsoft rechazó o config incorrecta
    const msError = params.get('error');
    if (msError) {
      this._error = true;
      this._errorMsg = this.friendlyError(msError);
      return;
    }

    // Caso éxito: guardar sesión y redirigir
    const token    = params.get('token');
    const userId   = params.get('userId');
    const username = params.get('username');
    const email    = params.get('email');

    if (!token || !userId || !username || !email) {
      this._error    = true;
      this._errorMsg = 'Respuesta incompleta del servidor';
      return;
    }

    const user: User = { id: Number(userId), username, email };
    this.auth.setSession({ token, user });
    this.router.navigate(['/servers']);
  }

  goLogin(): void { this.router.navigate(['/login']); }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      microsoft_denied:  'Acceso denegado en Microsoft.',
      no_code:           'No se recibió código de autorización.',
      microsoft_failed:  'Error al contactar con Microsoft.',
    };
    return map[code] ?? `Error desconocido (${code})`;
  }
}
