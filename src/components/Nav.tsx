"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/candidates", label: "Candidates" },
];

export default function Nav() {
  const pathname = usePathname();
  const { profile, role, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/dashboard">
            <Logo className="text-lg" />
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            {role === "admin" && (
              <Link
                href="/admin"
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  pathname.startsWith("/admin")
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-700">
              {profile?.displayName || profile?.email}
            </p>
            <p className="text-xs capitalize text-slate-400">{role}</p>
          </div>
          <button onClick={() => logout()} className="btn-secondary">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
