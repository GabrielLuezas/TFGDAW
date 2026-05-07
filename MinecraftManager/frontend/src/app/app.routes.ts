import { Routes } from '@angular/router';
import { authGuard, serverGuard, adminGuard } from './guards/auth.guard';

import { LoginComponent }              from './components/login/login.component';
import { RegisterComponent }           from './components/register/register.component';
import { ServerListComponent }         from './components/server-list/server-list.component';
import { MicrosoftCallbackComponent }  from './components/microsoft-callback/microsoft-callback.component';
import { DashboardComponent }          from './components/dashboard/dashboard.component';
import { PlayerListComponent }         from './components/player-list/player-list.component';
import { ChatComponent }               from './components/chat/chat.component';
import { InventoryComponent }          from './components/inventory/inventory.component';
import { AdvancementsComponent }       from './components/advancements/advancements.component';
import { WhitelistComponent }          from './components/whitelist/whitelist.component';
import { ServerMapComponent }          from './components/server-map/server-map.component';
import { ServerPasswordComponent }     from './components/server-password/server-password.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // ── Públicas ──────────────────────────────────────────────
  { path: 'login',                       component: LoginComponent },
  { path: 'register',                    component: RegisterComponent },
  { path: 'auth/microsoft-callback',     component: MicrosoftCallbackComponent },

  // ── Auth requerida ────────────────────────────────────────
  { path: 'servers', component: ServerListComponent, canActivate: [authGuard] },

  // ── Auth + servidor activo requeridos ─────────────────────
  { path: 'dashboard',    component: DashboardComponent,    canActivate: [adminGuard] },
  { path: 'players',      component: PlayerListComponent,   canActivate: [serverGuard] },
  { path: 'chat',         component: ChatComponent,         canActivate: [adminGuard] },
  { path: 'inventory',    component: InventoryComponent,    canActivate: [serverGuard] },
  { path: 'advancements', component: AdvancementsComponent, canActivate: [serverGuard] },
  { path: 'whitelist',        component: WhitelistComponent,        canActivate: [adminGuard] },
  { path: 'server-password',  component: ServerPasswordComponent,   canActivate: [adminGuard] },
  { path: 'map',              component: ServerMapComponent,        canActivate: [serverGuard] },

  { path: '**', redirectTo: 'login' },
];
