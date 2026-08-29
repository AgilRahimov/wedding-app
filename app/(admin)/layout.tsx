import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { signOut } from "@/app/login/actions";
import { NavLinks } from "./nav-links";

// Every screen inside the (admin) group goes through this layout,
// so requireAdmin() here is the auth gate for all of them.
// (Server actions check again on their own — the layout only guards viewing.)
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Wedding&nbsp;HQ
            </Link>
            <NavLinks isOwner={session.role === "owner"} />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-stone-500 sm:inline">{session.name}</span>
            <form action={signOut}>
              <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-600 transition hover:bg-stone-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
