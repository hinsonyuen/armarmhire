import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser, homeFor, safeNextPath } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <AuthShell title="Log in" subtitle="Welcome back. Enter your details to continue.">
      <LoginForm next={safeNextPath(searchParams.next)} />
    </AuthShell>
  );
}
