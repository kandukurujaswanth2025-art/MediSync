import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import {
  LayoutDashboard, ListOrdered, Stethoscope, Pill, PackageOpen,
  Bell, LogOut, Menu, X, Building2, Boxes, Activity, ClipboardList,
  History, UserPlus, Users, ShieldCheck,
} from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { unreadCount } from "@/services/notificationService";
import { useDbVersion } from "@/hooks/useDbVersion";
import { cn } from "@/lib/utils";

const NAV = {
  hospital: {
    home: "/hospital",
    items: [
      { to: "/hospital", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/hospital/queue", label: "Patient Queue", icon: ListOrdered },
      { to: "/hospital/current", label: "Current Patient", icon: Stethoscope },
      { to: "/hospital/medicines", label: "Medicines", icon: Pill },
      { to: "/hospital/requests", label: "Resource Requests", icon: PackageOpen },
      { to: "/hospital/notifications", label: "Notifications", icon: Bell },
    ],
  },
  manager: {
    home: "/manager",
    items: [
      { to: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/manager/departments", label: "Departments", icon: Building2 },
      { to: "/manager/medicines", label: "Medicines", icon: Pill },
      { to: "/manager/equipment", label: "Equipment", icon: Boxes },
      { to: "/manager/requests", label: "Requests", icon: ClipboardList },
      { to: "/manager/stock-history", label: "Stock History", icon: History },
      { to: "/manager/notifications", label: "Notifications", icon: Bell },
    ],
  },
  patient: {
    home: "/patient",
    items: [
      { to: "/patient", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/patient/register-visit", label: "Register Visit", icon: UserPlus },
      { to: "/patient/queue", label: "My Queue", icon: ListOrdered },
      { to: "/patient/medicines", label: "Medicines", icon: Pill },
      { to: "/patient/notifications", label: "Notifications", icon: Bell },
      { to: "/patient/history", label: "Visit History", icon: History },
    ],
  },
};

const ROLE_LABEL = {
  hospital: "Hospital Console",
  manager: "Resource Manager",
  patient: "Patient Portal",
};

export default function DashboardLayout({ role }) {
  const { session, isAuthenticated, logout } = useAppAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  if (!isAuthenticated || session.role !== role) {
    const dest = role === "hospital" ? "/login/hospital" : role === "manager" ? "/login/manager" : "/login/patient";
    return <Navigate to={dest} replace />;
  }
  if (role === "patient" && !session.selectedHospitalId) {
    return <Navigate to="/select-hospital" replace />;
  }

  const config = NAV[role];
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarBrand role={role} />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {config.items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}>
              <item.icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
              {item.label === "Notifications" && <UnreadBadge role={role} />}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={handleLogout} className="nav-link w-full text-sidebar-foreground/70 hover:text-rose-300">
            <LogOut className="h-4.5 w-4.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-border">
          <Menu className="h-5 w-5" />
        </button>
        <BrandMark role={role} compact />
        <button onClick={handleLogout} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex items-center justify-between px-4 py-4">
              <BrandMark role={role} compact />
              <button onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-sidebar-foreground/80">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {config.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}>
                  <item.icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="p-3">
              <button onClick={handleLogout} className="nav-link w-full text-sidebar-foreground/70 hover:text-rose-300">
                <LogOut className="h-4.5 w-4.5" /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <Topbar role={role} onLogout={handleLogout} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Topbar({ role, onLogout }) {
  const { session } = useAppAuth();
  return (
    <header className="hidden items-center justify-between border-b border-border bg-card/60 px-8 py-3.5 backdrop-blur lg:flex">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ROLE_LABEL[role]}</span>
        {role === "patient" ? (
          <span className="text-sm font-medium text-foreground">{session.name}</span>
        ) : (
          <span className="text-sm font-medium text-foreground">{session.name}</span>
        )}
        {session.hospitalCode && (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{session.hospitalCode}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <NavLink to={role === "patient" ? "/patient/notifications" : role === "hospital" ? "/hospital/notifications" : "/manager/notifications"} className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
          <Bell className="h-4.5 w-4.5" />
          <UnreadBadge role={role} floating />
        </NavLink>
        <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </header>
  );
}

function UnreadBadge({ role, floating }) {
  const { session } = useAppAuth();
  useDbVersion();

  const [count, setCount] = useState(0);

  React.useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      if (!session) {
        setCount(0);
        return;
      }

      try {
        const value =
          role === "patient"
            ? await unreadCount(
                session.selectedHospitalId,
                "patient",
                session.patientId
              )
            : await unreadCount(
                session.hospitalId,
                role,
                null
              );

        if (active) {
          setCount(Number(value) || 0);
        }
      } catch (error) {
        console.error(
          "Failed to load notification count:",
          error
        );

        if (active) {
          setCount(0);
        }
      }
    }

    loadUnreadCount();

    return () => {
      active = false;
    };
  }, [
    session,
    role
  ]);

  if (!count) return null;

  return (
    <span
      className={cn(
        "grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white",
        floating
          ? "absolute -right-1 -top-1"
          : "ml-auto"
      )}
    >
      {count}
    </span>
  );
}

function SidebarBrand({ role }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Activity className="h-5 w-5" />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-bold tracking-tight text-sidebar-foreground">MediSync</div>
        <div className="text-[11px] text-sidebar-foreground/60">{ROLE_LABEL[role]}</div>
      </div>
    </div>
  );
}

function BrandMark({ role, compact }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Activity className="h-4.5 w-4.5" />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-bold tracking-tight">MediSync</div>
        {!compact && <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</div>}
      </div>
    </div>
  );
}