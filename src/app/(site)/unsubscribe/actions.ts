"use server";

import { redirect } from "next/navigation";
import { unsubscribeByToken } from "@/lib/store";

export async function confirmUnsubscribeAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/unsubscribe?invalid=1");
  const removed = await unsubscribeByToken(token);
  redirect(removed ? "/unsubscribe?done=1" : "/unsubscribe?invalid=1");
}
