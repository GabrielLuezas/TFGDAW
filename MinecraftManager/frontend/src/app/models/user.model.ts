export interface User {
  id: number;
  username: string;
  email: string;
  birthdate?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
