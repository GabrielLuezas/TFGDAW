import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { TextureService } from '../../services/texture.service';
import { Player } from '../../models/player.model';
import { InventoryItem, PotionEffect } from '../../models/inventory.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css']
})
export class InventoryComponent implements OnInit, OnDestroy {
  players: Player[] = [];
  selectedPlayer: string | null = null;
  inventory: InventoryItem[] = [];
  enderChest: InventoryItem[] = [];
  potionEffects: PotionEffect[] = [];
  loading = false;

  hoveredItem: InventoryItem | null = null;
  tooltipPos = { x: 0, y: 0 };

  private sub = new Subscription();

  // Mapping Bukkit potion names to standard Minecraft names
  readonly potionMap: Record<string, string> = {
    'SPEED': 'speed', 'SLOW': 'slowness', 'FAST_DIGGING': 'haste',
    'SLOW_DIGGING': 'mining_fatigue', 'INCREASE_DAMAGE': 'strength',
    'HEAL': 'instant_health', 'HARM': 'instant_damage', 'JUMP': 'jump_boost',
    'CONFUSION': 'nausea', 'REGENERATION': 'regeneration',
    'DAMAGE_RESISTANCE': 'resistance', 'FIRE_RESISTANCE': 'fire_resistance',
    'WATER_BREATHING': 'water_breathing', 'INVISIBILITY': 'invisibility',
    'BLINDNESS': 'blindness', 'NIGHT_VISION': 'night_vision',
    'HUNGER': 'hunger', 'WEAKNESS': 'weakness', 'POISON': 'poison',
    'WITHER': 'wither', 'HEALTH_BOOST': 'health_boost',
    'ABSORPTION': 'absorption', 'SATURATION': 'saturation',
    'GLOWING': 'glowing', 'LEVITATION': 'levitation', 'LUCK': 'luck',
    'UNLUCK': 'bad_luck', 'SLOW_FALLING': 'slow_falling',
    'CONDUIT_POWER': 'conduit_power', 'DOLPHINS_GRACE': 'dolphins_grace',
    'BAD_OMEN': 'bad_omen', 'HERO_OF_THE_VILLAGE': 'hero_of_the_village'
  };

  constructor(
    private apiService: ApiService,
    public textureService: TextureService
  ) {}

  ngOnInit(): void {
    this.apiService.getPlayers().subscribe(data => {
      this.players = data;
      if (data.length > 0) {
        this.selectedPlayer = data[0].uuid;
        this.loadInventory();
      }
    });
  }

  onPlayerChange(): void {
    this.loadInventory();
  }

  private loadInventory(): void {
    if (!this.selectedPlayer) return;
    this.loading = true;
    this.apiService.getInventory(this.selectedPlayer).subscribe(data => {
      this.inventory = data.inventory || [];
      this.enderChest = data.enderChest || [];
      this.potionEffects = data.potionEffects || [];
      this.loading = false;
    });
  }

  getSlotItem(items: InventoryItem[], slot: number): InventoryItem | undefined {
    return items.find(it => it.slot === slot);
  }

  getSlotRange(start: number, end: number): number[] {
    return Array.from({ length: end - start }, (_, i) => i + start);
  }

  onSlotHover(event: MouseEvent, item: InventoryItem | undefined): void {
    if (!item) { this.hoveredItem = null; return; }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hoveredItem = item;
    this.tooltipPos = { x: rect.left + rect.width / 2, y: rect.top };
  }

  onSlotLeave(): void {
    this.hoveredItem = null;
  }

  getPotionName(type: string): string {
    const standard = this.potionMap[type] || type.toLowerCase();
    return standard.replace(/_/g, ' ');
  }

  getPotionIconUrl(type: string): string {
    const standard = this.potionMap[type] || type.toLowerCase();
    return `https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/mob_effect/${standard}.png`;
  }

  toRoman(num: number): string {
    if (num < 1) return '';
    const romanMap: [string, number][] = [
      ['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],
      ['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]
    ];
    let str = '';
    for (const [letter, value] of romanMap) {
      const q = Math.floor(num / value);
      num -= q * value;
      str += letter.repeat(q);
    }
    return str;
  }

  formatDuration(duration: number): string {
    if (duration > 32000 || duration < 0) return '**:**';
    const minutes = Math.floor(duration / 20 / 60);
    const seconds = Math.floor((duration / 20) % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  formatItemName(type: string): string {
    return type.replace(/_/g, ' ').toLowerCase();
  }

  formatEnchantName(name: string): string {
    return name.replace('minecraft:', '').replace(/_/g, ' ');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
