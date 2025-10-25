import type { ComposeApp, ImageUpdate } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // アプリケーション一覧取得
  async listApps(): Promise<ComposeApp[]> {
    return this.request<ComposeApp[]>('/api/apps');
  }

  // アプリケーション起動
  async startApp(name: string): Promise<void> {
    await this.request(`/api/apps/${name}/start`, {
      method: 'POST',
    });
  }

  // アプリケーション停止
  async stopApp(name: string): Promise<void> {
    await this.request(`/api/apps/${name}/stop`, {
      method: 'POST',
    });
  }

  // アプリケーション再起動
  async restartApp(name: string): Promise<void> {
    await this.request(`/api/apps/${name}/restart`, {
      method: 'POST',
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
      method: 'POST',
    });
  }

  // ヘルスチェック
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request<{ status: string; service: string }>('/health');
  }
}

export const apiClient = new ApiClient();
