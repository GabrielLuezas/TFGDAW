export interface Player {
  uuid: string;
  name: string;
  health: number;
  food: number;
  location: {
    x: number;
    y: number;
    z: number;
    world: string;
  };
}
