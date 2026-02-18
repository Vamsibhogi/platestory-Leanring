import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  HelpCircle,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

type UploadState = {
  progress: number; // 0-100
  status: "idle" | "uploading" | "saving" | "done" | "error";
  errorMessage?: string;
};

// Upload file via multipart form data to /api/upload/video
async function uploadVideoFile(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ url: string; fileKey: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/video");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        let errorMsg = `Upload failed (${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) errorMsg = data.error;
        } catch { /* ignore */ }
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.timeout = 5 * 60 * 1000; // 5 minute timeout

    xhr.send(formData);
  });
}

export default function AdminCourseEditor() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id ?? "0");
  const course = trpc.course.getById.useQuery({ id: courseId }, { enabled: courseId > 0 });
  const lessons = trpc.lesson.listByCourse.useQuery({ courseId }, { enabled: courseId > 0 });
  const quizzes = trpc.quiz.getByCourse.useQuery({ courseId }, { enabled: courseId > 0 });
  const utils = trpc.useUtils();

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "text" | "quiz",
    textContent: "",
    sortOrder: 0,
    pointsReward: 5,
  });
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    passingScore: 70,
    timeLimitMinutes: 0,
    pointsReward: 20,
  });

  // Per-lesson upload state
  const [uploadStates, setUploadStates] = useState<Record<number, UploadState>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const createLessonMutation = trpc.lesson.create.useMutation({
    onSuccess: () => {
      utils.lesson.listByCourse.invalidate({ courseId });
      setShowAddLesson(false);
      setLessonForm({ title: "", description: "", type: "video", textContent: "", sortOrder: 0, pointsReward: 5 });
      toast.success("Lesson created!");
    },
  });

  const deleteLessonMutation = trpc.lesson.delete.useMutation({
    onSuccess: () => {
      utils.lesson.listByCourse.invalidate({ courseId });
      toast.success("Lesson deleted!");
    },
  });

  const createQuizMutation = trpc.quiz.create.useMutation({
    onSuccess: () => {
      utils.quiz.getByCourse.invalidate({ courseId });
      setShowAddQuiz(false);
      toast.success("Quiz created!");
    },
  });

  const updateLessonMutation = trpc.lesson.update.useMutation({
    onSuccess: () => {
      utils.lesson.listByCourse.invalidate({ courseId });
    },
  });

  const setUploadState = useCallback((lessonId: number, state: Partial<UploadState>) => {
    setUploadStates(prev => ({
      ...prev,
      [lessonId]: { ...(prev[lessonId] ?? { progress: 0, status: "idle" }), ...state },
    }));
  }, []);

  const handleVideoUpload = useCallback(async (lessonId: number, file: File) => {
    // Validate file size (max 200MB)
    if (file.size > 200 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 200MB.");
      return;
    }

    setUploadState(lessonId, { status: "uploading", progress: 0 });

    try {
      // Step 1: Upload to S3 via multipart form data with real progress tracking
      const result = await uploadVideoFile(file, (percent) => {
        setUploadState(lessonId, { progress: Math.min(percent, 95), status: "uploading" });
      });

      // Step 2: Save URL to lesson
      setUploadState(lessonId, { status: "saving", progress: 97 });

      await updateLessonMutation.mutateAsync({
        id: lessonId,
        videoUrl: result.url,
        videoKey: result.fileKey,
      });

      setUploadState(lessonId, { status: "done", progress: 100 });
      toast.success("Video uploaded successfully!");

      // Clear the done state after 5 seconds
      setTimeout(() => {
        setUploadStates(prev => {
          const copy = { ...prev };
          delete copy[lessonId];
          return copy;
        });
      }, 5000);

    } catch (err: any) {
      console.error("[VideoUpload] Error:", err);
      const errorMessage = err?.message || "Upload failed. Please try again.";
      setUploadState(lessonId, { status: "error", progress: 0, errorMessage });
      toast.error(errorMessage);
    }
  }, [updateLessonMutation, setUploadState]);

  const getUploadStatusText = (state: UploadState) => {
    switch (state.status) {
      case "uploading": return `Uploading to cloud... ${state.progress}%`;
      case "saving": return "Saving to lesson...";
      case "done": return "Upload complete!";
      case "error": return state.errorMessage || "Upload failed";
      default: return "";
    }
  };

  const lessonTypeIcons = { video: Video, text: FileText, quiz: HelpCircle };

  return (
    <AdminLayout>
      <Link href="/admin/courses">
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </button>
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-serif font-semibold mb-1">{course.data?.title ?? "Course Editor"}</h1>
        <p className="text-muted-foreground text-sm">{course.data?.description ?? ""}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lessons */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Lessons ({lessons.data?.length ?? 0})</h2>
            <Dialog open={showAddLesson} onOpenChange={setShowAddLesson}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lesson
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Lesson</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createLessonMutation.mutate({ courseId, ...lessonForm, sortOrder: (lessons.data?.length ?? 0) + 1 });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label>Title</Label>
                    <Input value={lessonForm.title} onChange={(e) => setLessonForm(f => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={lessonForm.description} onChange={(e) => setLessonForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <select
                        value={lessonForm.type}
                        onChange={(e) => setLessonForm(f => ({ ...f, type: e.target.value as any }))}
                        className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
                      >
                        <option value="video">Video</option>
                        <option value="text">Text / Article</option>
                        <option value="quiz">Quiz</option>
                      </select>
                    </div>
                    <div>
                      <Label>Points</Label>
                      <Input type="number" value={lessonForm.pointsReward} onChange={(e) => setLessonForm(f => ({ ...f, pointsReward: parseInt(e.target.value) || 5 }))} />
                    </div>
                  </div>
                  {lessonForm.type === "text" && (
                    <div>
                      <Label>Content (Markdown)</Label>
                      <Textarea value={lessonForm.textContent} onChange={(e) => setLessonForm(f => ({ ...f, textContent: e.target.value }))} rows={6} />
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={createLessonMutation.isPending}>
                    {createLessonMutation.isPending ? "Creating..." : "Add Lesson"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {lessons.data?.map((lesson, idx) => {
              const LessonIcon = lessonTypeIcons[lesson.type] || FileText;
              const uploadState = uploadStates[lesson.id];
              const isUploading = uploadState && uploadState.status !== "idle";
              const isActiveUpload = isUploading && uploadState.status !== "done" && uploadState.status !== "error";

              return (
                <Card key={lesson.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <LessonIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{idx + 1}. {lesson.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{lesson.type}</Badge>
                          {lesson.videoUrl && <Badge variant="secondary" className="text-[10px] text-emerald-700 bg-emerald-50">Video attached</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {lesson.type === "video" && !lesson.videoUrl && !isActiveUpload && uploadState?.status !== "done" && (
                          <>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[lesson.id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleVideoUpload(lesson.id, file);
                                e.target.value = "";
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRefs.current[lesson.id]?.click()}
                            >
                              <Upload className="mr-1 h-3 w-3" />
                              Upload Video
                            </Button>
                          </>
                        )}
                        {/* Re-upload button for lessons that already have video */}
                        {lesson.type === "video" && lesson.videoUrl && !isActiveUpload && uploadState?.status !== "done" && (
                          <>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[lesson.id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleVideoUpload(lesson.id, file);
                                e.target.value = "";
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground"
                              onClick={() => fileInputRefs.current[lesson.id]?.click()}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Replace
                            </Button>
                          </>
                        )}
                        {uploadState?.status === "done" && (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Done</span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this lesson?")) {
                              deleteLessonMutation.mutate({ id: lesson.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Upload Progress Bar */}
                    {isActiveUpload && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{getUploadStatusText(uploadState)}</span>
                          <span className="font-medium text-primary">{uploadState.progress}%</span>
                        </div>
                        <Progress
                          value={uploadState.progress}
                          className="h-2"
                        />
                      </div>
                    )}

                    {uploadState?.status === "error" && (
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-destructive">{uploadState.errorMessage || "Upload failed. Please try again."}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            setUploadStates(prev => {
                              const copy = { ...prev };
                              delete copy[lesson.id];
                              return copy;
                            });
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quizzes Sidebar */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Quizzes</h2>
            <Dialog open={showAddQuiz} onOpenChange={setShowAddQuiz}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Quiz
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Quiz</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createQuizMutation.mutate({ courseId, ...quizForm, timeLimitMinutes: quizForm.timeLimitMinutes || undefined });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label>Title</Label>
                    <Input value={quizForm.title} onChange={(e) => setQuizForm(f => ({ ...f, title: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={quizForm.description} onChange={(e) => setQuizForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Passing Score (%)</Label>
                      <Input type="number" value={quizForm.passingScore} onChange={(e) => setQuizForm(f => ({ ...f, passingScore: parseInt(e.target.value) || 70 }))} />
                    </div>
                    <div>
                      <Label>Time Limit (min)</Label>
                      <Input type="number" value={quizForm.timeLimitMinutes} onChange={(e) => setQuizForm(f => ({ ...f, timeLimitMinutes: parseInt(e.target.value) || 0 }))} placeholder="0 = unlimited" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createQuizMutation.isPending}>
                    {createQuizMutation.isPending ? "Creating..." : "Create Quiz"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {quizzes.data?.map((quiz) => (
              <Link key={quiz.id} href={`/admin/quiz/${quiz.id}`}>
                <Card className="border-border/50 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground">Pass: {quiz.passingScore}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {(quizzes.data?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No quizzes yet</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
