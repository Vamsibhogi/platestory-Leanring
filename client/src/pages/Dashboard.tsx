import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Medal,
  Star,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const stats = trpc.user.stats.useQuery(undefined, { enabled: !!user });
  const enrollments = trpc.enrollment.myEnrollments.useQuery(undefined, { enabled: !!user });
  const courses = trpc.course.list.useQuery(undefined, { enabled: !!user });
  const notifs = trpc.notification.list.useQuery(undefined, { enabled: !!user });
  const badges = trpc.badge.myBadges.useQuery(undefined, { enabled: !!user });

  // Check for new badges on load
  trpc.badge.checkAndAward.useMutation();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const enrolledCourseIds = new Set(enrollments.data?.map(e => e.courseId) ?? []);
  const inProgressEnrollments = enrollments.data?.filter(e => e.status !== "completed") ?? [];
  const courseMap = new Map(courses.data?.map(c => [c.id, c]) ?? []);

  return (
    <AppLayout>
      <div className="container py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-semibold mb-1">
            Welcome back, {user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-muted-foreground">Continue your learning journey</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.data?.points ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <Flame className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.data?.streakDays ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.data?.completedCourses ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatTime(stats.data?.totalTimeSpentSec ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">Time Spent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Continue Learning */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Continue Learning</h2>
                <Link href="/courses">
                  <Button variant="ghost" size="sm" className="text-primary">
                    View All <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {inProgressEnrollments.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No courses in progress</p>
                    <Link href="/courses">
                      <Button variant="outline" size="sm" className="mt-4">
                        Browse Courses
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {inProgressEnrollments.slice(0, 4).map((enrollment) => {
                    const course = courseMap.get(enrollment.courseId);
                    if (!course) return null;
                    return (
                      <Link key={enrollment.id} href={`/courses/${course.id}`}>
                        <Card className="border-border/50 hover:shadow-md transition-all cursor-pointer group">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                                <BookOpen className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-sm truncate">{course.title}</h3>
                                  {course.mode === "micro" && (
                                    <Badge variant="secondary" className="text-[10px] shrink-0">Micro</Badge>
                                  )}
                                  {course.mode === "deep" && (
                                    <Badge variant="secondary" className="text-[10px] shrink-0">Deep Dive</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Progress value={enrollment.progress} className="h-1.5 flex-1" />
                                  <span className="text-xs text-muted-foreground shrink-0">{enrollment.progress}%</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Badges */}
            {(badges.data?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Recent Badges</h2>
                  <Link href="/badges">
                    <Button variant="ghost" size="sm" className="text-primary">
                      View All <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {badges.data?.slice(0, 6).map((badge) => (
                    <div
                      key={badge.id}
                      className="glass-card px-4 py-3 flex items-center gap-3"
                    >
                      <span className="text-2xl">{badge.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{badge.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{badge.tier}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </div>
            <Card className="border-border/50">
              <ScrollArea className="h-[400px]">
                <CardContent className="p-3">
                  {(notifs.data?.length ?? 0) === 0 ? (
                    <div className="py-12 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifs.data?.slice(0, 20).map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 rounded-lg text-sm transition-colors ${
                            notif.isRead ? "bg-transparent" : "bg-primary/5"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">
                              {notif.type === "badge_earned" && <Medal className="h-4 w-4 text-amber-500" />}
                              {notif.type === "course_completed" && <Trophy className="h-4 w-4 text-emerald-500" />}
                              {notif.type === "course_assigned" && <BookOpen className="h-4 w-4 text-blue-500" />}
                              {notif.type === "streak" && <Flame className="h-4 w-4 text-orange-500" />}
                              {!["badge_earned", "course_completed", "course_assigned", "streak"].includes(notif.type) && (
                                <Bell className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs">{notif.title}</p>
                              {notif.message && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
