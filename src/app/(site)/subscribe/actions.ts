"use server";

import { addSubscriber } from "@/lib/store";
import { sendWelcomeEmail } from "@/lib/mail";

export async function subscribeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  try {
    const result = await addSubscriber(email);
    const welcome = result.already
      ? null
      : await sendWelcomeEmail(result.subscriber).catch(() => ({ sent: false as const }));
    return {
      ok: true as const,
      message: result.already
        ? "You are already on the list."
        : welcome?.sent
          ? "You are in. Your welcome email is on its way."
          : "You are subscribed. Email delivery is not active yet; you will still appear in the subscriber list.",
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Could not subscribe.",
    };
  }
}
