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
  ArrowLeft,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function AdminQuizBuilder() {
  const { id } = useParams<{ id: string }>();
  const quizId = parseInt(id ?? "0");
  const quiz = trpc.quiz.getById.useQuery({ id: quizId }, { enabled: quizId > 0 });
  const questions = trpc.quiz.getQuestions.useQuery({ quizId }, { enabled: quizId > 0 });
  const utils = trpc.useUtils();

  const [showAdd, setShowAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [form, setForm] = useState({
    type: "multiple_choice" as "multiple_choice" | "drag_order" | "visual" | "scenario",
    question: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    points: 10,
  });

  const addQuestionMutation = trpc.quiz.addQuestion.useMutation({
    onSuccess: () => {
      utils.quiz.getQuestions.invalidate({ quizId });
      setShowAdd(false);
      setForm({ type: "multiple_choice", question: "", options: ["", "", "", ""], correctAnswer: "", explanation: "", points: 10 });
      toast.success("Question added!");
    },
  });

  const deleteQuestionMutation = trpc.quiz.deleteQuestion.useMutation({
    onSuccess: () => {
      utils.quiz.getQuestions.invalidate({ quizId });
      toast.success("Question deleted!");
    },
  });

  const generateMutation = trpc.quiz.generateQuestions.useMutation({
    onSuccess: async (data) => {
      const qs = data.questions ?? [];
      for (const q of qs) {
        await addQuestionMutation.mutateAsync({
          quizId,
          type: "multiple_choice",
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          points: 10,
          sortOrder: (questions.data?.length ?? 0) + 1,
        });
      }
      setShowAI(false);
      toast.success(`${qs.length} questions generated!`);
    },
  });

  return (
    <AdminLayout>
      <Link href={quiz.data?.courseId ? `/admin/courses/${quiz.data.courseId}` : "/admin/courses"}>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold mb-1">{quiz.data?.title ?? "Quiz Builder"}</h1>
          <p className="text-muted-foreground text-sm">{questions.data?.length ?? 0} questions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAI} onOpenChange={setShowAI}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI Question Generator</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  generateMutation.mutate({ topic: aiTopic, count: aiCount });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Topic</Label>
                  <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g. Food safety regulations" required />
                </div>
                <div>
                  <Label>Number of Questions</Label>
                  <Input type="number" value={aiCount} onChange={(e) => setAiCount(parseInt(e.target.value) || 5)} min={1} max={10} />
                </div>
                <Button type="submit" className="w-full" disabled={generateMutation.isPending}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generateMutation.isPending ? "Generating..." : "Generate Questions"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Question</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addQuestionMutation.mutate({
                    quizId,
                    type: form.type,
                    question: form.question,
                    options: form.options.filter(o => o.trim()),
                    correctAnswer: form.type === "drag_order" ? form.options.filter(o => o.trim()) : form.correctAnswer,
                    explanation: form.explanation,
                    points: form.points,
                    sortOrder: (questions.data?.length ?? 0) + 1,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Question Type</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="drag_order">Drag & Drop Order</option>
                    <option value="visual">Visual Assessment</option>
                    <option value="scenario">Scenario</option>
                  </select>
                </div>
                <div>
                  <Label>Question</Label>
                  <Textarea value={form.question} onChange={(e) => setForm(f => ({ ...f, question: e.target.value }))} required rows={2} />
                </div>
                <div>
                  <Label>Options</Label>
                  {form.options.map((opt, idx) => (
                    <Input
                      key={idx}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...form.options];
                        newOpts[idx] = e.target.value;
                        setForm(f => ({ ...f, options: newOpts }));
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="mb-2"
                    />
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, options: [...f.options, ""] }))}>
                    + Add Option
                  </Button>
                </div>
                {form.type !== "drag_order" && (
                  <div>
                    <Label>Correct Answer</Label>
                    <Input value={form.correctAnswer} onChange={(e) => setForm(f => ({ ...f, correctAnswer: e.target.value }))} placeholder="Must match one of the options exactly" />
                  </div>
                )}
                {form.type === "drag_order" && (
                  <p className="text-xs text-muted-foreground">For drag & drop, enter options in the correct order above.</p>
                )}
                <div>
                  <Label>Explanation</Label>
                  <Textarea value={form.explanation} onChange={(e) => setForm(f => ({ ...f, explanation: e.target.value }))} rows={2} />
                </div>
                <div>
                  <Label>Points</Label>
                  <Input type="number" value={form.points} onChange={(e) => setForm(f => ({ ...f, points: parseInt(e.target.value) || 10 }))} />
                </div>
                <Button type="submit" className="w-full" disabled={addQuestionMutation.isPending}>
                  {addQuestionMutation.isPending ? "Adding..." : "Add Question"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.data?.map((q, idx) => (
          <Card key={q.id} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{q.type.replace("_", " ")}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{q.points} pts</Badge>
                  </div>
                  <p className="text-sm font-medium mb-2">{q.question}</p>
                  {(q.options as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(q.options as string[]).map((opt: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-muted">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => {
                    if (confirm("Delete this question?")) {
                      deleteQuestionMutation.mutate({ id: q.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(questions.data?.length ?? 0) === 0 && (
          <div className="py-16 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No questions yet. Add manually or use AI to generate them!</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
