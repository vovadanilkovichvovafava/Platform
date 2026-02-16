/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Running database schema sync...');
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Database schema sync completed successfully');
  } catch (error) {
    console.error('WARNING: prisma db push failed:', error.message);
    console.log('Attempting to continue...');
  }

  const prisma = new PrismaClient();

  try {
    const trailCount = await prisma.trail.count();
    const questionCount = await prisma.question.count();
    const inviteCount = await prisma.invite.count();
    const userCount = await prisma.user.count();
    const enrollmentCount = await prisma.enrollment.count();
    console.log(`DB status: ${trailCount} trails, ${questionCount} questions, ${inviteCount} invites, ${userCount} users, ${enrollmentCount} enrollments`);

    // Re-seed if no data OR FORCE_SEED is set
    const forceSeed = process.env.FORCE_SEED === 'true';
    if (forceSeed || trailCount === 0 || questionCount === 0 || inviteCount === 0) {
      console.log(forceSeed ? 'FORCE_SEED enabled, running seed...' : 'Database needs seeding, running seed...');
      execSync('npm run db:seed', { stdio: 'inherit' });
      console.log('Seed completed!');
      // Log post-seed counts
      const postTrails = await prisma.trail.count();
      const postUsers = await prisma.user.count();
      console.log(`Post-seed: ${postTrails} trails, ${postUsers} users`);
    }
  } catch (error) {
    console.error('Could not check database, running seed...', error.message);
    execSync('npm run db:seed', { stdio: 'inherit' });
  } finally {
    await prisma.$disconnect();
  }

  console.log('Starting Next.js server on port 8080...');
  execSync('npx next start -p 8080', { stdio: 'inherit' });
}

main().catch(console.error);
