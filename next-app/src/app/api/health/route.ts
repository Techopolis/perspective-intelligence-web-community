import { NextResponse } from "next/server";
import { healthCheck, getQueueStatus } from "@/lib/ai/client";

export async function GET() {
  const aiOk = await healthCheck();
  const queue = getQueueStatus();
  return NextResponse.json({
    status: "ok",
    foundationModels: aiOk ? "connected" : "unavailable",
    queue,
  });
}
