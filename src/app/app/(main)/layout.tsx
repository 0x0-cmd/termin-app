import Link from "next/link";
import { requireBusiness } from "@/lib/dal";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { business } = await requireBusiness();
  const trialDays = Math.ceil((Date.parse(business.trial_ends_at) - Date.now()) / 86_400_000);
  return (
    <div className="flex min-h-full flex-1 flex-col pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/app" className="truncate font-bold">{business.name}</Link>
          <nav className="hidden gap-1 md:flex">
            <NavLinks variant="top" />
          </nav>
          <Link href="/app/einstellungen" className="text-sm text-stone-600" aria-label="Einstellungen">
            ⚙︎ <span className="hidden sm:inline">Einstellungen</span>
          </Link>
        </div>
        {business.plan === "trial" && trialDays <= 7 && (
          <p className="bg-amber-50 px-4 py-1 text-center text-xs text-amber-800">
            Testphase: noch {Math.max(trialDays, 0)} Tage
          </p>
        )}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
