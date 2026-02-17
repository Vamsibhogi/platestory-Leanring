import { COOKIE_NAME, ONE_YEAR_MS, ALLOWED_EMAIL_DOMAIN, DOMAIN_RESTRICTED_ERR_MSG } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Domain restriction: only @platestory.in emails allowed
      const email = userInfo.email ?? "";
      if (email && !email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
        res.status(403).send(`
          <html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#faf9f6;">
            <div style="text-align:center;max-width:400px;padding:2rem;">
              <h2 style="color:#333;">Access Restricted</h2>
              <p style="color:#666;">Only <strong>@${ALLOWED_EMAIL_DOMAIN}</strong> email addresses can access Platestory LMS.</p>
              <p style="color:#999;font-size:0.875rem;">Please sign in with your company email.</p>
              <a href="/" style="color:#4a7c59;text-decoration:underline;">Back to Home</a>
            </div>
          </body></html>
        `);
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
