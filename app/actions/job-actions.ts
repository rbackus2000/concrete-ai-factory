"use server";

import { revalidatePath } from "next/cache";
import type { JobStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/session";
import { jobCreateSchema } from "@/lib/schemas/job";
import { createJob, updateJobStatus } from "@/lib/services/job-service";

export async function createJobAction(values: unknown) {
  const session = await requireSession();
  const parsed = jobCreateSchema.parse(values);
  const job = await createJob(parsed, session);
  revalidatePath("/jobs");
  return { success: true, jobId: job.id, jobNumber: job.jobNumber };
}

export async function updateJobStatusAction(jobId: string, nextStatus: JobStatus) {
  const session = await requireSession();
  const job = await updateJobStatus(jobId, nextStatus, session);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  return { success: true, jobNumber: job.jobNumber, status: job.status };
}
