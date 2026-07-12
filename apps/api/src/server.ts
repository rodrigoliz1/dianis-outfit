import './env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { clerkPlugin, getAuth } from '@clerk/fastify';
import path from 'path';
import { db, occasions, outfitTemplates, wardrobeItems, wardrobeItemImages } from '@dianis/database';
import { eq, or } from 'drizzle-orm';
import multipart from '@fastify/multipart';
import { v2 as cloudinary } from 'cloudinary';
import { analyzeWardrobeItem, generateOutfit, generateOutfitImage } from './ai.js';
import { generatedOutfits, generatedOutfitItems, outfitFavorites, wearHistory } from '@dianis/database';

// In-memory lock: tracks which outfit IDs are currently having an image generated
// Prevents duplicate DALL-E calls when multiple users open the same imageless outfit simultaneously
const imageGeneratingLock = new Set<string>();


const server = Fastify({
  logger: true
});

server.register(cors, {
  origin: true // Configured later based on ENV
});

server.register(helmet);

server.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

server.register(clerkPlugin, {
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});

server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

server.get('/api/catalog', async (request, reply) => {
  try {
    const { occasion } = request.query as { occasion?: string };
    const catalog = await db.select().from(outfitTemplates);
    
    let filtered = catalog;
    if (occasion) {
      filtered = catalog.filter(outfit => 
        outfit.occasionTags && outfit.occasionTags.includes(occasion)
      );
    }
    
    return { success: true, data: filtered };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch catalog' });
  }
});

server.get('/api/occasions', async (request, reply) => {
  try {
    const occ = await db.select().from(occasions);
    return { success: true, data: occ };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch occasions' });
  }
});

server.post('/api/wardrobe/analyze', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return reply.status(401).send({ success: false, error: 'Unauthorized' });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, error: 'No image uploaded' });
    }

    const buffer = await data.toBuffer();
    
    // Upload original to Cloudinary
    const originalUpload = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'dianis-outfit/wardrobe' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    }) as any;

    // Build enhanced URL: background removal + clean white background + auto quality
    // e_background_removal removes the background, b_white adds white bg
    const publicId = originalUpload.public_id;
    const enhancedUrl = cloudinary.url(publicId, {
      transformation: [
        { effect: 'background_removal' },
        { background: 'white', gravity: 'center', width: 800, height: 800, crop: 'pad' },
        { quality: 'auto:good', fetch_format: 'auto' }
      ],
      secure: true
    });

    // Analyze with AI using the original clean upload
    let analysis: any = { category: 'tops', colorFamily: 'unknown', weatherTags: [], styleTags: [] };
    try {
      analysis = await analyzeWardrobeItem(originalUpload.secure_url);
    } catch (e) {
      server.log.error(e as Error, "AI Analysis failed");
    }

    return { 
      success: true, 
      data: { 
        imageUrl: enhancedUrl,           // enhanced version with white background
        originalImageUrl: originalUpload.secure_url,  // original for AI fallback
        analysis 
      } 
    };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to analyze item' });
  }
});

server.post('/api/wardrobe', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return reply.status(401).send({ success: false, error: 'Unauthorized' });
    }

    const body = request.body as any;
    if (!body || !body.imageUrl) {
      return reply.status(400).send({ success: false, error: 'Missing image URL' });
    }

    // Create item in DB
    const [newItem] = await db.insert(wardrobeItems).values({
      userId,
      name: body.name || 'Mi Prenda',
      category: body.category || 'tops',
      primaryColor: body.colorFamily || 'unknown',
      weatherTags: body.weatherTags || [],
      styleTags: body.styleTags || []
    }).returning();

    // Save image record
    if (newItem) {
      await db.insert(wardrobeItemImages).values({
        wardrobeItemId: newItem.id,
        cloudinaryPublicId: body.imageUrl,
        secureUrl: body.imageUrl,
        isPrimary: true,
      });
    }

    return { success: true, data: { ...newItem, imageUrl: body.imageUrl } };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to save item' });
  }
});

server.get('/api/wardrobe', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return reply.status(401).send({ success: false, error: 'Unauthorized' });
    }

    // Get items with their primary image
    const items = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, userId));
    
    // Fetch primary images for all items
    const itemsWithImages = await Promise.all(items.map(async (item) => {
      const images = await db.select().from(wardrobeItemImages)
        .where(eq(wardrobeItemImages.wardrobeItemId, item.id))
        .limit(1);
      return { ...item, imageUrl: images[0]?.secureUrl || null };
    }));
    
    return { success: true, data: itemsWithImages };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch wardrobe' });
  }
});

server.post('/api/outfits/generate', async (request, reply) => {
  // NOTE: Each call creates a new generatedOutfit entry in DB.
  // Wardrobe outfits are user-specific combinations — no two calls produce identical results,
  // so we do NOT cache at the route level. Caching is done by saving the result in generatedOutfits
  // table and serving from there when the user revisits via /api/outfits/:id.
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const body = request.body as { occasion: string, style: string };
    
    // Fetch user's wardrobe with images
    const userItemsRaw = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, userId));
    
    if (userItemsRaw.length < 2) {
      return reply.status(400).send({ success: false, error: 'Not enough items in wardrobe to generate an outfit' });
    }

    // Attach images to each item
    const userItems = await Promise.all(userItemsRaw.map(async (item) => {
      const imgs = await db.select().from(wardrobeItemImages)
        .where(eq(wardrobeItemImages.wardrobeItemId, item.id)).limit(1);
      return { ...item, imageUrl: imgs[0]?.secureUrl || null };
    }));

    const aiResult = await generateOutfit(userItems, body.occasion, body.style);
    
    if (!aiResult) {
      return reply.status(500).send({ success: false, error: 'Failed to generate outfit' });
    }

    // Save generated outfit to DB
    const [newOutfit] = await db.insert(generatedOutfits).values({
      userId,
      sourceMode: 'wardrobe',
      name: aiResult.name,
      description: aiResult.description,
      score: 100
    }).returning();

    // Attach items
    const itemsToAttach: any[] = [];
    if (newOutfit && aiResult.topId) itemsToAttach.push({ generatedOutfitId: newOutfit.id, wardrobeItemId: aiResult.topId, role: 'top' });
    if (newOutfit && aiResult.bottomId) itemsToAttach.push({ generatedOutfitId: newOutfit.id, wardrobeItemId: aiResult.bottomId, role: 'bottom' });
    if (newOutfit && aiResult.shoesId) itemsToAttach.push({ generatedOutfitId: newOutfit.id, wardrobeItemId: aiResult.shoesId, role: 'shoes' });
    if (newOutfit && aiResult.outerwearId) itemsToAttach.push({ generatedOutfitId: newOutfit.id, wardrobeItemId: aiResult.outerwearId, role: 'outerwear' });
    if (newOutfit && aiResult.accessoryId) itemsToAttach.push({ generatedOutfitId: newOutfit.id, wardrobeItemId: aiResult.accessoryId, role: 'accessory' });
    
    if (itemsToAttach.length > 0) {
      await db.insert(generatedOutfitItems).values(itemsToAttach);
    }

    // Build collage: return the actual wardrobe item images selected
    const selectedIds = [aiResult.topId, aiResult.bottomId, aiResult.shoesId, aiResult.outerwearId, aiResult.accessoryId].filter(Boolean);
    const collageItems = userItems.filter(i => selectedIds.includes(i.id)).map(i => ({
      id: i.id,
      name: i.name,
      category: i.category,
      imageUrl: i.imageUrl,
    }));

    return { success: true, data: { ...newOutfit, aiResult, collageItems } };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Generation failed' });
  }
});

server.get('/api/outfits/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    
    // UUID pattern check
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // First check by slug (always safe)
    const bySlug = await db.select().from(outfitTemplates).where(eq(outfitTemplates.slug, id)).limit(1);
    if (bySlug.length > 0) {
      const outfit = bySlug[0]!;
      // Auto-generate image if missing — lock prevents duplicate DALL-E calls
      if (!outfit.imageUrl && !imageGeneratingLock.has(outfit.id)) {
        imageGeneratingLock.add(outfit.id);
        const outfitId = outfit.id;
        const outfitName = outfit.name;
        const outfitDesc = outfit.description || outfit.name;
        const outfitColors = outfit.colorPalette || [];
        const outfitStyles = outfit.styleTags || [];
        const outfitOccasions = outfit.occasionTags || [];
        generateOutfitImage(outfitName, outfitDesc, outfitColors, outfitStyles, outfitOccasions)
          .then(async (imageUrl) => {
            if (imageUrl) {
              await db.update(outfitTemplates).set({ imageUrl }).where(eq(outfitTemplates.id, outfitId));
            }
          })
          .catch((e) => server.log.error(e, 'Failed to generate outfit image'))
          .finally(() => imageGeneratingLock.delete(outfitId));
      }
      return { success: true, data: outfit };
    }

    // Check by UUID id only if it looks like a UUID
    if (isUuid) {
      const byId = await db.select().from(outfitTemplates).where(eq(outfitTemplates.id, id)).limit(1);
      if (byId.length > 0) {
        const outfit = byId[0]!;
        if (!outfit.imageUrl && !imageGeneratingLock.has(outfit.id)) {
          imageGeneratingLock.add(outfit.id);
          const outfitId = outfit.id;
          const outfitName = outfit.name;
          const outfitDesc = outfit.description || outfit.name;
          const outfitColors = outfit.colorPalette || [];
          const outfitStyles = outfit.styleTags || [];
          const outfitOccasions = outfit.occasionTags || [];
          generateOutfitImage(outfitName, outfitDesc, outfitColors, outfitStyles, outfitOccasions)
            .then(async (imageUrl) => {
              if (imageUrl) {
                await db.update(outfitTemplates).set({ imageUrl }).where(eq(outfitTemplates.id, outfitId));
              }
            })
            .catch((e) => server.log.error(e, 'Failed to generate outfit image'))
            .finally(() => imageGeneratingLock.delete(outfitId));
        }
        return { success: true, data: outfit };
      }

      // Check if it's a generated outfit
      const generated = await db.select().from(generatedOutfits).where(eq(generatedOutfits.id, id)).limit(1);
      if (generated.length > 0) {
        return { success: true, data: generated[0] };
      }
    }
    
    return reply.status(404).send({ success: false, error: 'Outfit not found' });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch outfit' });
  }
});

// Admin endpoint: pre-generate ALL missing catalog outfit images in sequential batches
// Protected by secret key. Call once after seeding the catalog.
// Sequential (not parallel) to respect DALL-E rate limits.
server.get('/api/admin/generate-catalog-images', async (request, reply) => {
  const { secret } = request.query as { secret?: string };
  const adminSecret = process.env.ADMIN_SECRET || 'dianis-admin-2024';
  if (secret !== adminSecret) {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }

  try {
    const outfits = await db.select().from(outfitTemplates).where(eq(outfitTemplates.isActive, true));
    const missing = outfits.filter(o => !o.imageUrl && !imageGeneratingLock.has(o.id));
    
    server.log.info(`Starting bulk image generation for ${missing.length} outfits`);
    let generated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Sequential to avoid DALL-E rate limits (1 image ~15s, limit: ~5/min)
    for (const outfit of missing) {
      if (imageGeneratingLock.has(outfit.id)) continue;
      imageGeneratingLock.add(outfit.id);
      try {
        const imageUrl = await generateOutfitImage(
          outfit.name,
          outfit.description || outfit.name,
          outfit.colorPalette || [],
          outfit.styleTags || [],
          outfit.occasionTags || []
        );
        if (imageUrl) {
          await db.update(outfitTemplates)
            .set({ imageUrl })
            .where(eq(outfitTemplates.id, outfit.id));
          generated++;
          server.log.info(`Generated image for: ${outfit.slug}`);
        } else {
          failed++;
          errors.push(`${outfit.slug}: generateOutfitImage returned null`);
        }
      } catch (e: any) {
        failed++;
        const msg = e?.message || String(e);
        errors.push(`${outfit.slug}: ${msg}`);
        server.log.error(e, `Failed for outfit: ${outfit.slug}`);
        // If first image fails, bail out early with diagnostics
        if (generated === 0 && failed === 1) {
          imageGeneratingLock.delete(outfit.id);
          return { success: false, generated, failed, total: missing.length, firstError: msg };
        }
      } finally {
        imageGeneratingLock.delete(outfit.id);
      }
      // Small delay between calls to respect rate limits
      await new Promise(r => setTimeout(r, 2000));
    }

    return { success: generated > 0, generated, failed, total: missing.length, errors: errors.slice(0, 5) };
  } catch (error: any) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: error?.message || 'Failed to generate images' });
  }
});

// Admin diagnostic: test generating a single image (returns error detail if it fails)
server.get('/api/admin/test-image-gen', async (request, reply) => {
  const { secret } = request.query as { secret?: string };
  if (secret !== (process.env.ADMIN_SECRET || 'dianis-admin-2024')) {
    return reply.status(401).send({ success: false, error: 'Unauthorized' });
  }
  try {
    const imageUrl = await generateOutfitImage(
      'Campus Marfil',
      'Outfit casual pulido, perfecto para universidad o café.',
      ['blanco', 'azul denim', 'beige', 'dorado'],
      ['casual pulido'],
      ['universidad', 'cafe']
    );
    return { success: !!imageUrl, imageUrl };
  } catch (e: any) {
    return { success: false, error: e?.message, stack: e?.stack?.substring(0, 500) };
  }
});

server.post('/api/favorites', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const { templateId, generatedOutfitId } = request.body as { templateId?: string, generatedOutfitId?: string };
    
    if (!templateId && !generatedOutfitId) {
      return reply.status(400).send({ success: false, error: 'Need templateId or generatedOutfitId' });
    }

    const [fav] = await db.insert(outfitFavorites).values({
      userId,
      templateOutfitId: templateId || null,
      generatedOutfitId: generatedOutfitId || null
    }).returning();

    return { success: true, data: fav };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to favorite' });
  }
});

server.get('/api/favorites', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const favs = await db.select().from(outfitFavorites).where(eq(outfitFavorites.userId, userId));
    return { success: true, data: favs };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch favorites' });
  }
});

server.post('/api/history', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const { templateId, generatedOutfitId } = request.body as { templateId?: string, generatedOutfitId?: string };

    const [record] = await db.insert(wearHistory).values({
      userId,
      templateOutfitId: templateId || null,
      generatedOutfitId: generatedOutfitId || null
    }).returning();

    return { success: true, data: record };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to save history' });
  }
});

server.get('/api/history', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const history = await db.select().from(wearHistory).where(eq(wearHistory.userId, userId));
    return { success: true, data: history };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch history' });
  }
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
