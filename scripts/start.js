/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Running database migrations...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });

  const prisma = new PrismaClient();

  try {
    const trailCount = await prisma.trail.count();
    const questionCount = await prisma.question.count();
    const inviteCount = await prisma.invite.count();
    console.log(`Found ${trailCount} trails, ${questionCount} questions, ${inviteCount} invites in database`);

    // Re-seed if no data OR FORCE_SEED is set
    const forceSeed = process.env.FORCE_SEED === 'true';
    if (forceSeed || trailCount === 0 || questionCount === 0 || inviteCount === 0) {
      console.log(forceSeed ? 'FORCE_SEED enabled, running seed...' : 'Database needs seeding, running seed...');
      execSync('npm run db:seed', { stdio: 'inherit' });
      console.log('Seed completed!');
    }
  } catch (error) {
    console.log('Could not check database, running seed...', error.message);
    execSync('npm run db:seed', { stdio: 'inherit' });
  } finally {
    await prisma.$disconnect();
  }

  console.log('Starting Next.js server on port 8080...');
  execSync('npx next start -p 8080', { stdio: 'inherit' });
}

main().catch(console.error);
