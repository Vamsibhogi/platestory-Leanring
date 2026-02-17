import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function LessonPlayer() {
  const { id } = useParams<{ id: string }>();
  const lessonId = parseInt(id ?? "0");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const lesson = trpc.lesson.getById.useQuery({ id: lessonId }, { enabled: lessonId > 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const timeTracker = useRef(0);
  const utils = trpc.useUtils();

  const progressMutation = trpc.progress.update.useMutation({
    onSuccess: () => {
      utils.enrollment.getProgress.invalidate();
      utils.enrollment.myEnrollments.invalidate();
      utils.user.stats.invalidate();
    },
  });

  // Get sibling lessons for navigation
  const courseLessons = trpc.lesson.listByCourse.useQuery(
    { courseId: lesson.data?.courseId ?? 0 },
    { enabled: !!lesson.data?.courseId }
  );

  const currentIndex = courseLessons.data?.findIndex(l => l.id === lessonId) ?? -1;
  const prevLesson = currentIndex > 0 ? courseLessons.data?.[currentIndex - 1] : null;
  const nextLesson = courseLessons.data && currentIndex < courseLessons.data.length - 1
    ? courseLessons.data[currentIndex + 1]
    : null;

  // Track time spent
  useEffect(() => {
    const interval = setInterval(() => {
      timeTracker.current += 10;
      if (timeTracker.current % 30 === 0 && lesson.data) {
        progressMutation.mutate({
          lessonId,
          courseId: lesson.data.courseId,
          timeSpentSec: 30,
          videoPositionSec: videoRef.current ? Math.floor(videoRef.current.currentTime) : undefined,
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [lessonId, lesson.data?.courseId]);

  const handleComplete = () => {
    if (!lesson.data) return;
    progressMutation.mutate({
      lessonId,
      courseId: lesson.data.courseId,
      completed: true,
      timeSpentSec: timeTracker.current,
    });
    setIsCompleted(true);
    toast.success("Lesson completed! Points earned.");
  };

  if (!lesson.data) {
    return (
      <AppLayout>
        <div className="container py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Lesson not found</p>
        </div>
      </AppLayout>
    );
  }

  const l = lesson.data;

  return (
    <AppLayout>
      <div className="container py-6">
        <Link href={`/courses/${l.courseId}`}>
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </button>
        </Link>

        <div className="max-w-4xl mx-auto">
          {/* Lesson Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="capitalize">{l.type}</Badge>
              {isCompleted && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-semibold">{l.title}</h1>
            {l.description && (
              <p className="text-muted-foreground mt-1">{l.description}</p>
            )}
          </div>

          {/* Video Player */}
          {l.type === "video" && l.videoUrl && (
            <div className="mb-6 rounded-xl overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                src={l.videoUrl}
                controls
                className="w-full h-full"
                onEnded={handleComplete}
              />
            </div>
          )}

          {/* Text Content */}
          {l.type === "text" && l.textContent && (
            <Card className="mb-6 border-border/50">
              <CardContent className="p-6 md:p-8 prose prose-sm max-w-none">
                <Streamdown>{l.textContent}</Streamdown>
              </CardContent>
            </Card>
          )}

          {/* Complete Button */}
          {!isCompleted && (
            <div className="flex justify-center mb-8">
              <Button
                size="lg"
                onClick={handleComplete}
                disabled={progressMutation.isPending}
                className="px-8"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                {progressMutation.isPending ? "Saving..." : "Mark as Complete"}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            {prevLesson ? (
              <Link href={`/lesson/${prevLesson.id}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              </Link>
            ) : (
              <div />
            )}
            {nextLesson ? (
              <Link href={`/lesson/${nextLesson.id}`}>
                <Button size="sm">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href={`/courses/${l.courseId}`}>
                <Button size="sm" variant="outline">
                  Back to Course
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
