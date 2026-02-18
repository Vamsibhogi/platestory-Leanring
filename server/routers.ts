import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── User Management ────────────────────────────────────────────
  user: router({
    list: adminProcedure.query(() => db.getAllUsers()),
    leaderboard: protectedProcedure.query(() => db.getLeaderboard()),
    updateProfile: protectedProcedure
      .input(z.object({ department: z.string().optional(), jobTitle: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return;
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbInstance.update(users).set(input).where(eq(users.id, ctx.user.id));
      }),
    setRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return;
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbInstance.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const enrollmentList = await db.getEnrollmentsByUser(ctx.user.id);
      const badgeList = await db.getUserBadges(ctx.user.id);
      const totalTime = await db.getUserTotalTimeSpent(ctx.user.id);
      const completed = enrollmentList.filter(e => e.status === "completed").length;
      return {
        totalEnrollments: enrollmentList.length,
        completedCourses: completed,
        totalBadges: badgeList.length,
        totalTimeSpentSec: totalTime,
        points: ctx.user.points,
        streakDays: ctx.user.streakDays,
      };
    }),
  }),

  // ─── Courses ─────────────────────────────────────────────────────
  course: router({
    list: protectedProcedure.query(() => db.getPublishedCourses()),
    listAll: adminProcedure.query(() => db.getAllCourses()),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getCourseById(input.id)),
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        mode: z.enum(["micro", "deep", "standard"]).optional(),
        estimatedMinutes: z.number().optional(),
        pointsReward: z.number().optional(),
        isMandatory: z.boolean().optional(),
        thumbnailUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createCourse({ ...input, createdBy: ctx.user.id });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        mode: z.enum(["micro", "deep", "standard"]).optional(),
        estimatedMinutes: z.number().optional(),
        pointsReward: z.number().optional(),
        isPublished: z.boolean().optional(),
        isMandatory: z.boolean().optional(),
        thumbnailUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCourse(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCourse(input.id);
        return { success: true };
      }),
    publish: adminProcedure
      .input(z.object({ id: z.number(), isPublished: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateCourse(input.id, { isPublished: input.isPublished });
        return { success: true };
      }),
    enrollmentStats: adminProcedure
      .input(z.object({ courseId: z.number() }))
      .query(({ input }) => db.getEnrollmentsByCourse(input.courseId)),
  }),

  // ─── Lessons ─────────────────────────────────────────────────────
  lesson: router({
    listByCourse: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(({ input }) => db.getLessonsByCourse(input.courseId)),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getLessonById(input.id)),
    create: adminProcedure
      .input(z.object({
        courseId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["video", "text", "quiz"]).optional(),
        textContent: z.string().optional(),
        sortOrder: z.number().optional(),
        pointsReward: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createLesson(input);
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        type: z.enum(["video", "text", "quiz"]).optional(),
        videoUrl: z.string().optional(),
        videoKey: z.string().optional(),
        videoDurationSec: z.number().optional(),
        textContent: z.string().optional(),
        sortOrder: z.number().optional(),
        pointsReward: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLesson(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLesson(input.id);
        return { success: true };
      }),
  }),

  // ─── Enrollment ──────────────────────────────────────────────────
  enrollment: router({
    myEnrollments: protectedProcedure.query(({ ctx }) => db.getEnrollmentsByUser(ctx.user.id)),
    enroll: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getEnrollment(ctx.user.id, input.courseId);
        if (existing) return { id: existing.id, alreadyEnrolled: true };
        const id = await db.enrollUser({ userId: ctx.user.id, courseId: input.courseId });
        await db.logActivity({ userId: ctx.user.id, action: "enrolled", entityType: "course", entityId: input.courseId });
        return { id, alreadyEnrolled: false };
      }),
    getProgress: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ ctx, input }) => {
        const enrollment = await db.getEnrollment(ctx.user.id, input.courseId);
        const lessonProg = await db.getLessonProgressByUser(ctx.user.id, input.courseId);
        return { enrollment, lessonProgress: lessonProg };
      }),
    allocate: adminProcedure
      .input(z.object({ userIds: z.array(z.number()), courseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.bulkEnrollUsers(input.userIds, input.courseId, ctx.user.id);
        for (const userId of input.userIds) {
          await db.createNotification({
            userId,
            type: "course_assigned",
            title: "New Course Assigned",
            message: `A new course has been assigned to you.`,
            metadata: { courseId: input.courseId },
          });
        }
        return { success: true };
      }),
  }),

  // ─── Lesson Progress ────────────────────────────────────────────
  progress: router({
    update: protectedProcedure
      .input(z.object({
        lessonId: z.number(),
        courseId: z.number(),
        completed: z.boolean().optional(),
        timeSpentSec: z.number().optional(),
        videoPositionSec: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertLessonProgress({ userId: ctx.user.id, ...input });

        if (input.completed) {
          const lesson = await db.getLessonById(input.lessonId);
          if (lesson) {
            await db.updateUserPoints(ctx.user.id, lesson.pointsReward);
            await db.logActivity({ userId: ctx.user.id, action: "lesson_completed", entityType: "lesson", entityId: input.lessonId });
          }

          // Check if all lessons in course are completed
          const allLessons = await db.getLessonsByCourse(input.courseId);
          const allProgress = await db.getLessonProgressByUser(ctx.user.id, input.courseId);
          const completedLessons = allProgress.filter(p => p.completed);

          if (allLessons.length > 0 && completedLessons.length >= allLessons.length) {
            const enrollment = await db.getEnrollment(ctx.user.id, input.courseId);
            if (enrollment && enrollment.status !== "completed") {
              await db.updateEnrollment(enrollment.id, { status: "completed", progress: 100, completedAt: new Date() });
              const course = await db.getCourseById(input.courseId);
              if (course) {
                await db.updateUserPoints(ctx.user.id, course.pointsReward);
                await db.createNotification({
                  userId: ctx.user.id,
                  type: "course_completed",
                  title: "Course Completed!",
                  message: `Congratulations! You completed "${course.title}"`,
                  metadata: { courseId: input.courseId },
                });
                await db.logActivity({ userId: ctx.user.id, action: "course_completed", entityType: "course", entityId: input.courseId });
                // Notify admin
                await notifyOwner({ title: "Course Completed", content: `User ${ctx.user.name} completed "${course.title}"` }).catch(() => {});
              }
            }
          } else if (allLessons.length > 0) {
            const progress = Math.round((completedLessons.length / allLessons.length) * 100);
            const enrollment = await db.getEnrollment(ctx.user.id, input.courseId);
            if (enrollment) {
              await db.updateEnrollment(enrollment.id, { status: "in_progress", progress });
            }
          }
        }

        // Update streak
        const today = new Date().toISOString().slice(0, 10);
        const user = ctx.user;
        if (user.lastActiveDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          const newStreak = user.lastActiveDate === yesterday ? user.streakDays + 1 : 1;
          await db.updateUserStreak(ctx.user.id, newStreak, today);
        }

        return { success: true };
      }),
  }),

  // ─── Quizzes ─────────────────────────────────────────────────────
  quiz: router({
    getByCourse: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(({ input }) => db.getQuizzesByCourse(input.courseId)),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getQuizById(input.id)),
    getQuestions: protectedProcedure
      .input(z.object({ quizId: z.number() }))
      .query(({ input }) => db.getQuestionsByQuiz(input.quizId)),
    create: adminProcedure
      .input(z.object({
        courseId: z.number().optional(),
        lessonId: z.number().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        passingScore: z.number().optional(),
        timeLimitMinutes: z.number().optional(),
        pointsReward: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createQuiz(input);
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        passingScore: z.number().optional(),
        timeLimitMinutes: z.number().optional(),
        pointsReward: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateQuiz(id, data);
        return { success: true };
      }),
    addQuestion: adminProcedure
      .input(z.object({
        quizId: z.number(),
        type: z.enum(["multiple_choice", "drag_order", "visual", "scenario"]),
        question: z.string().min(1),
        imageUrl: z.string().optional(),
        options: z.any(),
        correctAnswer: z.any(),
        explanation: z.string().optional(),
        points: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createQuizQuestion(input);
        return { id };
      }),
    updateQuestion: adminProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(["multiple_choice", "drag_order", "visual", "scenario"]).optional(),
        question: z.string().optional(),
        imageUrl: z.string().optional(),
        options: z.any().optional(),
        correctAnswer: z.any().optional(),
        explanation: z.string().optional(),
        points: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateQuizQuestion(id, data);
        return { success: true };
      }),
    deleteQuestion: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteQuizQuestion(input.id);
        return { success: true };
      }),
    submit: protectedProcedure
      .input(z.object({
        quizId: z.number(),
        answers: z.array(z.object({
          questionId: z.number(),
          answer: z.any(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const questions = await db.getQuestionsByQuiz(input.quizId);
        const quiz = await db.getQuizById(input.quizId);
        if (!quiz) throw new Error("Quiz not found");

        let totalScore = 0;
        let totalPoints = 0;

        for (const q of questions) {
          totalPoints += q.points;
          const userAnswer = input.answers.find(a => a.questionId === q.id);
          if (userAnswer) {
            const correct = JSON.stringify(q.correctAnswer);
            const given = JSON.stringify(userAnswer.answer);
            if (correct === given) {
              totalScore += q.points;
            }
          }
        }

        const percentage = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
        const passed = percentage >= quiz.passingScore;

        await db.createQuizAttempt({
          quizId: input.quizId,
          userId: ctx.user.id,
          score: totalScore,
          totalPoints,
          passed,
          answers: input.answers,
          completedAt: new Date(),
        });

        if (passed) {
          await db.updateUserPoints(ctx.user.id, quiz.pointsReward);
          await db.logActivity({ userId: ctx.user.id, action: "quiz_passed", entityType: "quiz", entityId: input.quizId });
        }

        return { score: totalScore, totalPoints, percentage, passed };
      }),
    myAttempts: protectedProcedure
      .input(z.object({ quizId: z.number() }))
      .query(({ ctx, input }) => db.getQuizAttemptsByQuiz(input.quizId, ctx.user.id)),
    generateQuestions: adminProcedure
      .input(z.object({
        topic: z.string().min(1),
        count: z.number().min(1).max(10).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const count = input.count ?? 5;
        const difficulty = input.difficulty ?? "medium";
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are a quiz question generator for a corporate LMS. Generate exactly ${count} quiz questions about the given topic at ${difficulty} difficulty. Return valid JSON array.` },
            { role: "user", content: `Generate ${count} multiple choice quiz questions about: "${input.topic}". Each question should have 4 options with one correct answer. Return JSON array with objects having: question, options (array of strings), correctAnswer (the correct option string), explanation.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "quiz_questions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correctAnswer: { type: "string" },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correctAnswer", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content;
        if (typeof content === "string") {
          return JSON.parse(content);
        }
        return { questions: [] };
      }),
  }),

  // ─── Badges & Gamification ───────────────────────────────────────
  badge: router({
    list: protectedProcedure.query(() => db.getAllBadges()),
    myBadges: protectedProcedure.query(({ ctx }) => db.getUserBadges(ctx.user.id)),
    checkAndAward: protectedProcedure.mutation(async ({ ctx }) => {
      const allBadges = await db.getAllBadges();
      const userBadgesList = await db.getUserBadges(ctx.user.id);
      const earnedIds = new Set(userBadgesList.map(b => b.badgeId));
      const enrollmentList = await db.getEnrollmentsByUser(ctx.user.id);
      const completedCourses = enrollmentList.filter(e => e.status === "completed").length;
      const attempts = await db.getQuizAttemptsByUser(ctx.user.id);
      const totalTime = await db.getUserTotalTimeSpent(ctx.user.id);
      const totalHours = totalTime / 3600;
      const newBadges: string[] = [];

      for (const badge of allBadges) {
        if (earnedIds.has(badge.id)) continue;
        const criteria = badge.criteria as { type: string; count: number } | null;
        if (!criteria) continue;

        let earned = false;
        switch (criteria.type) {
          case "courses_completed":
            earned = completedCourses >= criteria.count;
            break;
          case "quiz_high_score":
            earned = attempts.filter(a => a.passed && a.totalPoints > 0 && (a.score / a.totalPoints) >= 0.9).length >= criteria.count;
            break;
          case "quiz_perfect":
            earned = attempts.filter(a => a.score === a.totalPoints && a.totalPoints > 0).length >= criteria.count;
            break;
          case "streak_days":
            earned = ctx.user.streakDays >= criteria.count;
            break;
          case "time_spent_hours":
            earned = totalHours >= criteria.count;
            break;
        }

        if (earned) {
          await db.awardBadge(ctx.user.id, badge.id);
          await db.createNotification({
            userId: ctx.user.id,
            type: "badge_earned",
            title: `Badge Earned: ${badge.name}`,
            message: badge.description ?? `You earned the ${badge.name} badge!`,
            metadata: { badgeId: badge.id },
          });
          newBadges.push(badge.name);
        }
      }
      return { newBadges };
    }),
  }),

  // ─── Notifications ───────────────────────────────────────────────
  notification: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserNotifications(ctx.user.id)),
    unreadCount: protectedProcedure.query(({ ctx }) => db.getUnreadNotificationCount(ctx.user.id)),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.markNotificationRead(input.id)),
    markAllRead: protectedProcedure.mutation(({ ctx }) => db.markAllNotificationsRead(ctx.user.id)),
  }),

  // ─── File Upload ─────────────────────────────────────────────────
  upload: router({
    video: adminProcedure
      .input(z.object({
        fileName: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        // Sanitize filename: remove special chars (#, spaces, etc.) that break URLs
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `videos/${nanoid()}-${safeName}`;
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return { url, fileKey };
      }),
    thumbnail: adminProcedure
      .input(z.object({
        fileName: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `thumbnails/${nanoid()}-${safeName}`;
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return { url, fileKey };
      }),
  }),

  // ─── AI Chatbot ──────────────────────────────────────────────────
  chat: router({
    history: protectedProcedure.query(({ ctx }) => db.getChatHistory(ctx.user.id)),
    send: protectedProcedure
      .input(z.object({ message: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await db.saveChatMessage({ userId: ctx.user.id, role: "user", content: input.message });

        const history = await db.getChatHistory(ctx.user.id, 20);
        const messages = [
          {
            role: "system" as const,
            content: `You are PlateBot, the AI learning assistant for Platestory LMS. You help employees with:
1. Answering questions about course content and training materials
2. Providing personalized learning recommendations based on their progress
3. Explaining concepts from their courses
4. Motivating them to continue learning

Be friendly, encouraging, and concise. Use the employee's name when possible: ${ctx.user.name ?? "there"}.`,
          },
          ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];

        const response = await invokeLLM({ messages });
        const assistantContent = typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "I'm sorry, I couldn't process that. Please try again.";

        await db.saveChatMessage({ userId: ctx.user.id, role: "assistant", content: assistantContent });
        return { response: assistantContent };
      }),
  }),

  // ─── Admin Analytics ─────────────────────────────────────────────
  analytics: router({
    overview: adminProcedure.query(() => db.getAdminStats()),
    recentActivity: adminProcedure.query(() => db.getRecentActivity()),
    courseStats: adminProcedure.query(() => db.getCourseEnrollmentStats()),
  }),
});

export type AppRouter = typeof appRouter;
