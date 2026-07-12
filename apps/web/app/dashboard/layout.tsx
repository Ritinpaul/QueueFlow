"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Settings, LogOut, ChevronRight } from "lucide-react";
import { fetchApi } from "../../lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("queueflow_token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Pre-fetch project names so breadcrumbs can resolve UUIDs
    fetchApi("/projects")
      .then((res) => {
        const map: Record<string, string> = {};
        (res.data || []).forEach((p: { id: string; name: string }) => {
          map[p.id] = p.name;
        });
        setProjectNames(map);
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("queueflow_token");
    router.push("/login");
  };

  if (!isMounted) return null; // Avoid hydration mismatch

  const navItems = [
    { name: "Projects", href: "/dashboard/projects", icon: LayoutDashboard },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter((segment) => segment !== "");
  
  return (
    <div className="min-h-screen bg-background flex text-foreground selection:bg-primary selection:text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r-[1.5px] border-foreground bg-white hidden md:flex flex-col">
        <Link href="/dashboard" className="h-16 flex items-center px-6 border-b-[1.5px] border-foreground hover:bg-foreground/5 transition-colors">
          <div className="w-8 h-8 bg-foreground flex items-center justify-center font-bold text-background mr-3">
            Q
          </div>
          <span className="font-heading font-black text-xl tracking-tighter uppercase">QueueFlow</span>
        </Link>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-bold transition-all border-[1.5px] ${
                    isActive
                      ? "bg-primary border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                      : "border-transparent text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-foreground" : ""}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t-[1.5px] border-foreground">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-bold text-foreground hover:bg-foreground hover:text-background transition-colors border-[1.5px] border-transparent hover:border-foreground"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden bg-background">
        {/* Header */}
        <header className="h-16 border-b-[1.5px] border-foreground bg-white flex items-center px-6 sticky top-0 z-10">
          <div className="flex items-center text-sm font-bold text-foreground/50 uppercase tracking-widest">
            {pathSegments.map((segment, index) => {
              const isLast = index === pathSegments.length - 1;
              const href = "/" + pathSegments.slice(0, index + 1).join("/");
              // Resolve UUID segments to project names
              const isUuid = /^[0-9a-f-]{36}$/.test(segment);
              const label = isUuid
                ? (projectNames[segment] ?? segment.slice(0, 8).toUpperCase() + "...")
                : segment.charAt(0).toUpperCase() + segment.slice(1);

              return (
                <div key={segment} className="flex items-center">
                  {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
                  {isLast ? (
                    <span className="text-foreground font-black">{label}</span>
                  ) : (
                    <Link href={href} className="hover:text-foreground transition-colors hover:underline">
                      {label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
