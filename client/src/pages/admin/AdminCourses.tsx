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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function AdminCourses() {
  const courses = trpc.course.listAll.useQuery();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
    mode: "standard" as "micro" | "deep" | "standard",
    estimatedMinutes: 0,
    pointsReward: 10,
    isMandatory: false,
  });

  const createMutation = trpc.course.create.useMutation({
    onSuccess: () => {
      utils.course.listAll.invalidate();
      setShowCreate(false);
      setForm({ title: "", description: "", category: "", difficulty: "beginner", mode: "standard", estimatedMinutes: 0, pointsReward: 10, isMandatory: false });
      toast.success("Course created!");
    },
  });

  const publishMutation = trpc.course.publish.useMutation({
    onSuccess: () => {
      utils.course.listAll.invalidate();
      toast.success("Course visibility updated!");
    },
  });

  const deleteMutation = trpc.course.delete.useMutation({
    onSuccess: () => {
      utils.course.listAll.invalidate();
      toast.success("Course deleted!");
    },
  });

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold mb-1">Courses</h1>
          <p className="text-muted-foreground text-sm">{courses.data?.length ?? 0} courses total</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Sales, Safety" />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm(f => ({ ...f, difficulty: e.target.value as any }))}
                    className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Learning Mode</Label>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm(f => ({ ...f, mode: e.target.value as any }))}
                    className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="standard">Standard</option>
                    <option value="micro">Micro-Learning</option>
                    <option value="deep">Deep Dive</option>
                  </select>
                </div>
                <div>
                  <Label>Est. Minutes</Label>
                  <Input type="number" value={form.estimatedMinutes} onChange={(e) => setForm(f => ({ ...f, estimatedMinutes: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Points Reward</Label>
                  <Input type="number" value={form.pointsReward} onChange={(e) => setForm(f => ({ ...f, pointsReward: parseInt(e.target.value) || 10 }))} />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      checked={form.isMandatory}
                      onChange={(e) => setForm(f => ({ ...f, isMandatory: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Mandatory</span>
                  </label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Course"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {courses.data?.map((course) => (
          <Card key={course.id} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-medium text-sm truncate">{course.title}</h3>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{course.mode}</Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{course.difficulty}</Badge>
                  {course.isMandatory && <Badge className="text-[10px] bg-destructive text-destructive-foreground shrink-0">Mandatory</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{course.description ?? "No description"}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => publishMutation.mutate({ id: course.id, isPublished: !course.isPublished })}
                  title={course.isPublished ? "Unpublish" : "Publish"}
                >
                  {course.isPublished ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Link href={`/admin/courses/${course.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Delete this course?")) {
                      deleteMutation.mutate({ id: course.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(courses.data?.length ?? 0) === 0 && (
          <div className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No courses yet. Create your first one!</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
