import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin";

export const metadata = {
  title: "Admin · Psychéon",
  robots: { index: false, follow: false },
};

/**
 * The single guard for every /admin route. requireAdmin() calls notFound() for
 * signed-out visitors and non-admins alike, so the section never advertises its
 * own existence. Server Actions re-check independently -- see admin/actions.ts.
 */
export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <main className="min-h-[calc(100svh-4.5rem)] bg-background">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <header className="space-y-4 border-b border-border/70 pb-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Admin
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Signed in as {admin.display_name}
            </h1>
          </div>
          <AdminNav />
        </header>

        {children}
      </div>
    </main>
  );
}
