import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { isAdminLoggedIn } from "@/lib/auth";
import { site } from "@/lib/site";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (await isAdminLoggedIn()) {
    redirect("/admin");
  }

  const { next, error } = await searchParams;

  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-border p-10 lg:flex">
        <p className="font-serif text-2xl">{site.name}</p>
        <div>
          <p className="font-serif text-4xl leading-tight tracking-tight">
            {site.tagline}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Editor desk for drafting, sourcing, and publishing.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Sign in to continue.</p>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-serif text-2xl lg:hidden">{site.name}</p>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Sign in to write and edit.
          </p>
          <LoginForm next={next || "/admin"} error={error} />
        </div>
      </div>
    </div>
  );
}
