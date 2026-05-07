import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protege rutas que requieren autenticación. Redirige a /login si no hay token. */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};

/** Protege rutas del dashboard: requiere auth + servidor activo seleccionado. */
export const serverGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (!auth.activeServer()) {
    router.navigate(['/servers']);
    return false;
  }
  return true;
};

/** Protege rutas exclusivas de administrador. Redirige a /players si el rol es jugador. */
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (!auth.activeServer()) {
    router.navigate(['/servers']);
    return false;
  }
  if (!auth.isAdmin()) {
    // Jugador intentando acceder a ruta de admin → redirigir a jugadores
    router.navigate(['/players']);
    return false;
  }
  return true;
};
