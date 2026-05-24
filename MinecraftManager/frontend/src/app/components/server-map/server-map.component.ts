import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-server-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container">
      <!-- Header -->
      <div class="map-header">
        <h2 class="map-title">Mapa del Mundo</h2>
        @if (mapUrl) {
          <a [href]="rawUrl" target="_blank" class="map-link mc-btn mc-btn-small">
            📌 Abrir en nueva pestaña
          </a>
        }
      </div>

      <!-- Map Container -->
      <div class="map-frame">
        @if (loading) {
          <div class="map-overlay">
            <span class="map-overlay-icon">🗺️</span>
            <span class="map-overlay-text">Cargando mapa...</span>
          </div>
        }

        @if (error) {
          <div class="map-overlay">
            <span class="map-overlay-icon">🚫</span>
            <span class="map-overlay-text map-error-text">No se pudo cargar el mapa</span>
            <span class="map-overlay-hint">
              Asegúrate de que BlueMap está instalado y funcionando en el servidor.
            </span>
          </div>
        }

        @if (mapUrl) {
          <iframe [src]="mapUrl"
                  class="map-iframe"
                  allowfullscreen
                  loading="lazy"
                  (load)="onIframeLoad()"
                  (error)="onIframeError()">
          </iframe>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .map-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem 1rem;
    }

    .map-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 16px;
      color: #fff;
      text-shadow: 3px 3px #3f3f3f;
      margin: 0;
    }

    .map-link {
      font-size: 8px !important;
      padding: 8px 14px !important;
      text-decoration: none;
      width: auto !important;
      min-width: unset !important;
    }

    .map-frame {
      flex: 1;
      margin: 0 2rem 2rem;
      border: 3px solid rgba(255,255,255,0.1);
      background: #3b2d1e;
      position: relative;
      overflow: hidden;
    }

    .map-iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }

    .map-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #3b2d1e;
      gap: 12px;
    }

    .map-overlay-icon {
      font-size: 48px;
      opacity: 0.5;
    }

    .map-overlay-text {
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      color: #888;
    }

    .map-error-text {
      color: #ff5555;
    }

    .map-overlay-hint {
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      color: #555;
      text-align: center;
      max-width: 360px;
      line-height: 2;
    }
  `]
})
export class ServerMapComponent implements OnInit {
  mapUrl: SafeResourceUrl | null = null;
  rawUrl = '';
  loading = true;
  error = false;

  constructor(
    private apiService: ApiService,
    private sanitizer: DomSanitizer
  ) {}

  private readonly FALLBACK_MAP_URL = 'http://localhost:8100';

  ngOnInit(): void {
    this.apiService.getMapUrl().subscribe({
      next: (data) => {
        this.rawUrl = data.url;
        this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(data.url);
      },
      error: () => {
        // Fallback: use default BlueMap URL if backend is unreachable
        console.warn('Could not reach backend for map URL, using fallback:', this.FALLBACK_MAP_URL);
        this.rawUrl = this.FALLBACK_MAP_URL;
        this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.FALLBACK_MAP_URL);
      }
    });
  }

  onIframeLoad(): void {
    this.loading = false;
  }

  onIframeError(): void {
    this.loading = false;
    this.error = true;
  }
}
