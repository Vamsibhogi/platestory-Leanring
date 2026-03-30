import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  department: varchar("department", { length: 128 }),
  jobTitle: varchar("jobTitle", { length: 128 }),
  points: int("points").default(0).notNull(),
  streakDays: int("streakDays").default(0).notNull(),
  lastActiveDate: varchar("lastActiveDate", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordHash: varchar("passwordHash", { length: 64 }),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Courses ─────────────────────────────────────────────────────────
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  category: varchar("category", { length: 128 }),
  difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  mode: mysqlEnum("mode", ["micro", "deep", "standard"]).default("standard").notNull(),
  estimatedMinutes: int("estimatedMinutes").default(0),
  pointsReward: int("pointsReward").default(10).notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  isMandatory: boolean("isMandatory").default(false).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

// ─── Lessons ─────────────────────────────────────────────────────────
export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["video", "text", "quiz"]).default("video").notNull(),
  videoUrl: text("videoUrl"),
  videoKey: varchar("videoKey", { length: 512 }),
  videoDurationSec: int("videoDurationSec").default(0),
  textContent: text("textContent"),
  sortOrder: int("sortOrder").default(0).notNull(),
  pointsReward: int("pointsReward").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;

// ─── Quizzes ─────────────────────────────────────────────────────────
export const quizzes = mysqlTable("quizzes", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId"),
  lessonId: int("lessonId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  passingScore: int("passingScore").default(70).notNull(),
  timeLimitMinutes: int("timeLimitMinutes"),
  pointsReward: int("pointsReward").default(20).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;

// ─── Quiz Questions ──────────────────────────────────────────────────
export const quizQuestions = mysqlTable("quiz_questions", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull(),
  type: mysqlEnum("type", ["multiple_choice", "drag_order", "visual", "scenario"]).notNull(),
  question: text("question").notNull(),
  imageUrl: text("imageUrl"),
  options: json("options"),       // JSON array of option objects
  correctAnswer: json("correctAnswer"), // JSON - varies by type
  explanation: text("explanation"),
  points: int("points").default(10).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = typeof quizQuestions.$inferInsert;

// ─── Quiz Attempts ───────────────────────────────────────────────────
export const quizAttempts = mysqlTable("quiz_attempts", {
  id: int("id").autoincrement().primaryKey(),
  quizId: int("quizId").notNull(),
  userId: int("userId").notNull(),
  score: int("score").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  passed: boolean("passed").default(false).notNull(),
  answers: json("answers"),       // JSON array of user answers
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;

// ─── Course Enrollments ──────────────────────────────────────────────
export const enrollments = mysqlTable("enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  status: mysqlEnum("status", ["enrolled", "in_progress", "completed"]).default("enrolled").notNull(),
  progress: int("progress").default(0).notNull(), // percentage 0-100
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  assignedBy: int("assignedBy"), // null = self-enrolled, int = admin assigned
});

export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = typeof enrollments.$inferInsert;

// ─── Lesson Progress ─────────────────────────────────────────────────
export const lessonProgress = mysqlTable("lesson_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  courseId: int("courseId").notNull(),
  completed: boolean("completed").default(false).notNull(),
  timeSpentSec: int("timeSpentSec").default(0).notNull(),
  videoPositionSec: int("videoPositionSec").default(0),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = typeof lessonProgress.$inferInsert;

// ─── Badges ──────────────────────────────────────────────────────────
export const badges = mysqlTable("badges", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 64 }).notNull(), // emoji or icon name
  tier: mysqlEnum("tier", ["bronze", "silver", "gold", "platinum"]).default("bronze").notNull(),
  criteria: json("criteria"), // JSON: { type: "courses_completed", count: 5 }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

// ─── User Badges ─────────────────────────────────────────────────────
export const userBadges = mysqlTable("user_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeId: int("badgeId").notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

// ─── Notifications ───────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["badge_earned", "course_assigned", "course_completed", "streak", "milestone", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Activity Log ────────────────────────────────────────────────────
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

// ─── Chat Messages (AI Chatbot) ──────────────────────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
