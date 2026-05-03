export interface MessagePayload {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
}