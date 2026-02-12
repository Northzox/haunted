import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'northlable69@gmail.com';
  const hashedPassword = await bcrypt.hash('admin123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      isAdmin: true,
      emailVerified: true,
      bio: 'System Administrator',
      customStatus: 'Managing the darkness',
    },
  });

  console.log('✅ Admin user created:', admin.username);

  // Create system badges
  const badges = [
    {
      name: 'Founder',
      description: 'Platform Founder',
      icon: '👑',
      color: '#FFD700',
      isSystem: true,
    },
    {
      name: 'Early User',
      description: 'Early Platform Adopter',
      icon: '⭐',
      color: '#C0C0C0',
      isSystem: true,
    },
    {
      name: 'Verified',
      description: 'Verified User',
      icon: '✓',
      color: '#00FF00',
      isSystem: true,
    },
    {
      name: 'Moderator',
      description: 'Community Moderator',
      icon: '🛡️',
      color: '#FF6B6B',
      isSystem: true,
    },
    {
      name: 'Admin',
      description: 'System Administrator',
      icon: '⚡',
      color: '#FF0000',
      isSystem: true,
    },
    {
      name: 'Developer',
      description: 'Platform Developer',
      icon: '💻',
      color: '#00FFFF',
      isSystem: true,
    },
    {
      name: 'Anonymous Elite',
      description: 'Master of Anonymity',
      icon: '🎭',
      color: '#800080',
      isSystem: true,
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    });
  }

  console.log('✅ System badges created');

  // Assign admin badge to admin user
  const adminBadge = await prisma.badge.findUnique({
    where: { name: 'Admin' },
  });

  if (adminBadge) {
    await prisma.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId: admin.id,
          badgeId: adminBadge.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        badgeId: adminBadge.id,
        isActive: true,
      },
    });
  }

  // Create default permissions
  const permissions = [
    { name: 'READ_MESSAGES', description: 'Read messages in channels' },
    { name: 'SEND_MESSAGES', description: 'Send messages in channels' },
    { name: 'DELETE_MESSAGES', description: 'Delete messages' },
    { name: 'MANAGE_CHANNELS', description: 'Create and manage channels' },
    { name: 'MANAGE_SERVER', description: 'Manage server settings' },
    { name: 'BAN_MEMBERS', description: 'Ban and unban members' },
    { name: 'KICK_MEMBERS', description: 'Kick members from server' },
    { name: 'MANAGE_ROLES', description: 'Create and manage roles' },
    { name: 'MENTION_EVERYONE', description: 'Mention @everyone' },
    { name: 'ATTACH_FILES', description: 'Upload files' },
    { name: 'EMBED_LINKS', description: 'Embed links in messages' },
    { name: 'ADD_REACTIONS', description: 'Add reactions to messages' },
    { name: 'MANAGE_PERMISSIONS', description: 'Manage channel permissions' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  console.log('✅ Default permissions created');

  // Create a sample server
  const sampleServer = await prisma.server.create({
    data: {
      name: 'Haunted Crd Official',
      description: 'The official Haunted Crd server',
      ownerId: admin.id,
      isPublic: true,
      inviteCode: 'HAUNTED',
    },
  });

  console.log('✅ Sample server created:', sampleServer.name);

  // Create default channels for the sample server
  const channels = [
    { name: 'welcome', type: 'TEXT', topic: 'Welcome to Haunted Crd' },
    { name: 'general', type: 'TEXT', topic: 'General discussion' },
    { name: 'media', type: 'MEDIA', topic: 'Share media files' },
    { name: 'files', type: 'FILE', topic: 'File sharing' },
  ];

  for (const channel of channels) {
    await prisma.channel.create({
      data: {
        name: channel.name,
        type: channel.type as any,
        serverId: sampleServer.id,
        topic: channel.topic,
        position: channels.indexOf(channel),
      },
    });
  }

  console.log('✅ Default channels created');

  // Add admin as member of the sample server
  await prisma.serverMember.create({
    data: {
      userId: admin.id,
      serverId: sampleServer.id,
    },
  });

  console.log('✅ Admin added to sample server');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
