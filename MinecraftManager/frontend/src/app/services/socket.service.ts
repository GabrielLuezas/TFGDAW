import { Injectable, OnDestroy, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket;
  private auth = inject(AuthService);
  private currentServerId: number | null = null;

  constructor() {
    this.socket = io(environment.apiUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    // Re-unirse al room tras (re)conexión para no perder eventos
    this.socket.on('connect', () => {
      if (this.currentServerId) {
        this.socket.emit('join_server', this.currentServerId);
      }
    });
  }

  /**
   * Conecta al socket y une al room del servidor activo.
   * Si ya había un servidor, abandona ese room primero.
   * El join_server se envía en el evento 'connect' para garantizar que el socket ya está listo.
   */
  connect(serverId?: number): void {
    const id = serverId ?? this.auth.activeServer()?.id;

    if (id && id !== this.currentServerId) {
      if (this.currentServerId) {
        this.socket.emit('leave_server', this.currentServerId);
      }
      this.currentServerId = id;
    }

    if (!this.socket.connected) {
      // El join_server se enviará automáticamente en el evento 'connect'
      this.socket.connect();
    } else if (this.currentServerId) {
      // Ya conectado: unirse al room directamente
      this.socket.emit('join_server', this.currentServerId);
    }
  }

  disconnect(): void {
    if (this.currentServerId) {
      this.socket.emit('leave_server', this.currentServerId);
      this.currentServerId = null;
    }
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  onEvent<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      this.socket.on(event, (data: T) => {
        observer.next(data);
      });
      return () => {
        this.socket.off(event);
      };
    });
  }

  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
