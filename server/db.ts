import { eq, desc, asc, and, sql, count, sum, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  courses, InsertCourse,
  lessons, InsertLesson,
  quizzes, InsertQuiz,
  quizQuestions, InsertQuizQuestion,
  quizAttempts, InsertQuizAttempt,
  enrollments, InsertEnrollment,
  lessonProgress, InsertLessonProgress,
  badges,
  userBadges, InsertUserBadge,
  notifications, InsertNotification,
  activityLog, InsertActivityLog,
  chatMessages, InsertChatMessage,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserPoints(userId: number, pointsToAdd: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ points: sql`points + ${pointsToAdd}` }).where(eq(users.id, userId));
}

export async function updateUserStreak(userId: number, streakDays: number, lastActiveDate: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ streakDays, lastActiveDate }).where(eq(users.id, userId));
}

export async function getLeaderboard(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    department: users.department,
    points: users.points,
    streakDays: users.streakDays,
    avatarUrl: users.avatarUrl,
  }).from(users).orderBy(desc(users.points)).limit(limit);
}

// ─── Courses ─────────────────────────────────────────────────────────
export async function createCourse(data: InsertCourse) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(courses).values(data);
  return result[0].insertId;
}

export async function updateCourse(id: number, data: Partial<InsertCourse>) {
  const db = await getDb();
  if (!db) return;
  await db.update(courses).set(data).where(eq(courses.id, id));
}

export async function deleteCourse(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lessons).where(eq(lessons.courseId, id));
  await db.delete(enrollments).where(eq(enrollments.courseId, id));
  await db.delete(courses).where(eq(courses.id, id));
}

export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAllCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function getPublishedCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).where(eq(courses.isPublished, true)).orderBy(desc(courses.createdAt));
}

// ─── Lessons ─────────────────────────────────────────────────────────
export async function createLesson(data: InsertLesson) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lessons).values(data);
  return result[0].insertId;
}

export async function updateLesson(id: number, data: Partial<InsertLesson>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lessons).set(data).where(eq(lessons.id, id));
}

export async function deleteLesson(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lessons).where(eq(lessons.id, id));
}

export async function getLessonsByCourse(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(asc(lessons.sortOrder));
}

export async function getLessonById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result[0] ?? null;
}

// ─── Quizzes ─────────────────────────────────────────────────────────
export async function createQuiz(data: InsertQuiz) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(quizzes).values(data);
  return result[0].insertId;
}

export async function updateQuiz(id: number, data: Partial<InsertQuiz>) {
  const db = await getDb();
  if (!db) return;
  await db.update(quizzes).set(data).where(eq(quizzes.id, id));
}

export async function getQuizById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getQuizzesByCourse(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizzes).where(eq(quizzes.courseId, courseId));
}

// ─── Quiz Questions ──────────────────────────────────────────────────
export async function createQuizQuestion(data: InsertQuizQuestion) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(quizQuestions).values(data);
  return result[0].insertId;
}

export async function updateQuizQuestion(id: number, data: Partial<InsertQuizQuestion>) {
  const db = await getDb();
  if (!db) return;
  await db.update(quizQuestions).set(data).where(eq(quizQuestions.id, id));
}

export async function deleteQuizQuestion(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
}

export async function getQuestionsByQuiz(quizId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(asc(quizQuestions.sortOrder));
}

// ─── Quiz Attempts ───────────────────────────────────────────────────
export async function createQuizAttempt(data: InsertQuizAttempt) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(quizAttempts).values(data);
  return result[0].insertId;
}

export async function getQuizAttemptsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.startedAt));
}

export async function getQuizAttemptsByQuiz(quizId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, userId)))
    .orderBy(desc(quizAttempts.startedAt));
}

// ─── Enrollments ─────────────────────────────────────────────────────
export async function enrollUser(data: InsertEnrollment) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(enrollments).values(data);
  return result[0].insertId;
}

export async function getEnrollmentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(enrollments).where(eq(enrollments.userId, userId)).orderBy(desc(enrollments.enrolledAt));
}

export async function getEnrollment(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .limit(1);
  return result[0] ?? null;
}

export async function updateEnrollment(id: number, data: Partial<InsertEnrollment>) {
  const db = await getDb();
  if (!db) return;
  await db.update(enrollments).set(data).where(eq(enrollments.id, id));
}

export async function getEnrollmentsByCourse(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(enrollments).where(eq(enrollments.courseId, courseId));
}

export async function bulkEnrollUsers(userIds: number[], courseId: number, assignedBy: number) {
  const db = await getDb();
  if (!db) return;
  for (const userId of userIds) {
    const existing = await getEnrollment(userId, courseId);
    if (!existing) {
      await db.insert(enrollments).values({ userId, courseId, assignedBy });
    }
  }
}

// ─── Lesson Progress ─────────────────────────────────────────────────
export async function upsertLessonProgress(data: InsertLessonProgress) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, data.userId!), eq(lessonProgress.lessonId, data.lessonId!)))
    .limit(1);

  if (existing.length > 0) {
    const updateData: Record<string, unknown> = {};
    if (data.completed) updateData.completed = data.completed;
    if (data.timeSpentSec) updateData.timeSpentSec = sql`timeSpentSec + ${data.timeSpentSec}`;
    if (data.videoPositionSec !== undefined) updateData.videoPositionSec = data.videoPositionSec;
    if (data.completed && !existing[0].completedAt) updateData.completedAt = new Date();
    await db.update(lessonProgress).set(updateData).where(eq(lessonProgress.id, existing[0].id));
  } else {
    await db.insert(lessonProgress).values(data);
  }
}

export async function getLessonProgressByUser(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId)));
}

export async function getUserTotalTimeSpent(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ total: sum(lessonProgress.timeSpentSec) })
    .from(lessonProgress).where(eq(lessonProgress.userId, userId));
  return Number(result[0]?.total ?? 0);
}

// ─── Badges ──────────────────────────────────────────────────────────
export async function getAllBadges() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(badges);
}

export async function getUserBadges(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: userBadges.id,
    badgeId: userBadges.badgeId,
    earnedAt: userBadges.earnedAt,
    name: badges.name,
    description: badges.description,
    icon: badges.icon,
    tier: badges.tier,
  }).from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId));
}

export async function awardBadge(userId: number, badgeId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(userBadges).values({ userId, badgeId });
  }
}

// ─── Notifications ───────────────────────────────────────────────────
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

// ─── Activity Log ────────────────────────────────────────────────────
export async function logActivity(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values(data);
}

export async function getRecentActivity(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: activityLog.id,
    userId: activityLog.userId,
    action: activityLog.action,
    entityType: activityLog.entityType,
    entityId: activityLog.entityId,
    metadata: activityLog.metadata,
    createdAt: activityLog.createdAt,
    userName: users.name,
    userEmail: users.email,
  }).from(activityLog)
    .leftJoin(users, eq(activityLog.userId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// ─── Chat Messages ───────────────────────────────────────────────────
export async function saveChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values(data);
}

export async function getChatHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

// ─── Analytics ───────────────────────────────────────────────────────
export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalCourses: 0, totalEnrollments: 0, completionRate: 0 };

  const [userCount] = await db.select({ count: count() }).from(users);
  const [courseCount] = await db.select({ count: count() }).from(courses);
  const [enrollmentCount] = await db.select({ count: count() }).from(enrollments);
  const [completedCount] = await db.select({ count: count() }).from(enrollments).where(eq(enrollments.status, "completed"));

  const total = enrollmentCount?.count ?? 0;
  const completed = completedCount?.count ?? 0;

  return {
    totalUsers: userCount?.count ?? 0,
    totalCourses: courseCount?.count ?? 0,
    totalEnrollments: total,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export async function getCourseEnrollmentStats() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    courseId: enrollments.courseId,
    total: count(),
    completed: sql<number>`SUM(CASE WHEN ${enrollments.status} = 'completed' THEN 1 ELSE 0 END)`,
  }).from(enrollments).groupBy(enrollments.courseId);
}
