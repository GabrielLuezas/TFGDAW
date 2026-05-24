import { Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    @if (showLayout()) {
      <div class="app-layout">
        <app-sidebar />
        <main class="app-main">
          <router-outlet />
        </main>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    :host { display: block; height: 100vh; }

    .app-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* Fondo del área de contenido (más oscuro que la tierra del sidebar) */
    .app-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow-y: auto;
      overflow-x: hidden;
      background-color: #211500;
      background-image:
        repeating-linear-gradient(0deg,   transparent, transparent 15px, rgba(0,0,0,0.15) 15px, rgba(0,0,0,0.15) 16px),
        repeating-linear-gradient(90deg,  transparent, transparent 15px, rgba(0,0,0,0.15) 15px, rgba(0,0,0,0.15) 16px);
    }
  `]
})
export class AppComponent {
  auth   = inject(AuthService);
  router = inject(Router);

  /** Rutas que NO muestran sidebar */
  private readonly noLayoutRoutes = ['/login', '/register', '/auth/', '/servers'];

  showLayout(): boolean {
    const url = this.router.url;
    const isExcluded = this.noLayoutRoutes.some(r => url.startsWith(r));
    return !isExcluded && this.auth.isAuthenticated() && !!this.auth.activeServer();
  }
}

