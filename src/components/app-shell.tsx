import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, ClipboardList, MapPin, Wallet, UserCircle, LogOut, Shield, Radar, Bell, Menu, X, FileText } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { firebase } from "@/lib/firebase-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLocationTracker } from "@/hooks/use-location-tracker";
import { BrandHeader } from "@/components/brand-header";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; show: (me: NonNullable<ReturnType<typeof useCurrentUser>["data"]>) => boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, show: (me) => me.isStaff },
  { to: "/employees", label: "Team", icon: Users, show: (me) => me.perms.manageEmployees || me.isDHR },
  { to: "/tracking", label: "Track", icon: Radar, show: (me) => me.perms.viewLiveTracking },
  { to: "/tasks", label: "Tasks", icon: ClipboardList, show: (me) => me.perms.viewTasks },
  { to: "/attendance", label: "Attend", icon: MapPin, show: () => true },
  { to: "/reports", label: "Report", icon: FileText, show: () => true },
  { to: "/ta", label: "TA", icon: Wallet, show: (me) => me.perms.viewTA },
  { to: "/notifications", label: "Alerts", icon: Bell, show: (me) => me.isAdmin },
  { to: "/settings", label: "Perms", icon: Shield, show: (me) => me.perms.managePermissions },
  { to: "/profile", label: "Me", icon: UserCircle, show: () => true },
];

function roleLabel(me: ReturnType<typeof useCurrentUser>["data"]) {
  if (!me) return null;
  if (me.roles.has("admin") || me.isSuperAdmin) return "Admin";
  if (me.roles.has("hr")) return "HR";
  if (me.roles.has("dhr")) return "DHR";
  if (me.roles.has("fso")) return "FSO";
  if (me.roles.has("sr")) return "SR";
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = me ? NAV.filter((n) => n.show(me)) : [];
  const badge = roleLabel(me);
  const useDrawer = !!me?.isStaff;

  // Track location for field employees (SR/FSO/DSR/DHR-in-field)
  useLocationTracker();

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Unread notifications badge for admins
  const { data: unread } = useQuery({
    queryKey: ["notifications-unread"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { count } = await firebase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (!me?.isAdmin) return;
    const ch = firebase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => qc.invalidateQueries({ queryKey: ["notifications-unread"] }),
      )
      .subscribe();
    return () => {
      firebase.removeChannel(ch);
    };
  }, [me?.isAdmin, qc]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await firebase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className={`mx-auto flex min-h-screen w-full flex-col bg-transparent ${useDrawer ? "max-w-7xl" : "max-w-md"}`}>
      {/* Top app bar */}
      <header
        className="glass sticky top-0 z-30 flex items-center gap-3 px-4"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)", paddingBottom: "0.5rem" }}
      >
        {useDrawer && (
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/60 text-foreground hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
            {!!unread && unread > 0 && (
              <span className="absolute mt-[-18px] ml-[18px] min-w-[16px] rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <BrandHeader size="sm" variant="horizontal" />
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {badge}
          </span>
        )}
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/60 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Scrollable content */}
      <main
        className="flex-1 px-4 pt-4"
        style={{
          paddingBottom: useDrawer
            ? "calc(env(safe-area-inset-bottom) + 1.5rem)"
            : "calc(env(safe-area-inset-bottom) + 5.5rem)",
        }}
      >
        {children}
      </main>

      {/* Slide-in drawer for staff/admin */}
      {useDrawer && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${
              drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          <aside
            className={`glass fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-sidebar-border/60 transition-transform ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)", paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
          >
            <div className="flex items-center gap-3 px-4 pb-3">
              <BrandHeader size="sm" variant="horizontal" className="flex-1 min-w-0" />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/60 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-4 mb-2 h-px bg-sidebar-border/60" />
            <nav className="flex-1 overflow-y-auto px-2 py-2">
              {nav.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/80 hover:bg-accent/60"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1">{item.label}</span>
                    {item.to === "/notifications" && !!unread && unread > 0 && (
                      <span className="min-w-[20px] rounded-full bg-destructive px-1.5 text-center text-[10px] font-bold leading-5 text-destructive-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 pt-2">
              <button
                onClick={signOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/60 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Bottom tab bar — only for field users (non-staff) */}
      {!useDrawer && (
        <nav
          className="glass fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md items-stretch justify-around border-t border-sidebar-border/60 px-1"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.35rem)", paddingTop: "0.35rem" }}
        >
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" />
                )}
                <item.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
