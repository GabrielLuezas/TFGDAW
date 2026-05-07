import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="mc-dirt-bg reg-wrap">
      <div class="reg-center">

        <div class="reg-logo">
          <span style="display:block;font-size:2.5rem;margin-bottom:0.5rem;filter:drop-shadow(0 0 10px rgba(255,170,0,0.5))">⛏️</span>
          <h1 class="mc-title" style="font-size:24px">
            <span class="mc-title-gold">Minecraft</span>Manager
          </h1>
        </div>

        <div class="reg-panel mc-panel">
          <h2 class="reg-heading">Crear cuenta</h2>

          <form (ngSubmit)="onRegister()" class="reg-form" autocomplete="off">
            <div class="field-group">
              <span class="mc-label">Nombre de usuario</span>
              <input id="reg-username" type="text" [(ngModel)]="form.username"
                name="username" class="mc-input" placeholder="Steve" required />
            </div>
            <div class="field-group">
              <span class="mc-label">Correo electrónico</span>
              <input id="reg-email" type="email" [(ngModel)]="form.email"
                name="email" class="mc-input" placeholder="usuario@correo.com"
                autocomplete="email" required />
            </div>
            <div class="field-group">
              <span class="mc-label">Fecha de nacimiento</span>
              <input id="reg-birthdate" type="date" [(ngModel)]="form.birthdate"
                name="birthdate" class="mc-input" required />
            </div>
            <div class="field-group">
              <span class="mc-label">Contraseña</span>
              <input id="reg-password" type="password" [(ngModel)]="form.password"
                name="password" class="mc-input" placeholder="Mínimo 6 caracteres"
                autocomplete="new-password" required />
            </div>
            <div class="field-group">
              <span class="mc-label">Repetir contraseña</span>
              <input id="reg-confirm" type="password" [(ngModel)]="form.confirmPassword"
                name="confirmPassword" class="mc-input" placeholder="••••••••"
                autocomplete="new-password" required />
            </div>

            @if (error()) { <div class="mc-error">⚠ {{ error() }}</div> }

            <button id="btn-microsoft-reg" type="button" class="mc-btn ms-btn"
              (click)="onMicrosoft()" [disabled]="loading()">
              <svg style="width:18px;height:18px;flex-shrink:0" viewBox="0 0 21 21">
                <rect x="0"  y="0"  width="10" height="10" fill="#f25022"/>
                <rect x="11" y="0"  width="10" height="10" fill="#7fba00"/>
                <rect x="0"  y="11" width="10" height="10" fill="#00a4ef"/>
                <rect x="11" y="11" width="10" height="10" fill="#ffb900"/>
              </svg>
              Registrar con Microsoft
            </button>

            <button id="btn-register" type="submit" class="mc-btn mc-btn-green"
              [disabled]="loading()">
              @if (loading()) { <span class="mc-spinner"></span> }
              @else { Crear cuenta }
            </button>
          </form>

          <div class="reg-footer-link">
            <span class="mc-label" style="display:inline">¿Ya tienes cuenta?</span>
            <a routerLink="/login" class="mc-link">Iniciar sesión</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reg-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .reg-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.75rem;
      width: 100%;
      max-width: 520px;
    }
    .reg-logo { text-align: center; }
    .reg-panel { width: 100%; padding: 2.25rem 2rem; }
    .reg-heading {
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      color: #fff;
      text-shadow: 3px 3px #3f3f3f;
      text-align: center;
      margin: 0 0 2rem;
    }
    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .reg-form { display: flex; flex-direction: column; gap: 16px; }

    .reg-panel .mc-input  { font-size: 10px; padding: 13px 14px; }
    .reg-panel .mc-label  { font-size: 9px; }

    .ms-btn {
      background:
        linear-gradient(180deg,
          #888 0%, #888 2px, #777 2px, #777 50%,
          #555 50%, #555 calc(100% - 2px), #333 calc(100% - 2px), #333 100%
        ) !important;
      font-size: 10px !important;
      padding: 14px 16px !important;
      gap: 12px !important;
    }
    .reg-panel .mc-btn-green { font-size: 11px; padding: 15px; }

    .reg-footer-link { margin-top: 1.5rem; text-align: center; }
    .mc-link {
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      color: var(--mc-gold);
      text-shadow: 1px 1px #5a3d00;
      text-decoration: none;
      margin-left: 10px;
    }
    .mc-link:hover { color: #ffe066; text-decoration: underline; }
  `]
})
export class RegisterComponent {
  form = { username: '', email: '', birthdate: '', password: '', confirmPassword: '' };
  loading = signal(false);
  error   = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  onRegister(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.register(this.form).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/servers']); },
      error: (err) => { this.loading.set(false); this.error.set(err.error?.error ?? 'Error al registrarse'); }
    });
  }

  onMicrosoft(): void {
    window.location.href = `${environment.apiUrl}/api/auth/microsoft`;
  }
}
