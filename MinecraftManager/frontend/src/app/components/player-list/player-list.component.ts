import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { TextureService } from '../../services/texture.service';
import { Player } from '../../models/player.model';
import { Subscription, interval, switchMap } from 'rxjs';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col p-8">
      <h2 class="text-4xl font-serif text-white text-center mb-12">Jugadores conectados</h2>

      @if (loading) {
        <div class="text-center text-gray-400">Cargando jugadores...</div>
      } @else if (players.length === 0) {
        <div class="text-center text-gray-500 text-xl mt-20">No hay jugadores conectados</div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
          @for (player of players; track player.uuid) {
            <div class="bg-[#E5E7EB] p-4 flex gap-6 shadow-lg">
              <!-- Avatar + Actions -->
              <div class="flex flex-col items-center gap-4">
                <img [src]="textureService.getAvatarUrl(player.name)"
                     [alt]="player.name"
                     class="w-24 h-24 border-4 border-[#31AF7C]" />
                <div class="flex gap-2">
                  <button (click)="handleCommand('op ' + player.name)"
                          class="p-2 bg-[#31AF7C] hover:bg-[#258e64] text-white rounded transition-colors"
                          title="Dar Admin">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                  </button>
                  <button (click)="handleCommand('kick ' + player.name)"
                          class="p-2 bg-[#E43A36] hover:bg-[#c0302c] text-white rounded transition-colors"
                          title="Expulsar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
                  </button>
                </div>
              </div>

              <!-- Stats -->
              <div class="flex-1 flex flex-col justify-center gap-2 text-black">
                <h3 class="text-2xl font-bold">{{ player.name }}</h3>
                <div class="flex items-center gap-2 text-sm font-medium">
                  <span class="text-[#E43A36]">❤</span>
                  <span>{{ Math.ceil(player.health) }} HP</span>
                </div>
                <div class="flex items-center gap-2 text-sm font-medium">
                  <span class="text-[#2C2F66]">📍</span>
                  <span>{{ Math.round(player.location.x) }}, {{ Math.round(player.location.y) }}, {{ Math.round(player.location.z) }}</span>
                </div>
                <div class="flex items-center gap-2 text-sm font-medium">
                  <span class="text-[#2C2F66]">🌍</span>
                  <span class="capitalize">{{ player.location.world }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class PlayerListComponent implements OnInit, OnDestroy {
  players: Player[] = [];
  loading = true;
  Math = Math;

  private sub = new Subscription();

  constructor(
    private apiService: ApiService,
    public textureService: TextureService
  ) {}

  ngOnInit(): void {
    // Initial fetch + polling every 5 seconds
    this.sub.add(
      interval(5000).pipe(
        switchMap(() => this.apiService.getPlayers())
      ).subscribe(data => {
        this.players = data;
        this.loading = false;
      })
    );

    // Initial fetch
    this.apiService.getPlayers().subscribe(data => {
      this.players = data;
      this.loading = false;
    });
  }

  handleCommand(cmd: string): void {
    this.apiService.sendCommand(cmd).subscribe();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
