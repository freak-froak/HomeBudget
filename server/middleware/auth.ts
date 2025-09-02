import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

declare global {
  namespace Express {
    interface Request {
      user?: any;
      session?: any;
    }
  }
}

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await storage.createSession({
    id: sessionId,
    userId,
    expiresAt
  });

  return sessionId;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers.authorization?.replace("Bearer ", "") || 
                     req.cookies?.sessionId;

    if (!sessionId) {
      return res.status(401).json({ error: "No session provided" });
    }

    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers.authorization?.replace("Bearer ", "") || 
                     req.cookies?.sessionId;

    if (sessionId) {
      const session = await storage.getSession(sessionId);
      if (session) {
        const user = await storage.getUser(session.userId);
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    next();
  }
}
