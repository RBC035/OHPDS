export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    username: string;
    role: string;
  };
}