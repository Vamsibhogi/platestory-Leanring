import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  trpc.badge.checkAndAward.useMutation();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

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

        {/* Vibrant Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="stat-card gradient-bg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.data?.points ?? 0}</p>
                <p className="text-xs text-white/70">Points</p>
              </div>
            </div>
          </div>
          <div className="stat-card gradient-bg-warm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.data?.streakDays ?? 0}</p>
                <p className="text-xs text-white/70">Day Streak</p>
              </div>
            </div>
          </div>
          <div className="stat-card gradient-bg-success">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.data?.completedCourses ?? 0}</p>
                <p className="text-xs text-white/70">Completed</p>
              </div>
            </div>
          </div>
          <div className="stat-card gradient-bg-violet">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatTime(stats.data?.totalTimeSpentSec ?? 0)}</p>
                <p className="text-xs text-white/70">Time Spent</p>
              </div>
            </div>
          </div>
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
                        <Card className="border-border/50 card-hover cursor-pointer group">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 group-hover:from-primary/30 group-hover:to-accent/30 transition-all">
                                <BookOpen className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-sm truncate">{course.title}</h3>
                                  {course.mode === "micro" && (
                                    <Badge variant="secondary" className="text-[10px] shrink-0 bg-amber-100 text-amber-700">Micro</Badge>
                                  )}
                                  {course.mode === "deep" && (
                                    <Badge variant="secondary" className="text-[10px] shrink-0 bg-blue-100 text-blue-700">Deep Dive</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <Progress value={enrollment.progress} className="h-2 flex-1" />
                                  <span className="text-xs font-medium text-primary shrink-0">{enrollment.progress}%</span>
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
                      className="glass-card px-4 py-3 flex items-center gap-3 card-hover"
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
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary" />
              </div>
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
                            notif.isRead ? "bg-transparent hover:bg-accent/30" : "bg-primary/5"
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
