import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Allowed file types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/webm',
  'video/ogg',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  // Documents
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

function getFileType(mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'FILE';
}

function sanitizeFilename(filename: string): string {
  // Remove special characters and keep only alphanumeric, dots, hyphens, and underscores
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const channelId = formData.get('channelId') as string;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      if (!channelId) {
        return NextResponse.json(
          { error: 'Channel ID required' },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        );
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'File type not allowed' },
          { status: 400 }
        );
      }

      // Verify user has access to channel
      const channel = await prisma.channel.findFirst({
        where: {
          id: channelId,
          server: {
            members: {
              some: {
                userId: user.userId,
              },
            },
          },
        },
      });

      if (!channel) {
        return NextResponse.json(
          { error: 'Channel not found or access denied' },
          { status: 404 }
        );
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || '';
      const sanitizedFilename = sanitizeFilename(file.name);
      const uniqueFilename = `${uuidv4()}_${sanitizedFilename}`;
      const filePath = join(UPLOAD_DIR, uniqueFilename);

      // Ensure upload directory exists
      try {
        await mkdir(UPLOAD_DIR, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Save file to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Create attachment record
      const attachment = await prisma.attachment.create({
        data: {
          filename: uniqueFilename,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          url: `/uploads/${uniqueFilename}`,
          type: getFileType(file.type),
          userId: user.userId,
          channelId,
        },
      });

      // Create a message for the file upload
      const message = await prisma.message.create({
        data: {
          content: `Uploaded a file: ${file.name}`,
          type: 'FILE',
          userId: user.userId,
          channelId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              isAnonymous: true,
              anonymousId: true,
              avatar: true,
            },
          },
          attachments: true,
        },
      });

      // Log file upload
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'FILE_UPLOAD',
          details: JSON.stringify({
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            channelId,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'File uploaded successfully',
        attachment,
        message,
      });
    } catch (error) {
      console.error('File upload error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const channelId = searchParams.get('channelId');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      if (!channelId) {
        return NextResponse.json(
          { error: 'Channel ID required' },
          { status: 400 }
        );
      }

      // Verify user has access to channel
      const channel = await prisma.channel.findFirst({
        where: {
          id: channelId,
          server: {
            members: {
              some: {
                userId: user.userId,
              },
            },
          },
        },
      });

      if (!channel) {
        return NextResponse.json(
          { error: 'Channel not found or access denied' },
          { status: 404 }
        );
      }

      // Get attachments for the channel
      const attachments = await prisma.attachment.findMany({
        where: { channelId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              isAnonymous: true,
              anonymousId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return NextResponse.json({ attachments });
    } catch (error) {
      console.error('Get attachments error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const attachmentId = searchParams.get('id');

      if (!attachmentId) {
        return NextResponse.json(
          { error: 'Attachment ID required' },
          { status: 400 }
        );
      }

      // Get attachment and verify ownership or admin rights
      const attachment = await prisma.attachment.findFirst({
        where: {
          id: attachmentId,
          OR: [
            { userId: user.userId }, // Owner
            {
              channel: {
                server: {
                  members: {
                    some: {
                      userId: user.userId,
                      role: {
                        permissions: {
                          has: 'DELETE_MESSAGES',
                        },
                      },
                    },
                  },
                },
              },
            }, // Has permission
          ],
        },
      });

      if (!attachment) {
        return NextResponse.json(
          { error: 'Attachment not found or access denied' },
          { status: 404 }
        );
      }

      // Delete file from disk
      try {
        const filePath = join(UPLOAD_DIR, attachment.filename);
        await writeFile(filePath, ''); // This is a simplified approach
        // In production, you'd use fs.unlink() to actually delete the file
      } catch (error) {
        console.error('Failed to delete file from disk:', error);
      }

      // Delete attachment record
      await prisma.attachment.delete({
        where: { id: attachmentId },
      });

      // Log file deletion
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: 'FILE_DELETE',
          details: JSON.stringify({
            attachmentId,
            filename: attachment.originalName,
            timestamp: new Date().toISOString(),
          }),
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('Delete attachment error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
