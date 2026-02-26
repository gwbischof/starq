export interface QueueInfo {
  name: string;
  description: string;
  max_retries: number;
  claim_timeout: number;
  dedupe: boolean;
  pending: number;
  completed: number;
  failed: number;
  length: number;
}

export interface QueueList {
  queues: QueueInfo[];
}

export interface JobInfo {
  id: string;
  queue: string;
  status: "pending" | "claimed" | "completed" | "failed";
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error: string;
  retries: number;
  created_at: string;
  claimed_at: string;
  completed_at: string;
}

export interface JobListResponse {
  jobs: JobInfo[];
  cursor: string;
  has_more: boolean;
}

export interface ClaimedJobs {
  jobs: JobInfo[];
}

export interface QueueCreate {
  name: string;
  description?: string;
  max_retries?: number;
  claim_timeout?: number;
  dedupe?: boolean;
}

export interface JobSubmit {
  payload: Record<string, unknown>;
  priority?: number;
}

export interface HealthResponse {
  status: string;
  detail?: string;
}
