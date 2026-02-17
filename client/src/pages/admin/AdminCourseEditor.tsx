import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    onSuccess: (data) => {
      utils.quiz.getByCourse.invalidate({ courseId });
      setShowAddQuiz(false);
      toast.success("Quiz created!");
    },
  });

  const uploadVideoMutation = trpc.upload.video.useMutation();
  const updateLessonMutation = trpc.lesson.update.useMutation({
    onSuccess: () => {
      utils.lesson.listByCourse.invalidate({ courseId });
      toast.success("Video uploaded!");
    },
  });

  const handleVideoUpload = async (lessonId: number, file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadVideoMutation.mutateAsync({
          fileName: file.name,
          contentType: file.type,
          base64Data: base64,
        });
        await updateLessonMutation.mutateAsync({
          id: lessonId,
          videoUrl: result.url,
          videoKey: result.fileKey,
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
      toast.error("Upload failed");
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
              return (
                <Card key={lesson.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <LessonIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{idx + 1}. {lesson.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] capitalize">{lesson.type}</Badge>
                        {lesson.videoUrl && <Badge variant="secondary" className="text-[10px]">Video attached</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lesson.type === "video" && !lesson.videoUrl && (
                        <>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleVideoUpload(lesson.id, file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            <Upload className="mr-1 h-3 w-3" />
                            {uploading ? "Uploading..." : "Upload"}
                          </Button>
                        </>
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
