import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const sql = neon(process.env.DATABASE_URL!);
const FAL_KEY = process.env.FAL_KEY!;
const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadToCloudinary(imageUrl: string, _slug: string): Promise<string | null> {
  // Return fal.ai URL directly - already saved to fal CDN permanently
  return imageUrl;
}

async function generateImageWithFal(prompt: string): Promise<string | null> {
  if (!FAL_KEY) {
    console.log('  ❌ FAL_KEY not set');
    return null;
  }

  try {
    const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt.substring(0, 950),
        image_size: 'square_hd',
        num_inference_steps: 4
      })
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('  ❌ Fal.ai error:', text);
      return null;
    }

    const data = JSON.parse(text);
    return data.images?.[0]?.url || null;
  } catch (e: any) {
    console.error('  ❌ Fal.ai exception:', e.message);
    return null;
  }
}

async function main() {
  console.log('🎨 Pre-generating catalog outfit images with fal.ai...\n');

  const templates = await sql`
    SELECT id, slug, name, description, occasion_tags, style_tags, color_palette, gender
    FROM outfit_templates
    WHERE image_url IS NULL OR image_url LIKE '%unsplash%'
    ORDER BY name
  ` as any[];

  console.log(`Found ${templates.length} outfits needing real AI-generated images.\n`);

  if (templates.length === 0) {
    console.log('✅ All outfits already have AI-generated images!');
    return;
  }

  let generated = 0;
  let failed = 0;

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    console.log(`[${i + 1}/${templates.length}] Generating: "${t.name}" (${t.slug})...`);

    const colors = Array.isArray(t.color_palette) ? t.color_palette.slice(0, 3).join(', ') : 'neutros elegantes';
    const styles = Array.isArray(t.style_tags) ? t.style_tags.slice(0, 2).join(', ') : 'moderno';
    const occasion = Array.isArray(t.occasion_tags) ? t.occasion_tags.slice(0, 2).join(' y ') : 'ocasión especial';
    const genderStr = t.gender === 'masculino' ? 'man' : 'woman';

    const prompt = `High-quality fashion editorial photograph of a stylish ${genderStr} wearing a complete outfit. Occasion: ${occasion}. Style: ${styles}. Colors: ${colors}. The outfit is called "${t.name}". Professional fashion photography, clean studio or lifestyle background, natural pose, magazine quality lighting.`;

    const falUrl = await generateImageWithFal(prompt);
    if (!falUrl) {
      console.log('  ⚠️  Failed to generate, skipping...');
      failed++;
      await sleep(2000);
      continue;
    }

    console.log('  ✅ Generated! Uploading to Cloudinary...');
    const finalUrl = await uploadToCloudinary(falUrl, t.slug);
    
    if (finalUrl) {
      await sql`UPDATE outfit_templates SET image_url = ${finalUrl} WHERE id = ${t.id}`;
      console.log(`  💾 Saved: ${finalUrl.substring(0, 70)}...`);
      generated++;
    } else {
      failed++;
    }

    // Rate limit: 1 request every 3s for fal.ai free tier
    if (i < templates.length - 1) {
      console.log('  ⏳ Waiting 3s...');
      await sleep(3000);
    }
  }

  console.log(`\n✅ Done! Generated: ${generated} | Failed: ${failed} | Total: ${templates.length}`);
}

main().catch(console.error);
