export interface Service {
  name: string;
  containerId: string;
  image: string;
  status: string;
  state: string;
}

export interface ComposeApp {
  name: string;
  services: Service[];
  status: "running" | "stopped" | "error";
  lastDeployed?: string;
}

export interface ImageUpdate {
  serviceName: string;
  currentImage: string;
  currentDigest: string;
  latestDigest: string;
  updateRequired: boolean;
}

export interface LogEntry {
  timestamp: string;
  service: string;
  message: string;
  stream: string;
}

export interface AuthUser {
  id: number;
  username: string;
  createdAt: number;
}

export interface MCPToken {
  id: number;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt?: number;
  revokedAt?: number;
}

export interface MCPTokenCreated {
  token: MCPToken;
  plaintext: string;
}
