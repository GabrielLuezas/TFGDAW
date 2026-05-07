export interface Advancement {
  key: string;
  done: boolean;
  parent?: string;
  display: DisplayInfo;
  awardedCriteria: string[];
}

export interface DisplayInfo {
  title: string;
  description: string;
  icon: string;
  frame: string;
}

export interface NodePosition {
  advancement: Advancement;
  x: number;
  y: number;
  children: NodePosition[];
}
