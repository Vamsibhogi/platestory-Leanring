import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { BarChart3, BookOpen, TrendingUp, Users } from "lucide-react";

export default function AdminAnalytics() {
  const overview = trpc.analytics.overview.useQuery();
  const courseStats = trpc.analytics.courseStats.useQuery();

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-semibold mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">Platform engagement and learning insights</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.data?.totalUsers ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.data?.totalCourses ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.data?.totalEnrollments ?? 0}</p>
                <p className="text-xs text-muted-foreground">Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.data?.completionRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Course Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {(courseStats.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No course data yet</p>
          ) : (
            <div className="space-y-4">
              {courseStats.data?.map((stat) => (
                <div key={stat.courseId} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{stat.courseId}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>{stat.total} enrolled</span>
                      <span>{stat.completed} completed</span>
                    </div>
                  </div>
                  <div className="w-32 shrink-0">
                    <Progress
                      value={stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0}
                      className="h-2"
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right shrink-0">
                    {stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0}%
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
