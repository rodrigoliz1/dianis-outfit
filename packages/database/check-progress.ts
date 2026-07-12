import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const res = await sql`SELECT count(image_url) as count FROM outfit_templates WHERE image_url IS NOT NULL`;
  console.log('Images generated:', res[0].count);
}

main().catch(console.error);
