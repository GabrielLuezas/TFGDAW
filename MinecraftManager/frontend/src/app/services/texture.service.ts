import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TextureService {
  private apiUrl = environment.apiUrl;

  getTextureUrl(itemType: string): string {
    const normalizedName = itemType.toLowerCase().replace(/\s+/g, '_');
    return `${this.apiUrl}/api/texture/${normalizedName}`;
  }

  getAvatarUrl(playerName: string, size: number = 100): string {
    return `https://minotar.net/avatar/${playerName}/${size}.png`;
  }
}
