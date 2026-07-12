import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const sql = neon(process.env.DATABASE_URL!);
const FAL_KEY = process.env.FAL_KEY!;

async function main() {
  const prompt = 'High-quality fashion editorial photograph of a stylish woman wearing a complete winter layers outfit. Occasion: winter, cold weather. Style: casual, elegant. Colors: camel, beige, white, navy. Professional fashion photography, cozy lifestyle background, natural pose, magazine quality lighting.';

  console.log('Generating Capas de Invierno...');
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt.substring(0, 950), image_size: 'square_hd', num_inference_steps: 4 })
  });

  const data = await res.json();
  const imageUrl = data.images?.[0]?.url;
  if (imageUrl) {
    await sql`UPDATE outfit_templates SET image_url = ${imageUrl} WHERE slug = 'capas-invierno'`;
    console.log('✅ Saved:', imageUrl);
  } else {
    console.log('❌ Failed:', JSON.stringify(data));
  }
}

main().catch(console.error);
