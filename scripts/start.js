const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
  console.log('Running database migrations...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  const prisma = new PrismaClient();

  try {
    const trailCount = await prisma.trail.count();
    console.log(`Found ${trailCount} trails in database`);

    if (trailCount === 0) {
      console.log('No trails found, running seed...');
      execSync('npm run db:seed', { stdio: 'inherit' });
      console.log('Seed completed!');
    }
  } catch (error) {
    console.log('Could not check trails, running seed...');
    execSync('npm run db:seed', { stdio: 'inherit' });
  } finally {
    await prisma.$disconnect();
  }

  console.log('Starting Next.js server on port 8080...');
  execSync('npx next start -p 8080', { stdio: 'inherit' });
}

main().catch(console.error);
