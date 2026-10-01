import Link from "next/link";
import { Package } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Package className="h-4 w-4" />
          </span>
          <span>secretwr</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Обзор
          </Link>
          <Link
            href="/months"
            className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            По месяцам
          </Link>
          <Link
            href="/boxes/new"
            className="rounded-lg bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-800"
          >
            Добавить коробку
          </Link>
        </nav>
      </div>
    </header>
  );
}
