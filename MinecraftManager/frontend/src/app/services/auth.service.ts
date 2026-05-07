import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User, AuthResponse } from '../models/user.model';
import { ServerEntry } from '../models/server.model';

const TOKEN_KEY      = 'mc_token';
const USER_KEY       = 'mc_user';
const SERVER_KEY     = 'mc_active_server';
const SERVER_ROLE_KEY = 'mc_active_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;

  // ── Estado reactivo con signals ───────────────────────────
  private _user    = signal<User | null>(this.loadUser());
  private _token   = signal<string | null>(this.loadToken());
  private _activeServer = signal<ServerEntry | null>(this.loadActiveServer());

  readonly user          = this._user.asReadonly();
  readonly token         = this._token.asReadonly();
  readonly activeServer  = this._activeServer.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly isAdmin         = computed(() => this._activeServer()?.role === 'admin');

  constructor(private http: HttpClient, private router: Router) {}

  // ── Auth ──────────────────────────────────────────────────

  register(data: {
    username: string;
    email: string;
    birthdate: string;
    password: string;
    confirmPassword: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((res) => this.setSession(res))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => this.setSession(res))
    );
  }

  loginWithMicrosoft(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/microsoft`, {}).pipe(
      tap((res) => this.setSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SERVER_KEY);
    localStorage.removeItem(SERVER_ROLE_KEY);
    this._token.set(null);
    this._user.set(null);
    this._activeServer.set(null);
    this.router.navigate(['/login']);
  }

  // ── Servidor activo ───────────────────────────────────────

  setActiveServer(server: ServerEntry): void {
    this._activeServer.set(server);
    localStorage.setItem(SERVER_KEY, JSON.stringify(server));
  }

  clearActiveServer(): void {
    this._activeServer.set(null);
    localStorage.removeItem(SERVER_KEY);
  }

  getToken(): string | null {
    return this._token();
  }

  // ── Internos ──────────────────────────────────────────────

  setSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._token.set(res.token);
    this._user.set(res.user);
  }

  private loadToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  private loadActiveServer(): ServerEntry | null {
    const raw = localStorage.getItem(SERVER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
