/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

/**
 * Production start script (used by `npm start`).
 *
 * Environment:
 *   DB_MIGRATE_MODE       push (default) | deploy | none
 *                         `deploy` applies prisma/migrations — REQUIRED for Saturn
 *                         and any environment holding real data.
 *   DB_ACCEPT_DATA_LOSS   'true' (default) only in push mode — see warning below.
 *   ALLOW_SEED_ON_ERROR   'true' to seed even when the DB could not be read.
 *   FORCE_SEED            'true' to re-run the seed unconditionally.
 *   PORT                  listen port (default 8080)
 */

function runMigrations() {
  const mode = process.env.DB_MIGRATE_MODE || 'push';

  if (mode === 'none') {
    console.log('DB_MIGRATE_MODE=none — skipping schema step.');
    return;
  }

  if (mode === 'deploy') {
    console.log('Applying committed migrations (prisma migrate deploy)...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    return;
  }

  if (mode !== 'push') {
    throw new Error(`Unknown DB_MIGRATE_MODE='${mode}' (expected push|deploy|none)`);
  }

  // `db push` bypasses prisma/migrations entirely and can drop columns.
  // Kept as the default for backward compatibility with the existing Railway
  // deploy, but it is NOT safe for production data.
  const acceptDataLoss = (process.env.DB_ACCEPT_DATA_LOSS || 'true') === 'true';
  if (acceptDataLoss) {
    console.warn(
      '\n⚠️  WARNING: running `prisma db push --accept-data-loss`.\n' +
      '    This can DROP COLUMNS/TABLES without confirmation and ignores\n' +
      '    prisma/migrations. Set DB_MIGRATE_MODE=deploy for real data.\n'
    );
  }
  console.log('Syncing schema (prisma db push)...');
  execSync(`npx prisma db push --skip-generate${acceptDataLoss ? ' --accept-data-loss' : ''}`, {
    stdio: 'inherit',
  });
}

async function main() {
  runMigrations();

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
    // Seeding a database we could not read risks writing demo content into a
    // live dataset, so fail loudly instead — opt in explicitly if desired.
    if (process.env.ALLOW_SEED_ON_ERROR === 'true') {
      console.log('Could not check database, running seed...', error.message);
      execSync('npm run db:seed', { stdio: 'inherit' });
    } else {
      console.error('FATAL: could not read the database:', error.message);
      console.error('Set ALLOW_SEED_ON_ERROR=true to seed anyway (unsafe on live data).');
      await prisma.$disconnect();
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }

  const port = process.env.PORT || '8080';
  console.log(`Starting Next.js server on port ${port}...`);
  execSync(`npx next start -p ${port}`, { stdio: 'inherit' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
