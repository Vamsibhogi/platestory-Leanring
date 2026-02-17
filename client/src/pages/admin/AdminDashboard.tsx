import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BookOpen, CheckCircle2, TrendingUp, Users } from "lucide-react";

export default function AdminDashboard() {
  const stats = trpc.analytics.overview.useQuery();
  const activity = trpc.analytics.recentActivity.useQuery();

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-semibold mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your learning platform</p>
      </div>

      {/* Vibrant Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card" style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.data?.totalUsers ?? 0}</p>
              <p className="text-xs text-white/70">Total Users</p>
            </div>
          </div>
        </div>
        <div className="stat-card gradient-bg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.data?.totalCourses ?? 0}</p>
              <p className="text-xs text-white/70">Courses</p>
            </div>
          </div>
        </div>
        <div className="stat-card gradient-bg-warm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.data?.totalEnrollments ?? 0}</p>
              <p className="text-xs text-white/70">Enrollments</p>
            </div>
          </div>
        </div>
        <div className="stat-card gradient-bg-success">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.data?.completionRate ?? 0}%</p>
              <p className="text-xs text-white/70">Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {(activity.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {activity.data?.slice(0, 15).map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    item.action.includes("completed") ? "bg-emerald-500" :
                    item.action.includes("enrolled") ? "bg-blue-500" :
                    item.action.includes("quiz") ? "bg-amber-500" : "bg-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{item.userName ?? "User"}</span>
                      {" "}
                      <span className="text-muted-foreground">{item.action.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
