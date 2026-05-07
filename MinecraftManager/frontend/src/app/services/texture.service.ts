import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TextureService {
  private apiUrl = environment.apiUrl;

  /**
   * Returns the URL for a Minecraft item/block texture.
   * Normalizes the item type name from Bukkit format.
   * @param itemType - e.g. 'DIAMOND_SWORD', 'OAK_PLANKS', 'stone'
   */
  getTextureUrl(itemType: string): string {
    const normalizedName = itemType.toLowerCase().replace(/\s+/g, '_');
    return `${this.apiUrl}/api/texture/${normalizedName}`;
  }

  /**
   * Returns the URL for a player's avatar.
   * @param playerName - Minecraft username
   * @param size - Image size in pixels
   */
  getAvatarUrl(playerName: string, size: number = 100): string {
    return `https://minotar.net/avatar/${playerName}/${size}.png`;
  }
}
