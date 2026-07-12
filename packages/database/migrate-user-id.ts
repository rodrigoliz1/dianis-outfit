import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('Starting migration: changing user_id columns from UUID to TEXT...');
  try {
    await sql`ALTER TABLE wardrobe_items DROP CONSTRAINT IF EXISTS wardrobe_items_user_id_users_id_fk`;
    await sql`ALTER TABLE wardrobe_items ALTER COLUMN user_id TYPE text USING user_id::text`;
    console.log('✓ wardrobe_items.user_id migrated');

    await sql`ALTER TABLE generated_outfits DROP CONSTRAINT IF EXISTS generated_outfits_user_id_users_id_fk`;
    await sql`ALTER TABLE generated_outfits ALTER COLUMN user_id TYPE text USING user_id::text`;
    console.log('✓ generated_outfits.user_id migrated');

    await sql`ALTER TABLE outfit_favorites DROP CONSTRAINT IF EXISTS outfit_favorites_user_id_users_id_fk`;
    await sql`ALTER TABLE outfit_favorites ALTER COLUMN user_id TYPE text USING user_id::text`;
    console.log('✓ outfit_favorites.user_id migrated');

    await sql`ALTER TABLE wear_history DROP CONSTRAINT IF EXISTS wear_history_user_id_users_id_fk`;
    await sql`ALTER TABLE wear_history ALTER COLUMN user_id TYPE text USING user_id::text`;
    console.log('✓ wear_history.user_id migrated');

    await sql`ALTER TABLE outfit_ratings DROP CONSTRAINT IF EXISTS outfit_ratings_user_id_users_id_fk`;
    await sql`ALTER TABLE outfit_ratings ALTER COLUMN user_id TYPE text USING user_id::text`;
    console.log('✓ outfit_ratings.user_id migrated');

    await sql`ALTER TABLE ai_analysis_jobs DROP CONSTRAINT IF EXISTS ai_analysis_jobs_user_id_users_id_fk`;
    await sql`ALTER TABLE ai_analysis_jobs ALTER COLUMN user_id TYPE text USING user_id::text`;
    console.log('✓ ai_analysis_jobs.user_id migrated');

    console.log('\n✅ Migration completed successfully!');
  } catch (e: any) {
    console.error('❌ Migration error:', e.message);
    process.exit(1);
  }
}

migrate();
