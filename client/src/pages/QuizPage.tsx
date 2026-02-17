import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Trophy,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const quizId = parseInt(id ?? "0");
  const quiz = trpc.quiz.getById.useQuery({ id: quizId }, { enabled: quizId > 0 });
  const questions = trpc.quiz.getQuestions.useQuery({ quizId }, { enabled: quizId > 0 });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; totalPoints: number; percentage: number; passed: boolean } | null>(null);
  const [dragItems, setDragItems] = useState<string[]>([]);

  const submitMutation = trpc.quiz.submit.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setSubmitted(true);
      if (data.passed) {
        toast.success(`Quiz passed! Score: ${data.percentage}%`);
      } else {
        toast.error(`Quiz not passed. Score: ${data.percentage}%. Required: ${quiz.data?.passingScore}%`);
      }
    },
  });

  const currentQuestion = questions.data?.[currentIdx];
  const totalQuestions = questions.data?.length ?? 0;

  const handleAnswer = useCallback((questionId: number, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleSubmit = () => {
    const answerArray = Object.entries(answers).map(([qId, answer]) => ({
      questionId: parseInt(qId),
      answer,
    }));
    submitMutation.mutate({ quizId, answers: answerArray });
  };

  // Drag and drop reorder
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", idx.toString());
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const dragIdx = parseInt(e.dataTransfer.getData("text/plain"));
    if (currentQuestion) {
      const items = [...(answers[currentQuestion.id] || dragItems)];
      const [removed] = items.splice(dragIdx, 1);
      items.splice(dropIdx, 0, removed);
      handleAnswer(currentQuestion.id, items);
      setDragItems(items);
    }
  };

  if (!quiz.data) {
    return (
      <AppLayout>
        <div className="container py-20 text-center">
          <HelpCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Quiz not found</p>
        </div>
      </AppLayout>
    );
  }

  if (submitted && result) {
    return (
      <AppLayout>
        <div className="container py-12">
          <div className="max-w-lg mx-auto text-center">
            <div className={`h-20 w-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg ${
              result.passed ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-gradient-to-br from-red-400 to-rose-500"
            }`}>
              {result.passed ? (
                <Trophy className="h-10 w-10 text-white" />
              ) : (
                <XCircle className="h-10 w-10 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-serif font-semibold mb-2">
              {result.passed ? "Congratulations!" : "Keep Learning"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {result.passed
                ? `You passed with ${result.percentage}%! Great job!`
                : `You scored ${result.percentage}%. You need ${quiz.data.passingScore}% to pass.`}
            </p>
            <div className="glass-card p-6 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{result.score}</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.percentage}%</p>
                  <p className="text-xs text-muted-foreground">Percentage</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              {quiz.data.courseId && (
                <Link href={`/courses/${quiz.data.courseId}`}>
                  <Button variant="outline">Back to Course</Button>
                </Link>
              )}
              {!result.passed && (
                <Button onClick={() => { setSubmitted(false); setResult(null); setAnswers({}); setCurrentIdx(0); }}>
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6">
        {quiz.data.courseId && (
          <Link href={`/courses/${quiz.data.courseId}`}>
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </button>
          </Link>
        )}

        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-serif font-semibold mb-1">{quiz.data.title}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Question {currentIdx + 1} of {totalQuestions}</span>
              {quiz.data.timeLimitMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {quiz.data.timeLimitMinutes} min
                </span>
              )}
            </div>
            <Progress value={((currentIdx + 1) / totalQuestions) * 100} className="h-1.5 mt-3" />
          </div>

          {currentQuestion && (
            <Card className="border-border/50 mb-6">
              <CardContent className="p-6">
                <Badge variant="outline" className={`mb-3 capitalize ${
                  currentQuestion.type === 'multiple_choice' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                  currentQuestion.type === 'drag_order' ? 'border-violet-300 text-violet-700 bg-violet-50' :
                  currentQuestion.type === 'visual' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                  'border-emerald-300 text-emerald-700 bg-emerald-50'
                }`}>
                  {currentQuestion.type.replace("_", " ")}
                </Badge>
                <h2 className="text-lg font-medium mb-6">{currentQuestion.question}</h2>

                {currentQuestion.imageUrl && (
                  <img src={currentQuestion.imageUrl} alt="Question" className="w-full max-h-64 object-contain rounded-lg mb-6 bg-muted" />
                )}

                {/* Multiple Choice */}
                {currentQuestion.type === "multiple_choice" && (
                  <div className="space-y-2">
                    {(currentQuestion.options as string[])?.map((option: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(currentQuestion.id, option)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          answers[currentQuestion.id] === option
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            answers[currentQuestion.id] === option ? "border-primary" : "border-muted-foreground/30"
                          }`}>
                            {answers[currentQuestion.id] === option && (
                              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <span className="text-sm">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Drag & Drop Order */}
                {currentQuestion.type === "drag_order" && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-3">Drag items to reorder them correctly:</p>
                    {(answers[currentQuestion.id] || currentQuestion.options as string[])?.map((item: string, idx: number) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, idx)}
                        className="p-3 rounded-lg border border-border bg-card hover:shadow-sm cursor-grab active:cursor-grabbing transition-all flex items-center gap-3"
                      >
                        <span className="h-6 w-6 rounded bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Visual Assessment */}
                {currentQuestion.type === "visual" && (
                  <div className="grid grid-cols-2 gap-3">
                    {(currentQuestion.options as string[])?.map((option: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(currentQuestion.id, option)}
                        className={`p-4 rounded-lg border text-center transition-all ${
                          answers[currentQuestion.id] === option
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <span className="text-sm">{option}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Scenario */}
                {currentQuestion.type === "scenario" && (
                  <div className="space-y-2">
                    {(currentQuestion.options as string[])?.map((option: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(currentQuestion.id, option)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          answers[currentQuestion.id] === option
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-accent/50"
                        }`}
                      >
                        <span className="text-sm">{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentIdx < totalQuestions - 1 ? (
              <Button
                size="sm"
                onClick={() => setCurrentIdx(prev => prev + 1)}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {submitMutation.isPending ? "Submitting..." : "Submit Quiz"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
