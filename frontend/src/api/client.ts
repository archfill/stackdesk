import type {
  AuthUser,
  ComposeApp,
  ImageUpdate,
  MCPToken,
  MCPTokenCreated,
  UserRole,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        credentials: "include",
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (response.status === 204) {
        return undefined as T;
      }

      if (!response.ok) {
        const text = await response.text();
        let message = "API request failed";
        let code: string | undefined;
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed.error === "string") code = parsed.error;
          message = parsed.message || parsed.error || message;
        } catch {
          message = text || message;
        }
        const err = new Error(message) as Error & {
          status?: number;
          code?: string;
        };
        err.status = response.status;
        err.code = code;
        throw err;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error("API request error:", error);
      throw error;
    }
  }

  // 認証関連
  async setupStatus(): Promise<{ needsSetup: boolean }> {
    return this.request("/api/setup/status");
  }

  async setup(username: string, password: string): Promise<{ user: AuthUser }> {
    return this.request("/api/setup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async login(username: string, password: string): Promise<{ user: AuthUser }> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async logout(): Promise<void> {
    await this.request<void>("/api/auth/logout", { method: "POST" });
  }

  async me(): Promise<{ user: AuthUser }> {
    return this.request("/api/auth/me");
  }

  async updateMyLanguage(language: string): Promise<{ user: AuthUser }> {
    return this.request("/api/auth/me/language", {
      method: "PATCH",
      body: JSON.stringify({ language }),
    });
  }

  // MCP トークン管理
  async listTokens(): Promise<{ tokens: MCPToken[] }> {
    return this.request("/api/tokens");
  }

  async createToken(name: string): Promise<MCPTokenCreated> {
    return this.request("/api/tokens", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async revokeToken(id: number): Promise<void> {
    await this.request<void>(`/api/tokens/${id}`, { method: "DELETE" });
  }

  // ユーザー管理 (admin)
  async listUsers(): Promise<{ users: AuthUser[] }> {
    return this.request("/api/users");
  }

  async createUser(
    username: string,
    password: string,
    role: UserRole,
  ): Promise<{ user: AuthUser }> {
    return this.request("/api/users", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
  }

  async updateUserRole(
    id: number,
    role: UserRole,
  ): Promise<{ user: AuthUser }> {
    return this.request(`/api/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async deleteUser(id: number): Promise<void> {
    await this.request<void>(`/api/users/${id}`, { method: "DELETE" });
  }

  // アプリケーション一覧取得
  async listApps(options?: Pick<RequestInit, "signal">): Promise<ComposeApp[]> {
    return this.request<ComposeApp[]>("/api/apps", options);
  }

  // アプリケーション起動
  async startApp(name: string): Promise<void> {
    await this.request(`/api/apps/${name}/start`, {
      method: "POST",
    });
  }

  // アプリケーション停止
  async stopApp(name: string): Promise<void> {
    await this.request(`/api/apps/${name}/stop`, {
      method: "POST",
    });
  }

  // アプリケーション再起動
  async restartApp(name: string): Promise<void> {
    await this.request(`/api/apps/${name}/restart`, {
      method: "POST",
    });
  }

  // ログ取得
  async getLogs(name: string): Promise<{ logs: string[] }> {
    return this.request<{ logs: string[] }>(`/api/apps/${name}/logs`);
  }

  // イメージ更新チェック
  async checkUpdates(name: string): Promise<ImageUpdate[]> {
    return this.request<ImageUpdate[]>(`/api/apps/${name}/images/updates`);
  }

  // イメージプル
  async pullImages(name: string): Promise<void> {
    await this.request(`/api/apps/${name}/images/pull`, {
      method: "POST",
    });
  }

  // ヘルスチェック
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>("/health");
  }
}

export const apiClient = new ApiClient();
