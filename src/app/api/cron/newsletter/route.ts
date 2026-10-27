import { NextRequest, NextResponse } from "next/server";
import { processNewsletterQueue, newsletterQueueStats } from "@/lib/newsletter-queue";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Vercel Hobby permits a once-daily safety-net run; initial sending starts at publication. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processNewsletterQueue(95);
    const queue = await newsletterQueueStats();
    return NextResponse.json({ ok: true, result, queue });
  } catch (error) {
    console.error("Daily newsletter worker failed:", error);
    return NextResponse.json({ error: "Delivery check failed" }, { status: 500 });
  }
}
