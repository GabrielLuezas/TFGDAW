import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-server-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col">
      <!-- Header -->
      <div class="flex justify-between items-center px-8 pt-6 pb-4">
        <h2 class="text-4xl font-serif text-white">Mapa del Mundo</h2>
        @if (mapUrl) {
          <a [href]="rawUrl" target="_blank"
             class="px-4 py-2 bg-[#2a2854] hover:bg-[#3a3874] border border-white/10 text-gray-300 hover:text-white rounded-lg text-sm transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Abrir en nueva pestaña
          </a>
        }
      </div>

      <!-- Map Container -->
      <div class="flex-1 mx-8 mb-8 rounded-xl overflow-hidden border border-white/10 relative">
        @if (loading) {
          <div class="absolute inset-0 flex items-center justify-center bg-[#1e1c3e]">
            <div class="text-center">
              <div class="text-4xl mb-4">🗺️</div>
              <div class="text-gray-400">Cargando mapa...</div>
            </div>
          </div>
        }

        @if (error) {
          <div class="absolute inset-0 flex items-center justify-center bg-[#1e1c3e]">
            <div class="text-center">
              <div class="text-4xl mb-4">🚫</div>
              <div class="text-red-400 text-lg mb-2">No se pudo cargar el mapa</div>
              <div class="text-gray-500 text-sm max-w-md">
                Asegúrate de que BlueMap está instalado y funcionando en el servidor.
                El mapa debería estar disponible en el puerto 8100.
              </div>
            </div>
          </div>
        }

        @if (mapUrl) {
          <iframe [src]="mapUrl"
                  class="w-full h-full border-0"
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
