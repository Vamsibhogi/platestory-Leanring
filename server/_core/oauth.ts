import { COOKIE_NAME, ONE_YEAR_MS, ALLOWED_EMAIL_DOMAIN } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import * as crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "platestory_salt").digest("hex");
}

export function registerOAuthRoutes(app: Express) {
  // Login page
  app.get("/app-auth", (_req: Request, res: Response) => {
    res.send(`
      <!doctype html>
      <html>
      <head>
        <title>Platestory LMS Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, sans-serif; background: #faf9f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); width: 100%; max-width: 400px; }
          h1 { font-size: 1.5rem; color: #1a1a2e; margin-bottom: 0.5rem; }
          p { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
          label { display: block; font-size: 0.85rem; font-weight: 600; color: #444; margin-bottom: 0.4rem; }
          input { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 1rem; margin-bottom: 1.2rem; outline: none; transition: border 0.2s; }
          input:focus { border-color: #FF6B9D; }
          button { width: 100%; padding: 0.85rem; background: #FF6B9D; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
          button:hover { background: #e85d8a; }
          .error { background: #fff0f0; color: #cc0000; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
          .logo { font-size: 1.1rem; font-weight: 700; color: #FF6B9D; margin-bottom: 1.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🍽️ Platestory LMS</div>
          <h1>Welcome back</h1>
          <p>Sign in with your @platestory.in email</p>
          ${_req.query.error ? `<div class="error">${_req.query.error}</div>` : ""}
          <form method="POST" action="/app-auth">
            <label>Email</label>
            <input type="email" name="email" placeholder="you@platestory.in" required autofocus />
            <label>Password</label>
            <input type="password" name="password" placeholder="Your password" required />
            <button type="submit">Sign In</button>
          </form>
        </div>
      </body>
      </html>
    `);
  });

  // Login form submission
  app.post("/app-auth", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.redirect("/app-auth?error=Email+and+password+are+required");
      return;
    }

    if (!email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      res.redirect("/app-auth?error=Only+%40platestory.in+emails+are+allowed");
      return;
    }

    try {
      const hashedPassword = hashPassword(password);
      let user = await db.getUserByEmail(email.toLowerCase());

      if (!user) {
        // First time login — create account
        const openId = `platestory_${crypto.randomBytes(16).toString("hex")}`;
        const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        await db.upsertUser({
          openId,
          name,
          email: email.toLowerCase(),
          loginMethod: "email",
          lastSignedIn: new Date(),
          passwordHash: hashedPassword,
        });
        user = await db.getUserByEmail(email.toLowerCase());
      } else {
        // Existing user — verify password
        if (user.passwordHash && user.passwordHash !== hashedPassword) {
          res.redirect("/app-auth?error=Incorrect+password");
          return;
        }
        // If no password set yet, set it now
        if (!user.passwordHash) {
          await db.upsertUser({ openId: user.openId, passwordHash: hashedPassword, lastSignedIn: new Date() });
        } else {
          await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        }
      }

      if (!user) {
        res.redirect("/app-auth?error=Login+failed.+Please+try+again.");
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.redirect("/app-auth?error=Something+went+wrong.+Please+try+again.");
    }
  });

  // Keep OAuth callback route for compatibility
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect("/app-auth");
  });
}
