import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { occasionsData, outfitData } from './seed_data';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('Seeding database...');
  
  // Seed Occasions
  await db.insert(schema.occasions).values(occasionsData).onConflictDoNothing();
  console.log('Occasions seeded');
  await db.insert(schema.outfitTemplates).values(outfitData).onConflictDoNothing();
  console.log('Outfits seeded');

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
