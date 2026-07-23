export type QueueJobDto = {
  id: string;
  type: "email" | "scoring";
  label: string;
  status: "queued" | "running" | "completed" | "failed" | "waiting";
  progress?: { current: number; total: number };
  detail?: string;
  updatedAt: string;
};
