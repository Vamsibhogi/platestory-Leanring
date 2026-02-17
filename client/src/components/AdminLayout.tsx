import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Users,
  UserPlus,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const adminNavItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: BookOpen, label: "Courses", path: "/admin/courses" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: UserPlus, label: "Allocate", path: "/admin/allocate" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md">
          <div className="h-16 w-16 rounded-2xl gradient-bg flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-semibold">Admin Access Required</h1>
          <p className="text-sm text-muted-foreground text-center">
            You need admin privileges to access this area.
          </p>
          {!user ? (
            <Button onClick={() => { window.location.href = getLoginUrl(); }}>Sign in</Button>
          ) : (
            <Link href="/dashboard">
              <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Dark Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-4 border-b border-sidebar-border">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <span className="font-serif font-semibold text-sm text-sidebar-foreground">Platestory</span>
              <span className="text-xs text-sidebar-foreground/60 block">Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminNavItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-sidebar-primary/20 text-sidebar-primary shadow-sm"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Link href="/dashboard">
            <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Back to LMS
            </button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg hover:bg-sidebar-accent transition-colors">
                <Avatar className="h-7 w-7 border border-sidebar-border">
                  <AvatarFallback className="text-xs bg-sidebar-primary/20 text-sidebar-primary">
                    {user.name?.charAt(0).toUpperCase() ?? "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
                  <p className="text-xs text-sidebar-foreground/50 truncate">{user.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
