import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { BottomTabs, BottomTabsFallback } from "@/components/bottom-tabs";

// Every screen in this group needs a signed-in user. This is the page-level
// check; Row Level Security is what actually keeps one skier's data from
// another, so a page that slipped past this would still show nothing.

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Bottom padding = the tab bar's height plus the phone's home-bar
          inset, or the last row of every list sits under the bar. */}
      <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        {/* Reading the session is request-time work, so it sits behind a
            boundary (a Cache Components rule; reading cookies outside one
            fails the build). */}
        <Suspense fallback={<p className="p-4 text-muted">Loading…</p>}>
          <RequireUser>{children}</RequireUser>
        </Suspense>
      </div>
      <Suspense fallback={<BottomTabsFallback />}>
        <BottomTabs />
      </Suspense>
    </>
  );
}

async function RequireUser({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
