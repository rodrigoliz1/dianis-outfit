import cron from 'node-cron';
import OpenAI from 'openai';
import { db, outfitTemplates } from '@dianis/database';
import { generateOutfitImage } from './ai.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates a single new outfit for the given gender and inserts it into the DB.
 */
export const generateAndSaveNewOutfit = async (gender: 'masculino' | 'femenino') => {
  console.log(`🤖 Starting AI outfit generation for gender: ${gender}...`);
  
  try {
    // 1. Ask GPT-4o for a fresh, creative outfit idea
    const prompt = `Eres un estilista experto. Diseña un outfit completamente nuevo, creativo y a la moda para ${gender === 'masculino' ? 'hombre' : 'mujer'}.
Debe ser algo que no sea básico, sino un look completo y atractivo.
Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "slug": "un-slug-unico-ejemplo-outfit-primavera-2026",
  "name": "Nombre Elegante del Outfit",
  "description": "Descripción detallada del look y por qué funciona.",
  "occasionTags": ["dia-casual", "fiesta", etc... (elige 2 o 3)],
  "styleTags": ["urbano", "elegante", etc... (elige 2 o 3)],
  "colorPalette": ["color1", "color2", "color3"],
  "formalityScore": 3
}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");

    const outfitData = JSON.parse(content);
    console.log(`✨ AI suggested outfit: ${outfitData.name}`);

    // 2. Insert the basic outfit into DB first so we have the record
    const [inserted] = await db.insert(outfitTemplates).values({
      slug: `${outfitData.slug}-${Date.now()}`, // ensure unique
      name: outfitData.name,
      description: outfitData.description,
      occasionTags: outfitData.occasionTags || [],
      styleTags: outfitData.styleTags || [],
      colorPalette: outfitData.colorPalette || [],
      formalityScore: outfitData.formalityScore || 3,
      gender: gender,
      isActive: true,
    }).returning();

    // 3. Generate the image using fal.ai/Cloudinary via our existing helper
    console.log(`🎨 Generating image for ${outfitData.name}...`);
    const imageUrl = await generateOutfitImage(
      outfitData.name,
      outfitData.description,
      outfitData.colorPalette || [],
      outfitData.styleTags || [],
      outfitData.occasionTags || [],
      gender,
      null
    );

    // 4. Update the DB with the image URL
    if (imageUrl && inserted) {
      await db.update(outfitTemplates)
        .set({ imageUrl })
        .where({ id: inserted.id } as any);
      console.log(`✅ Outfit saved and image generated successfully: ${imageUrl}`);
    } else {
      console.error(`⚠️ Failed to generate image for outfit: ${outfitData.name}`);
    }

    return inserted;
  } catch (error) {
    console.error(`❌ Error in automatic outfit generation (${gender}):`, error);
    throw error;
  }
};

/**
 * Initializes the automated cron jobs.
 */
export const initCronJobs = () => {
  // Run every Sunday at midnight (0 0 * * 0)
  // Generates 1 male and 1 female outfit per week to keep catalog fresh.
  cron.schedule('0 0 * * 0', async () => {
    console.log('⏰ Weekly Cron Job Triggered: Generating new AI outfits...');
    try {
      await generateAndSaveNewOutfit('femenino');
      await generateAndSaveNewOutfit('masculino');
      console.log('✅ Weekly automated outfit generation complete.');
    } catch (e) {
      console.error('❌ Weekly cron job failed:', e);
    }
  });

  console.log('📅 Cron jobs initialized (Weekly AI generation scheduled).');
};
