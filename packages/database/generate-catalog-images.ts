/**
 * generate-catalog-images.ts
 * Run locally to generate DALL-E 3 images for all catalog outfits and save to DB.
 * Usage: npx tsx packages/database/generate-catalog-images.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env from monorepo root
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });


import OpenAI from 'openai';
import { v2 as cloudinary } from 'cloudinary';
import { neon } from '@neondatabase/serverless';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sql = neon(process.env.DATABASE_URL!);

async function generateImage(outfit: any): Promise<string | null> {
  const colors = (outfit.color_palette || []).slice(0, 4).join(', ') || 'colores neutros';
  const styles = (outfit.style_tags || []).slice(0, 3).join(', ') || 'moderno';
  const occasion = (outfit.occasion_tags || []).slice(0, 2).join(' y ') || 'ocasión';

  const prompt = `Professional fashion editorial flatlay photograph of a complete women's outfit for ${occasion}.
Style: ${styles}. Color palette: ${colors}.
Outfit: "${outfit.name}" — ${outfit.description}
Show the complete outfit arranged beautifully on a clean white background, like a luxury fashion magazine.
Include all clothing pieces (top, bottom or dress, shoes, bag if applicable) laid out neatly.
No people, no mannequin. Just the clothing pieces arranged in a flatlay style.
Ultra high quality, professional studio lighting, sharp details.`;

  try {
    const res = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const dalleUrl = res.data?.[0]?.url;
    if (!dalleUrl) return null;

    // Upload to Cloudinary for permanent storage
    const upload = await cloudinary.uploader.upload(dalleUrl, {
      folder: 'dianis-outfit/outfits/catalog',
      public_id: `outfit-${outfit.slug}`,
      overwrite: true,
      transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
    });

    return upload.secure_url;
  } catch (e: any) {
    console.error(`  ❌ Error: ${e?.message}`);
    return null;
  }
}

async function main() {
  console.log('🎨 Generating catalog outfit images with DALL-E 3...\n');

  const outfits = await sql`
    SELECT id, slug, name, description, image_url, color_palette, style_tags, occasion_tags 
    FROM outfit_templates 
    WHERE is_active = true 
    ORDER BY name
  ` as any[];

  const missing = outfits.filter((o: any) => !o.image_url);
  console.log(`Total outfits: ${outfits.length} | Missing images: ${missing.length}\n`);

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const outfit = missing[i];
    console.log(`[${i + 1}/${missing.length}] Generating: "${outfit.name}" (${outfit.slug})...`);

    const imageUrl = await generateImage(outfit);

    if (imageUrl) {
      await sql`UPDATE outfit_templates SET image_url = ${imageUrl} WHERE id = ${outfit.id}`;
      console.log(`  ✅ Saved: ${imageUrl.substring(0, 80)}...`);
      generated++;
    } else {
      console.log(`  ⚠️  Skipped (no URL returned)`);
      failed++;
    }

    // Rate limit: DALL-E allows ~5 images/min on standard tier
    if (i < missing.length - 1) {
      console.log(`  ⏳ Waiting 13s to respect rate limits...`);
      await new Promise(r => setTimeout(r, 13000));
    }
  }

  console.log(`\n✅ Done! Generated: ${generated} | Failed: ${failed} | Total: ${missing.length}`);
}

main().catch(console.error);
