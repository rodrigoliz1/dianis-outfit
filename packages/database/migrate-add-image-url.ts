import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`ALTER TABLE generated_outfits ADD COLUMN IF NOT EXISTS image_url text`;
  console.log('✅ image_url column added to generated_outfits');
}

main().catch(console.error);
