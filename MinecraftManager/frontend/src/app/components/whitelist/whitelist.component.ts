import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, WhitelistPlayer } from '../../services/api.service';
import { TextureService } from '../../services/texture.service';
import { Subscription, interval, switchMap, startWith } from 'rxjs';

@Component({
  selector: 'app-whitelist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full overflow-y-auto p-8">
      <h2 class="text-4xl font-serif text-white text-center mb-8">Whitelist</h2>

      <!-- Controls Bar -->
      <div class="max-w-4xl mx-auto mb-6 flex flex-wrap items-center gap-4">
        <!-- Toggle -->
        <button (click)="toggleWhitelist()"
                class="toggle-btn"
                [class.toggle-on]="whitelistEnabled"
                [class.toggle-off]="!whitelistEnabled">
          <span class="toggle-indicator"></span>
          <span class="ml-2 font-medium">{{ whitelistEnabled ? 'Activada' : 'Desactivada' }}</span>
        </button>

        <!-- Spacer -->
        <div class="flex-1"></div>

        <!-- Add Player Form -->
        <form (submit)="addPlayer($event)" class="flex gap-2">
          <input type="text"
                 [(ngModel)]="newPlayerName"
                 name="newPlayer"
                 placeholder="Nombre del jugador"
                 class="px-4 py-2 rounded-lg bg-[#2a2854] border border-white/10 text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors" />
          <button type="submit"
                  [disabled]="!newPlayerName.trim()"
                  class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors">
            + Añadir
          </button>
        </form>
      </div>

      <!-- Error -->
      @if (error) {
        <div class="text-center text-red-400 mt-10 text-lg">⚠️ No se pudo conectar con el servidor</div>
      }

      <!-- Loading -->
      @if (loading) {
        <div class="text-center text-gray-400 mt-16">Cargando whitelist...</div>
      }

      <!-- Player List -->
      @if (!loading && !error) {
        @if (players.length === 0) {
          <div class="text-center text-gray-500 text-xl mt-20">La whitelist está vacía</div>
        } @else {
          <div class="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (player of players; track player.uuid) {
              <div class="player-card" [class.player-online]="player.isOnline">
                <div class="flex items-center gap-4">
                  <div class="relative">
                    <img [src]="textureService.getAvatarUrl(player.name)"
                         [alt]="player.name"
                         class="w-12 h-12 rounded-lg" />
                    <div class="status-dot" [class.online]="player.isOnline" [class.offline]="!player.isOnline"></div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-white truncate">{{ player.name }}</div>
                    <div class="text-xs" [class.text-emerald-400]="player.isOnline" [class.text-gray-500]="!player.isOnline">
                      {{ player.isOnline ? '● En línea' : '○ Desconectado' }}
                    </div>
                  </div>
                  <button (click)="removePlayer(player.name)"
                          class="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Quitar de whitelist">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .toggle-btn {
      display: flex;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      cursor: pointer;
      border: none;
      transition: all 0.3s;
    }
    .toggle-on {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
    }
    .toggle-off {
      background: #374151;
      color: #9ca3af;
    }
    .toggle-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: white;
      display: inline-block;
      transition: transform 0.2s;
    }
    .toggle-off .toggle-indicator {
      background: #6b7280;
    }

    .player-card {
      background: linear-gradient(145deg, #2a2854, #1e1c3e);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 1rem;
      transition: transform 0.15s, border-color 0.2s;
    }
    .player-card:hover {
      transform: translateY(-1px);
    }
    .player-online {
      border-color: rgba(34, 197, 94, 0.2);
    }

    .status-dot {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #1e1c3e;
    }
    .status-dot.online {
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34,197,94,0.5);
    }
    .status-dot.offline {
      background: #4b5563;
    }
  `]
})
export class WhitelistComponent implements OnInit, OnDestroy {
  players: WhitelistPlayer[] = [];
  whitelistEnabled = false;
  newPlayerName = '';
  loading = true;
  error = false;
  private sub = new Subscription();

  constructor(
    private apiService: ApiService,
    public textureService: TextureService
  ) {}

  ngOnInit(): void {
    this.fetchWhitelist();
    // Poll every 15 seconds
    this.sub.add(
      interval(15000).pipe(
        switchMap(() => this.apiService.getWhitelist())
      ).subscribe({
        next: (data) => this.handleData(data),
        error: () => { this.error = true; }
      })
    );
  }

  private fetchWhitelist(): void {
    this.apiService.getWhitelist().subscribe({
      next: (data) => {
        this.handleData(data);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  private handleData(data: any): void {
    this.players = data.players || [];
    this.whitelistEnabled = data.enabled;
    this.error = false;
  }

  toggleWhitelist(): void {
    this.apiService.updateWhitelist('toggle').subscribe({
      next: () => {
        this.whitelistEnabled = !this.whitelistEnabled;
      }
    });
  }

  addPlayer(event: Event): void {
    event.preventDefault();
    const name = this.newPlayerName.trim();
    if (!name) return;

    this.apiService.updateWhitelist('add', name).subscribe({
      next: () => {
        this.newPlayerName = '';
        // Refresh list after a small delay (server needs time to process)
        setTimeout(() => this.fetchWhitelist(), 500);
      }
    });
  }

  removePlayer(name: string): void {
    this.apiService.updateWhitelist('remove', name).subscribe({
      next: () => {
        this.players = this.players.filter(p => p.name !== name);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
