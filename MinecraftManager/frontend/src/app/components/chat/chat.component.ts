import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

interface ChatLog {
  time: string;
  sender: string;
  text: string;
  type: string; // chat, join, leave, death, advancement, command
}

interface EventFilter {
  type: string;
  label: string;
  icon: string;
  color: string;
  enabled: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col p-8">
      <h2 class="text-4xl font-serif text-white text-center mb-6">Chat</h2>

      <!-- Filters -->
      <div class="flex flex-wrap justify-center gap-2 mb-4">
        @for (filter of filters; track filter.type) {
          <button (click)="filter.enabled = !filter.enabled"
                  class="filter-badge"
                  [class.filter-active]="filter.enabled"
                  [class.filter-inactive]="!filter.enabled"
                  [style.--badge-color]="filter.color">
            <span>{{ filter.icon }}</span>
            <span class="text-xs">{{ filter.label }}</span>
          </button>
        }
      </div>

      <!-- Chat Box -->
      <div class="flex-1 bg-[#1a1836] relative flex flex-col shadow-lg overflow-hidden rounded-xl border border-white/5">
        <!-- Messages Area -->
        <div class="flex-1 overflow-y-auto p-6 space-y-1" #messagesContainer>
          @for (log of filteredLogs; track $index) {
            <div class="chat-message" [class]="'msg-' + log.type">
              <span class="msg-icon">{{ getEventIcon(log.type) }}</span>
              <span class="msg-time">{{ log.time }}</span>
              @if (log.type === 'chat') {
                <span class="msg-sender">{{ log.sender }}</span>
                <span class="msg-text">{{ log.text }}</span>
              } @else {
                <span class="msg-event-text">{{ log.text }}</span>
              }
            </div>
          }
          @if (filteredLogs.length === 0) {
            <div class="text-center text-gray-600 mt-10">
              <div class="text-3xl mb-2">💬</div>
              <div>No hay mensajes todavía</div>
            </div>
          }
        </div>

        <!-- Input Area -->
        <div class="bg-[#141230] p-0 flex items-center border-t border-white/5">
          <form (submit)="handleSend($event)" class="flex-1 flex items-center relative">
            <input type="text"
                   [(ngModel)]="message"
                   name="message"
                   placeholder="Escribir en el chat..."
                   class="w-full bg-transparent text-white px-6 py-4 text-lg outline-none placeholder-gray-600 font-sans" />
            <button type="submit"
                    class="absolute right-4 text-[#31AF7C] hover:text-emerald-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.8rem;
    }
    .filter-active {
      background: color-mix(in srgb, var(--badge-color) 20%, transparent);
      border-color: var(--badge-color);
      color: var(--badge-color);
    }
    .filter-inactive {
      background: rgba(255,255,255,0.03);
      border-color: rgba(255,255,255,0.08);
      color: #6b7280;
    }

    .chat-message {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.95rem;
      line-height: 1.5;
      transition: background 0.1s;
    }
    .chat-message:hover {
      background: rgba(255,255,255,0.03);
    }

    .msg-icon { font-size: 0.85rem; flex-shrink: 0; }
    .msg-time { color: #4b5563; font-size: 0.75rem; flex-shrink: 0; }
    .msg-sender { font-weight: 700; margin-right: 4px; }
    .msg-text { word-break: break-word; }
    .msg-event-text { word-break: break-word; }

    /* Type-specific styles */
    .msg-chat .msg-sender { color: #a78bfa; }
    .msg-chat .msg-text { color: #e5e7eb; }

    .msg-join { color: #22c55e; }
    .msg-join .msg-event-text { color: #4ade80; font-style: italic; }

    .msg-leave { color: #ef4444; }
    .msg-leave .msg-event-text { color: #f87171; font-style: italic; }

    .msg-death { color: #991b1b; }
    .msg-death .msg-event-text { color: #fca5a5; font-weight: 600; }

    .msg-advancement .msg-event-text { color: #fbbf24; font-weight: 600; }

    .msg-command { color: #6b7280; }
    .msg-command .msg-event-text { color: #9ca3af; font-family: monospace; font-size: 0.85rem; }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  message = '';
  logs: ChatLog[] = [];
  private sub = new Subscription();
  private shouldScroll = false;

  filters: EventFilter[] = [
    { type: 'chat', label: 'Chat', icon: '💬', color: '#a78bfa', enabled: true },
    { type: 'join', label: 'Conexión', icon: '➡️', color: '#22c55e', enabled: true },
    { type: 'leave', label: 'Desconexión', icon: '⬅️', color: '#ef4444', enabled: true },
    { type: 'death', label: 'Muertes', icon: '☠️', color: '#dc2626', enabled: true },
    { type: 'advancement', label: 'Logros', icon: '🏆', color: '#fbbf24', enabled: true },
    { type: 'command', label: 'Comandos', icon: '⌨️', color: '#6b7280', enabled: true },
  ];

  get filteredLogs(): ChatLog[] {
    const enabledTypes = this.filters.filter(f => f.enabled).map(f => f.type);
    return this.logs.filter(log => enabledTypes.includes(log.type));
  }

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private apiService: ApiService,
    private socketService: SocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.socketService.connect();

    // Si el usuario no es administrador, removemos el filtro de comandos
    if (!this.authService.isAdmin()) {
      this.filters = this.filters.filter(f => f.type !== 'command');
    }

    this.sub.add(
      this.socketService.onEvent<any>('chat_message').subscribe(data => {
        const eventType = data.type || 'chat';
        this.logs.push({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: data.player || data.sender || 'Unknown',
          text: data.message || JSON.stringify(data),
          type: eventType,
        });
        this.shouldScroll = true;
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  getEventIcon(type: string): string {
    const map: Record<string, string> = {
      chat: '💬',
      join: '➡️',
      leave: '⬅️',
      death: '☠️',
      advancement: '🏆',
      command: '>_',
    };
    return map[type] || '💬';
  }

  handleSend(event: Event): void {
    event.preventDefault();
    if (!this.message.trim()) return;

    this.logs.push({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'Admin',
      text: this.message,
      type: 'chat',
    });
    this.shouldScroll = true;

    this.apiService.sendCommand(`say ${this.message}`).subscribe();
    this.message = '';
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch (err) {}
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.socketService.disconnect();
  }
}
