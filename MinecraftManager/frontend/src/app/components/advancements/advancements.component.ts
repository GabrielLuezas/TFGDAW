import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { TextureService } from '../../services/texture.service';
import { Player } from '../../models/player.model';
import { Advancement, NodePosition } from '../../models/advancement.model';
import { Subscription } from 'rxjs';

interface ConnectorLine {
  x1: number; y1: number;
  x2: number; y2: number;
}

@Component({
  selector: 'app-advancements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './advancements.component.html',
  styleUrls: ['./advancements.component.css']
})
export class AdvancementsComponent implements OnInit, OnDestroy {
  players: Player[] = [];
  selectedPlayer: string | null = null;
  advancements: Advancement[] = [];
  rootAdvancements: Advancement[] = [];
  activeTab: string | null = null;
  loading = false;

  nodePositions: NodePosition[] = [];
  connectorLines: ConnectorLine[] = [];

  // Canvas pan state
  canvasOffsetX = 40;
  canvasOffsetY = 40;
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;
  startOffsetX = 0;
  startOffsetY = 0;

  // Tooltip
  hoveredNode: Advancement | null = null;
  tooltipPos = { x: 0, y: 0 };

  // Layout constants
  readonly NODE_SIZE = 52;
  readonly H_SPACING = 90;
  readonly V_SPACING = 68;

  private sub = new Subscription();

  constructor(
    private apiService: ApiService,
    public textureService: TextureService
  ) {}

  ngOnInit(): void {
    this.apiService.getPlayers().subscribe(data => {
      this.players = data;
      if (data.length > 0) {
        this.selectedPlayer = data[0].uuid;
        this.loadAdvancements();
      }
    });
  }

  onPlayerChange(): void {
    this.loadAdvancements();
  }

  selectTab(rootKey: string): void {
    this.activeTab = rootKey;
    this.buildTree();
  }

  private loadAdvancements(): void {
    if (!this.selectedPlayer) return;
    this.loading = true;
    this.apiService.getAdvancements(this.selectedPlayer).subscribe(data => {
      this.advancements = data.advancements || [];
      this.rootAdvancements = this.advancements.filter(a => !a.parent);
      if (this.rootAdvancements.length > 0 && !this.activeTab) {
        this.activeTab = this.rootAdvancements[0].key;
      }
      this.buildTree();
      this.loading = false;
    });
  }

  private buildTree(): void {
    if (!this.activeTab) return;

    const root = this.advancements.find(a => a.key === this.activeTab);
    if (!root) return;

    this.nodePositions = [];
    this.connectorLines = [];

    const rootNode = this.buildNodeTree(root);
    if (rootNode) {
      this.layoutTree(rootNode, 0, 0);
      this.flattenTree(rootNode);
      this.buildConnectors(rootNode);
    }
  }

  private buildNodeTree(adv: Advancement): NodePosition {
    const children = this.advancements
      .filter(a => a.parent === adv.key)
      .map(child => this.buildNodeTree(child));

    return {
      advancement: adv,
      x: 0,
      y: 0,
      children
    };
  }

  private layoutTree(node: NodePosition, depth: number, yOffset: number): number {

    node.x = depth * this.H_SPACING;

    if (node.children.length === 0) {
      node.y = yOffset;
      return 1; 
    }

    let totalRows = 0;
    for (const child of node.children) {
      const childRows = this.layoutTree(child, depth + 1, yOffset + totalRows * this.V_SPACING);
      totalRows += childRows;
    }

    const firstChildY = node.children[0].y;
    const lastChildY = node.children[node.children.length - 1].y;
    node.y = (firstChildY + lastChildY) / 2;

    return totalRows;
  }

  private flattenTree(node: NodePosition): void {
    this.nodePositions.push(node);
    for (const child of node.children) {
      this.flattenTree(child);
    }
  }

  private buildConnectors(node: NodePosition): void {
    const centerX = node.x + this.NODE_SIZE / 2;
    const centerY = node.y + this.NODE_SIZE / 2;

    for (const child of node.children) {
      const childCenterX = child.x + this.NODE_SIZE / 2;
      const childCenterY = child.y + this.NODE_SIZE / 2;

      const midX = (centerX + childCenterX) / 2;
      this.connectorLines.push({ x1: centerX, y1: centerY, x2: midX, y2: centerY });
      this.connectorLines.push({ x1: midX, y1: centerY, x2: midX, y2: childCenterY });
      this.connectorLines.push({ x1: midX, y1: childCenterY, x2: childCenterX, y2: childCenterY });

      this.buildConnectors(child);
    }
  }

  startDrag(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.startOffsetX = this.canvasOffsetX;
    this.startOffsetY = this.canvasOffsetY;
  }

  onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.canvasOffsetX = this.startOffsetX + (event.clientX - this.dragStartX);
    this.canvasOffsetY = this.startOffsetY + (event.clientY - this.dragStartY);
  }

  endDrag(): void {
    this.isDragging = false;
  }

  showTooltip(event: MouseEvent, adv: Advancement): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.hoveredNode = adv;
    this.tooltipPos = { x: rect.left + rect.width / 2, y: rect.top };
  }

  hideTooltip(): void {
    this.hoveredNode = null;
  }

  getFrameClass(frame: string): string {
    const f = frame?.toLowerCase() || 'task';
    if (f === 'goal') return 'frame-goal';
    if (f === 'challenge') return 'frame-challenge';
    return 'frame-task';
  }

  get activeTabTitle(): string {
    const adv = this.advancements.find(a => a.key === this.activeTab);
    return adv?.display?.title || '';
  }


  get canvasWidth(): number {
    if (this.nodePositions.length === 0) return 800;
    return Math.max(...this.nodePositions.map(n => n.x)) + this.NODE_SIZE + 100;
  }

  get canvasHeight(): number {
    if (this.nodePositions.length === 0) return 600;
    return Math.max(...this.nodePositions.map(n => n.y)) + this.NODE_SIZE + 100;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
