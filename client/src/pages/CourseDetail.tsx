import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Play,
  Star,
  Video,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

const lessonTypeIcons = { video: Video, text: FileText, quiz: HelpCircle };

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id ?? "0");
  const { user } = useAuth();
  const course = trpc.course.getById.useQuery({ id: courseId }, { enabled: courseId > 0 });
  const lessons = trpc.lesson.listByCourse.useQuery({ courseId }, { enabled: courseId > 0 });
  const progress = trpc.enrollment.getProgress.useQuery({ courseId }, { enabled: courseId > 0 && !!user });
  const quizzes = trpc.quiz.getByCourse.useQuery({ courseId }, { enabled: courseId > 0 });
  const utils = trpc.useUtils();

  const enrollMutation = trpc.enrollment.enroll.useMutation({
    onSuccess: () => {
      utils.enrollment.getProgress.invalidate({ courseId });
      utils.enrollment.myEnrollments.invalidate();
      toast.success("Successfully enrolled!");
    },
  });

  const enrollment = progress.data?.enrollment;
  const lessonProgressMap = new Map(
    (progress.data?.lessonProgress ?? []).map(lp => [lp.lessonId, lp])
  );

  if (!course.data) {
    return (
      <AppLayout>
        <div className="container py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </AppLayout>
    );
  }

  const c = course.data;

  return (
    <AppLayout>
      <div className="container py-8">
        <Link href="/courses">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{c.mode === "micro" ? "Micro-Learning" : c.mode === "deep" ? "Deep Dive" : "Standard"}</Badge>
                <Badge variant="secondary" className="capitalize">{c.difficulty}</Badge>
                {c.isMandatory && <Badge className="bg-destructive text-destructive-foreground">Mandatory</Badge>}
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold mb-3">{c.title}</h1>
              {c.description && (
                <p className="text-muted-foreground leading-relaxed">{c.description}</p>
              )}
            </div>

            {/* Lessons List */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Lessons ({lessons.data?.length ?? 0})
              </h2>
              <div className="space-y-2">
                {lessons.data?.map((lesson, idx) => {
                  const lp = lessonProgressMap.get(lesson.id);
                  const isCompleted = lp?.completed;
                  const LessonIcon = lessonTypeIcons[lesson.type] || BookOpen;
                  return (
                    <Link
                      key={lesson.id}
                      href={enrollment ? `/lesson/${lesson.id}` : "#"}
                    >
                      <Card className={`border-border/50 transition-all ${enrollment ? "hover:shadow-md cursor-pointer" : "opacity-60"}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isCompleted ? "bg-emerald-100" : "bg-primary/10"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <LessonIcon className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{idx + 1}. {lesson.title}</p>
                            {lesson.description && (
                              <p className="text-xs text-muted-foreground truncate">{lesson.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            {lesson.type === "video" && (lesson.videoDurationSec ?? 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.ceil((lesson.videoDurationSec ?? 0) / 60)}m
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {lesson.pointsReward}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Quizzes */}
            {(quizzes.data?.length ?? 0) > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Quizzes</h2>
                <div className="space-y-2">
                  {quizzes.data?.map((quiz) => (
                    <Link key={quiz.id} href={enrollment ? `/quiz/${quiz.id}` : "#"}>
                      <Card className={`border-border/50 transition-all ${enrollment ? "hover:shadow-md cursor-pointer" : "opacity-60"}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <HelpCircle className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{quiz.title}</p>
                            {quiz.description && (
                              <p className="text-xs text-muted-foreground truncate">{quiz.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span>Pass: {quiz.passingScore}%</span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {quiz.pointsReward}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <Card className="border-border/50 sticky top-24">
              <CardContent className="p-6">
                {c.thumbnailUrl ? (
                  <img src={c.thumbnailUrl} alt={c.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg mb-4 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-primary/30" />
                  </div>
                )}

                {enrollment ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{enrollment.progress}%</span>
                      </div>
                      <Progress value={enrollment.progress} className="h-2" />
                    </div>
                    <Badge variant="secondary" className="capitalize w-full justify-center py-1.5">
                      {enrollment.status.replace("_", " ")}
                    </Badge>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => enrollMutation.mutate({ courseId })}
                    disabled={enrollMutation.isPending}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
                  </Button>
                )}

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Lessons</span>
                    <span className="font-medium">{lessons.data?.length ?? 0}</span>
                  </div>
                  {(c.estimatedMinutes ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{c.estimatedMinutes} min</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Points</span>
                    <span className="font-medium">{c.pointsReward}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Difficulty</span>
                    <span className="font-medium capitalize">{c.difficulty}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
