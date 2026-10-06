import { redirect } from "next/navigation";
export default function HomeSettingsRedirect() {
  redirect("/admin/issues");
}
