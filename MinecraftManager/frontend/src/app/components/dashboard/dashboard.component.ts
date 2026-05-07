import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, ServerInfo } from '../../services/api.service';
import { Subscription, interval, switchMap, startWith } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full overflow-y-auto p-8">
      <h2 class="text-4xl font-serif text-white text-center mb-10">Estado del Servidor</h2>

      @if (loading) {
        <div class="text-center text-gray-400 text-xl mt-20">Conectando con el servidor...</div>
      } @else if (error) {
        <div class="text-center mt-20">
          <div class="text-red-400 text-xl mb-2">⚠️ Sin conexión al servidor</div>
          <div class="text-gray-500">Comprueba que el servidor Minecraft está encendido</div>
        </div>
      } @else if (serverInfo) {
        <!-- Top Row: Main Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 max-w-7xl mx-auto">
          <!-- TPS Card -->
          <div class="stat-card">
            <div class="stat-icon" [style.background]="getTpsGradient()">⚡</div>
            <div class="stat-label">TPS (1 min)</div>
            <div class="stat-value" [style.color]="getTpsColor()">
              {{ serverInfo.tps.last1min }}
            </div>
            <div class="stat-sub">
              5m: {{ serverInfo.tps.last5min }} · 15m: {{ serverInfo.tps.last15min }}
            </div>
          </div>

          <!-- Players Card -->
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #31AF7C, #22c55e)">👥</div>
            <div class="stat-label">Jugadores</div>
            <div class="stat-value text-emerald-400">
              {{ serverInfo.onlinePlayers }} / {{ serverInfo.maxPlayers }}
            </div>
            <div class="stat-bar-container">
              <div class="stat-bar bg-emerald-500" [style.width.%]="(serverInfo.onlinePlayers / serverInfo.maxPlayers) * 100"></div>
            </div>
          </div>

          <!-- Memory Card -->
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #8B5CF6, #a78bfa)">💾</div>
            <div class="stat-label">Memoria RAM</div>
            <div class="stat-value text-violet-400">
              {{ serverInfo.memory.used }} MB
            </div>
            <div class="stat-sub">
              de {{ serverInfo.memory.max }} MB ({{ getMemoryPercent() }}%)
            </div>
            <div class="stat-bar-container">
              <div class="stat-bar" [class]="getMemoryBarClass()" [style.width.%]="getMemoryPercent()"></div>
            </div>
          </div>

          <!-- Version Card -->
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #fbbf24)">🖥️</div>
            <div class="stat-label">Versión</div>
            <div class="stat-value text-amber-400 text-xl">
              {{ serverInfo.bukkitVersion }}
            </div>
            <div class="stat-sub truncate" [title]="serverInfo.version">
              {{ serverInfo.version }}
            </div>
          </div>

          <!-- Uptime Card -->
          <div class="stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #06b6d4, #22d3ee)">⏱️</div>
            <div class="stat-label">Tiempo Activo</div>
            <div class="stat-value text-cyan-400 text-xl">
              {{ formatUptime(serverInfo.uptimeMillis) }}
            </div>
            <div class="stat-sub">Desde el último reinicio</div>
          </div>

          <!-- CPU Card -->
          <div class="stat-card">
            <div class="stat-icon" [style.background]="getCpuGradient()">🔧</div>
            <div class="stat-label">CPU (JVM)</div>
            <div class="stat-value" [style.color]="getCpuColor()">
              {{ serverInfo.cpuUsage >= 0 ? serverInfo.cpuUsage + '%' : 'N/A' }}
            </div>
            <div class="stat-bar-container">
              <div class="stat-bar" [class]="getCpuBarClass()" [style.width.%]="serverInfo.cpuUsage >= 0 ? serverInfo.cpuUsage : 0"></div>
            </div>
          </div>
        </div>

        <!-- Worlds Section -->
        <div class="max-w-7xl mx-auto">
          <h3 class="text-2xl font-serif text-white mb-4">🌍 Mundos</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (world of serverInfo.worlds; track world.name) {
              <div class="world-card">
                <div class="flex items-center gap-3 mb-4">
                  <span class="text-2xl">{{ getWorldIcon(world.environment) }}</span>
                  <h4 class="text-xl font-bold text-white capitalize">{{ world.name }}</h4>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div class="world-stat">
                    <span class="text-gray-400">Clima</span>
                    <span class="text-white">{{ world.weather === 'rain' ? '🌧️ Lluvia' : '☀️ Despejado' }}</span>
                  </div>
                  <div class="world-stat">
                    <span class="text-gray-400">Hora</span>
                    <span class="text-white">{{ getWorldTime(world.time) }}</span>
                  </div>
                  <div class="world-stat">
                    <span class="text-gray-400">Chunks</span>
                    <span class="text-white">{{ world.loadedChunks }}</span>
                  </div>
                  <div class="world-stat">
                    <span class="text-gray-400">Entidades</span>
                    <span class="text-white">{{ world.entities }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .stat-card {
      background: linear-gradient(145deg, #2a2854, #1e1c3e);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    }
    .stat-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
    }
    .stat-label {
      color: #9ca3af;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.25rem;
    }
    .stat-sub {
      color: #6b7280;
      font-size: 0.75rem;
    }
    .stat-bar-container {
      margin-top: 0.5rem;
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      overflow: hidden;
    }
    .stat-bar {
      height: 100%;
      border-radius: 2px;
      transition: width 0.6s ease;
    }

    .world-card {
      background: linear-gradient(145deg, #2a2854, #1e1c3e);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 1.25rem;
      transition: transform 0.2s;
    }
    .world-card:hover {
      transform: translateY(-2px);
    }
    .world-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  serverInfo: ServerInfo | null = null;
  loading = true;
  error = false;
  private sub = new Subscription();

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.sub.add(
      interval(10000).pipe(
        startWith(0),
        switchMap(() => this.apiService.getServerInfo())
      ).subscribe({
        next: (data) => {
          this.serverInfo = data;
          this.loading = false;
          this.error = false;
        },
        error: () => {
          this.loading = false;
          this.error = true;
        }
      })
    );
  }

  getTpsColor(): string {
    if (!this.serverInfo) return '#fff';
    const tps = this.serverInfo.tps.last1min;
    if (tps >= 18) return '#22c55e';
    if (tps >= 15) return '#eab308';
    return '#ef4444';
  }

  getTpsGradient(): string {
    if (!this.serverInfo) return '';
    const tps = this.serverInfo.tps.last1min;
    if (tps >= 18) return 'linear-gradient(135deg, #22c55e, #16a34a)';
    if (tps >= 15) return 'linear-gradient(135deg, #eab308, #ca8a04)';
    return 'linear-gradient(135deg, #ef4444, #dc2626)';
  }

  getMemoryPercent(): number {
    if (!this.serverInfo) return 0;
    return Math.round((this.serverInfo.memory.used / this.serverInfo.memory.max) * 100);
  }

  getMemoryBarClass(): string {
    const pct = this.getMemoryPercent();
    if (pct < 60) return 'bg-violet-500';
    if (pct < 80) return 'bg-amber-500';
    return 'bg-red-500';
  }

  getWorldIcon(env: string): string {
    switch (env) {
      case 'NORMAL': return '🌳';
      case 'NETHER': return '🔥';
      case 'THE_END': return '🌌';
      default: return '🌍';
    }
  }

  getWorldTime(ticks: number): string {
    // Minecraft: 0 = 6:00, 6000 = 12:00, 12000 = 18:00, 18000 = 0:00
    const hours = Math.floor(((ticks + 6000) % 24000) / 1000);
    const mins = Math.floor((((ticks + 6000) % 24000) % 1000) / 16.67);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  formatUptime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  getCpuColor(): string {
    if (!this.serverInfo || this.serverInfo.cpuUsage < 0) return '#9ca3af';
    const cpu = this.serverInfo.cpuUsage;
    if (cpu < 50) return '#22c55e';
    if (cpu < 80) return '#eab308';
    return '#ef4444';
  }

  getCpuGradient(): string {
    if (!this.serverInfo || this.serverInfo.cpuUsage < 0) return 'linear-gradient(135deg, #6b7280, #9ca3af)';
    const cpu = this.serverInfo.cpuUsage;
    if (cpu < 50) return 'linear-gradient(135deg, #22c55e, #16a34a)';
    if (cpu < 80) return 'linear-gradient(135deg, #eab308, #ca8a04)';
    return 'linear-gradient(135deg, #ef4444, #dc2626)';
  }

  getCpuBarClass(): string {
    if (!this.serverInfo || this.serverInfo.cpuUsage < 0) return 'bg-gray-500';
    const cpu = this.serverInfo.cpuUsage;
    if (cpu < 50) return 'bg-emerald-500';
    if (cpu < 80) return 'bg-amber-500';
    return 'bg-red-500';
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
