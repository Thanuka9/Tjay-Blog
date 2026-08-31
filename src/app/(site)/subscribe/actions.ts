"use server";

import { addSubscriber } from "@/lib/store";
import { sendWelcomeEmail } from "@/lib/mail";

export async function subscribeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  try {
    const result = await addSubscriber(email);
    if (!result.already) {
      await sendWelcomeEmail(result.subscriber).catch(() => {
        // Subscription still succeeds if mail is not configured.
      });
    }
    return {
      ok: true as const,
      message: result.already
        ? "You are already on the list."
        : "You are in. Check your inbox for the latest pieces.",
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not subscribe.",
    };
  }
}
