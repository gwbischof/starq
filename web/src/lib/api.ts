import type {
  QueueList,
  QueueInfo,
  QueueCreate,
  JobList,
  JobSubmit,
  HealthResponse,
} from "./types";

const API_BASE = "/api/v1";

function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("starq-api-key");
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const key = getApiKey();
  if (key) {
    headers["X-API-Key"] = key;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }

  return res.json();
}

// --- Queues ---

export async function listQueues(): Promise<QueueList> {
  return request<QueueList>(`${API_BASE}/queues`);
}

export async function getQueue(name: string): Promise<QueueInfo> {
  return request<QueueInfo>(`${API_BASE}/queues/${encodeURIComponent(name)}`);
}

export async function createQueue(data: QueueCreate): Promise<QueueInfo> {
  return request<QueueInfo>(`${API_BASE}/queues`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteQueue(name: string): Promise<void> {
  await request(`${API_BASE}/queues/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

// --- Jobs ---

export async function listJobs(
  queue: string,
  status?: string,
  count = 50
): Promise<JobList> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("count", String(count));
  return request<JobList>(
    `${API_BASE}/queues/${encodeURIComponent(queue)}/jobs?${params}`
  );
}

export async function submitJob(
  queue: string,
  data: JobSubmit
): Promise<unknown> {
  return request(`${API_BASE}/queues/${encodeURIComponent(queue)}/jobs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Health ---

export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}
