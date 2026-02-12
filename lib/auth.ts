import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'haunted-crd',
    audience: 'haunted-crd-users',
  });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'haunted-crd',
      audience: 'haunted-crd-users',
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    throw new AuthError('Invalid or expired token');
  }
};

export const createSession = async (userId: string): Promise<string> => {
  const token = generateToken({
    userId,
    email: '', // Will be populated from database
    username: '', // Will be populated from database
    isAdmin: false, // Will be populated from database
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
};

export const validateSession = async (token: string): Promise<JWTPayload | null> => {
  try {
    // First verify the JWT token
    const payload = verifyToken(token);

    // Then check if session exists in database
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    // Update last used timestamp
    await prisma.session.update({
      where: { id: session.id },
      data: { lastUsed: new Date() },
    });

    // Return updated payload with user data
    return {
      userId: session.user.id,
      email: session.user.email,
      username: session.user.username,
      isAdmin: session.user.isAdmin,
    };
  } catch (error) {
    return null;
  }
};

export const destroySession = async (token: string): Promise<void> => {
  await prisma.session.delete({
    where: { token },
  });
};

export const destroyAllSessions = async (userId: string): Promise<void> => {
  await prisma.session.deleteMany({
    where: { userId },
  });
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
};
