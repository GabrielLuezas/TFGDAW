import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="mc-dirt-bg login-wrap">
      <div class="login-center">

        <div class="login-logo">
          <span class="logo-pickaxe">⛏️</span>
          <h1 class="mc-title" style="font-size:28px">
            <span class="mc-title-gold">Minecraft</span>Manager
          </h1>
          <p class="login-edition">Panel de Administración</p>
        </div>

        <div class="login-panel mc-panel">
          <h2 class="login-heading">Iniciar Sesión</h2>

          <form (ngSubmit)="onLogin()" class="login-form" autocomplete="off">
            <div class="field-group">
              <span class="mc-label">Correo electrónico</span>
              <input
                id="login-email"
                type="email"
                [(ngModel)]="email"
                name="email"
                class="mc-input"
                placeholder="usuario@correo.com"
                autocomplete="email"
                required
              />
            </div>

            <div class="field-group">
              <span class="mc-label">Contraseña</span>
              <input
                id="login-password"
                type="password"
                [(ngModel)]="password"
                name="password"
                class="mc-input"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
            </div>

            @if (error()) {
              <div class="mc-error">⚠ {{ error() }}</div>
            }

            <button
              id="btn-microsoft"
              type="button"
              class="mc-btn ms-btn"
              (click)="onMicrosoft()"
              [disabled]="loading()"
            >
              <svg style="width:18px;height:18px;flex-shrink:0;image-rendering:pixelated" viewBox="0 0 21 21">
                <rect x="0"  y="0"  width="10" height="10" fill="#f25022"/>
                <rect x="11" y="0"  width="10" height="10" fill="#7fba00"/>
                <rect x="0"  y="11" width="10" height="10" fill="#00a4ef"/>
                <rect x="11" y="11" width="10" height="10" fill="#ffb900"/>
              </svg>
              Iniciar con Microsoft
            </button>

            <button
              id="btn-login"
              type="submit"
              class="mc-btn mc-btn-green"
              [disabled]="loading()"
            >
              @if (loading()) { <span class="mc-spinner"></span> }
              @else { Iniciar Sesión }
            </button>
          </form>

          <div class="login-footer-link">
            <span class="mc-label" style="display:inline">¿Sin cuenta?</span>
            <a routerLink="/register" class="mc-link">Regístrate aquí</a>
          </div>
        </div>

        <p class="login-version">MinecraftManager v1.0 · © 2025</p>
      </div>
    </div>
  `,
  styles: [`
    .login-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem 1rem;
    }

    .login-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      width: 100%;
      max-width: 520px;
    }

    .login-logo { text-align: center; }
    .logo-pickaxe {
      display: block;
      font-size: 3rem;
      margin-bottom: 0.5rem;
      filter: drop-shadow(0 0 12px rgba(255,170,0,0.5));
    }
    .login-edition {
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      color: #888;
      text-shadow: 1px 1px #000;
      margin: 10px 0 0;
      letter-spacing: 0.12em;
    }

    .login-panel { width: 100%; padding: 2.25rem 2rem; }

    .login-heading {
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      color: #fff;
      text-shadow: 3px 3px #3f3f3f;
      text-align: center;
      margin: 0 0 2rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .field-group { display: flex; flex-direction: column; gap: 8px; }

    .login-panel .mc-input {
      font-size: 10px;
      padding: 14px 14px;
    }
    .login-panel .mc-label { font-size: 9px; }

    .ms-btn {
      background:
        linear-gradient(180deg,
          #888 0%, #888 2px,
          #777 2px, #777 50%,
          #555 50%, #555 calc(100% - 2px),
          #333 calc(100% - 2px), #333 100%
        ) !important;
      font-size: 10px !important;
      padding: 14px 16px !important;
      gap: 12px !important;
    }

    .login-panel .mc-btn-green {
      font-size: 11px;
      padding: 16px;
    }

    .login-footer-link {
      margin-top: 1.5rem;
      text-align: center;
    }

    .mc-link {
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      color: var(--mc-gold);
      text-shadow: 1px 1px #5a3d00;
      text-decoration: none;
      margin-left: 10px;
    }
    .mc-link:hover { color: #ffe066; text-decoration: underline; }

    .login-version {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #444;
      text-align: center;
      margin: 0;
    }
  `]
})
export class LoginComponent implements OnInit {
  email    = '';
  password = '';
  loading  = signal(false);
  error    = signal('');

  constructor(
    private auth:  AuthService,
    private router: Router,
    private route:  ActivatedRoute
  ) {}

  ngOnInit(): void {
    const err = this.route.snapshot.queryParamMap.get('error');
    const msg = this.route.snapshot.queryParamMap.get('msg');
    if (err) {
      const friendly: Record<string, string> = {
        microsoft_denied: 'Acceso denegado en Microsoft.',
        no_code:          'No se recibió código de Microsoft.',
        microsoft_failed: 'Error al conectar con Microsoft.',
      };
      this.error.set(msg ? decodeURIComponent(msg) : (friendly[err] ?? `Error: ${err}`));
      this.router.navigate([], { replaceUrl: true, queryParams: {} });
    }
  }

  onLogin(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/servers']); },
      error: (err) => { this.loading.set(false); this.error.set(err.error?.error ?? 'Error al iniciar sesión'); }
    });
  }

  onMicrosoft(): void {
    window.location.href = `${environment.apiUrl}/api/auth/microsoft`;
  }
}
