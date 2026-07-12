import './env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { clerkPlugin, getAuth } from '@clerk/fastify';
import path from 'path';
import { db, occasions, outfitTemplates, wardrobeItems, wardrobeItemImages, users, userProfiles } from '@dianis/database';
import { eq, or, sql, and } from 'drizzle-orm';
import multipart from '@fastify/multipart';
import { v2 as cloudinary } from 'cloudinary';
import { analyzeWardrobeItem, generateOutfit, generateOutfitImage } from './ai.js';
import { generatedOutfits, generatedOutfitItems, outfitFavorites, wearHistory, styleReactions } from '@dianis/database';
import { initCronJobs, generateAndSaveNewOutfit } from './cron.js';

// In-memory lock: tracks which outfit IDs are currently having an image generated
// Prevents duplicate DALL-E calls when multiple users open the same imageless outfit simultaneously
const imageGeneratingLock = new Set<string>();


const server = Fastify({
  logger: true,
  bodyLimit: 15 * 1024 * 1024
});

server.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

server.register(helmet);

server.register(multipart, {
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for iPhone camera photos
    fieldSize: 20 * 1024 * 1024,
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
    const { occasion, gender } = request.query as { occasion?: string; gender?: string };
    const catalog = await db.select().from(outfitTemplates).where(eq(outfitTemplates.isActive, true));
    
    let filtered = catalog;
    if (occasion) {
      filtered = filtered.filter(outfit => 
        outfit.occasionTags && outfit.occasionTags.includes(occasion)
      );
    }
    // Filter by gender if provided
    if (gender) {
      filtered = filtered.filter(outfit => outfit.gender === gender);
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
      subcategory: body.subcategory || null,
      primaryColor: body.colorFamily || 'unknown',
      weatherTags: body.weatherTags || [],
      styleTags: body.styleTags || [],
      formalityScore: body.formalityScore || null,
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

    // ─── Silently generate wardrobe outfit combos in background ───
    // This runs async — user gets response immediately
    if (newItem) {
      const newItemId = newItem.id;
      generateWardrobeOutfits(userId, newItemId).catch(e =>
        server.log.error(e, 'Background outfit generation failed')
      );
    }

    return { success: true, data: { ...newItem, imageUrl: body.imageUrl } };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to save item' });
  }
});

server.delete<{ Params: { id: string } }>('/api/wardrobe/:id', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const { id } = request.params;

    // First, remove any generated outfits that reference this wardrobe item
    // We need to find generated_outfit_items rows referencing this item, then delete their parent outfits too
    const relatedOutfitItems = await db.select().from(generatedOutfitItems).where(eq(generatedOutfitItems.wardrobeItemId, id));
    const relatedOutfitIds = [...new Set(relatedOutfitItems.map(r => r.generatedOutfitId).filter(Boolean))] as string[];
    
    // Delete the outfit items first
    await db.delete(generatedOutfitItems).where(eq(generatedOutfitItems.wardrobeItemId, id));
    
    // Delete associated generated outfits (that are now empty)
    if (relatedOutfitIds.length > 0) {
      for (const outfitId of relatedOutfitIds) {
        await db.delete(generatedOutfits).where(eq(generatedOutfits.id, outfitId));
      }
    }

    // Delete wardrobe item images
    await db.delete(wardrobeItemImages).where(eq(wardrobeItemImages.wardrobeItemId, id));
    
    // Now delete the wardrobe item itself
    await db.delete(wardrobeItems).where(eq(wardrobeItems.id, id));
    return { success: true };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to delete item' });
  }
});

server.get<{ Params: { id: string } }>('/api/wardrobe/:id', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const { id } = request.params;
    const [item] = await db.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)).limit(1);
    if (!item || item.userId !== userId) {
      return reply.status(404).send({ success: false, error: 'Item not found' });
    }
    const imgs = await db.select().from(wardrobeItemImages).where(eq(wardrobeItemImages.wardrobeItemId, id)).limit(1);
    return { success: true, data: { ...item, imageUrl: imgs[0]?.secureUrl || null } };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch item' });
  }
});

server.put<{ Params: { id: string }, Body: { name?: string, category?: string, subcategory?: string, primaryColor?: string } }>('/api/wardrobe/:id', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const { id } = request.params;
    const { name, category, subcategory, primaryColor } = request.body;
    
    // Check ownership
    const [existing] = await db.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)).limit(1);
    if (!existing || existing.userId !== userId) {
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }

    const [updated] = await db.update(wardrobeItems).set({
      name: name !== undefined ? name : sql`name`,
      category: category !== undefined ? category : sql`category`,
      subcategory: subcategory !== undefined ? subcategory : sql`subcategory`,
      primaryColor: primaryColor !== undefined ? primaryColor : sql`primary_color`,
    }).where(eq(wardrobeItems.id, id)).returning();

    return { success: true, data: updated };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to update item' });
  }
});
/**
 * Silently generates outfit combinations for a user after they add a new wardrobe item.
 * Fetches all their items, asks AI for best combo, generates a DALL-E image, saves permanently.
 */
async function generateWardrobeOutfits(userId: string, newItemId: string): Promise<void> {
  try {
    // Get all user items with images
    const allItemsRaw = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, userId));
    if (allItemsRaw.length < 2) return; // Need at least 2 items to make an outfit

    const allItems = await Promise.all(allItemsRaw.map(async (item) => {
      const imgs = await db.select().from(wardrobeItemImages)
        .where(eq(wardrobeItemImages.wardrobeItemId, item.id)).limit(1);
      return { ...item, imageUrl: imgs[0]?.secureUrl || null };
    }));

    // Generate up to 3 outfit suggestions (casual, elegant, professional)
    const occasions = ['casual', 'elegante', 'profesional'];
    for (const occasion of occasions) {
      try {
        const aiResult = await generateOutfit(allItems, occasion, occasion);
        if (!aiResult) continue;

        // Save the generated outfit
        const [savedOutfit] = await db.insert(generatedOutfits).values({
          userId,
          sourceMode: 'wardrobe',
          name: aiResult.name || `Outfit ${occasion}`,
          description: aiResult.description || '',
          score: 90,
        }).returning();

        if (!savedOutfit) continue;

        // Attach items
        const itemsToAttach: any[] = [];
        if (aiResult.topId) itemsToAttach.push({ generatedOutfitId: savedOutfit.id, wardrobeItemId: aiResult.topId, role: 'top' });
        if (aiResult.bottomId) itemsToAttach.push({ generatedOutfitId: savedOutfit.id, wardrobeItemId: aiResult.bottomId, role: 'bottom' });
        if (aiResult.shoesId) itemsToAttach.push({ generatedOutfitId: savedOutfit.id, wardrobeItemId: aiResult.shoesId, role: 'shoes' });
        if (aiResult.outerwearId) itemsToAttach.push({ generatedOutfitId: savedOutfit.id, wardrobeItemId: aiResult.outerwearId, role: 'outerwear' });
        if (aiResult.accessoryId) itemsToAttach.push({ generatedOutfitId: savedOutfit.id, wardrobeItemId: aiResult.accessoryId, role: 'accessory' });

        if (itemsToAttach.length > 0) {
          await db.insert(generatedOutfitItems).values(itemsToAttach);
        }

        // Generate DALL-E image for the combo ASYNCHRONOUSLY
        const selectedIds = itemsToAttach.map((i: any) => i.wardrobeItemId);
        const selectedItems = allItems.filter(i => selectedIds.includes(i.id));
        const colorPalette = [...new Set(selectedItems.map(i => i.primaryColor).filter(Boolean))];

        // Fetch user profile for personalization
        let userGender = null;
        let userAvatar = null;
        try {
          const userRec = await db.select().from(users).where(eq(users.externalAuthId, userId)).limit(1).then(res => res[0]);
          if (userRec) {
            const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userRec.id)).limit(1).then(res => res[0]);
            userGender = profile?.gender;
            userAvatar = profile?.avatarUrl;
          }
        } catch(e) { server.log.error(e); }

        // Fire and forget image generation so it doesn't block UI
        generateOutfitImage(
          savedOutfit.name || `Outfit ${occasion}`,
          savedOutfit.description || savedOutfit.name || '',
          colorPalette as string[],
          [occasion],
          [],
          userGender,
          userAvatar
        ).then(async (imageUrl) => {
          if (imageUrl) {
            await db.update(generatedOutfits)
              .set({ imageUrl } as any)
              .where(eq(generatedOutfits.id, savedOutfit.id));
          }
        }).catch(e => server.log.error(e, 'Async wardrobe image generation failed'));

      } catch (e) {
        server.log.error(e, `Failed to generate outfit for occasion: ${occasion}`);
      }
    }
  } catch (e) {
    server.log.error(e, 'generateWardrobeOutfits failed');
  }
}

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

// Get all wardrobe-generated outfits for the logged-in user (pre-generated, with images + pieces)
server.get('/api/my-outfits', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const myOutfits = await db.select().from(generatedOutfits)
      .where(eq(generatedOutfits.userId, userId))
      .orderBy(generatedOutfits.createdAt);

    // For each outfit, get its items with images
    const outfitsWithItems = await Promise.all(myOutfits.map(async (outfit) => {
      const items = await db.select({
        id: generatedOutfitItems.id,
        wardrobeItemId: generatedOutfitItems.wardrobeItemId,
        role: generatedOutfitItems.role,
      }).from(generatedOutfitItems)
        .where(eq(generatedOutfitItems.generatedOutfitId, outfit.id));

      const itemsWithImages = await Promise.all(items.map(async (item) => {
        if (!item.wardrobeItemId) return null;
        const [wItem] = await db.select().from(wardrobeItems)
          .where(eq(wardrobeItems.id, item.wardrobeItemId)).limit(1);
        const [img] = await db.select().from(wardrobeItemImages)
          .where(eq(wardrobeItemImages.wardrobeItemId, item.wardrobeItemId)).limit(1);
        return wItem ? { ...wItem, imageUrl: img?.secureUrl || null, role: item.role } : null;
      }));

      return {
        ...outfit,
        collageItems: itemsWithImages.filter(Boolean),
      };
    }));

    return { success: true, data: outfitsWithItems };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch your outfits' });
  }
});

// Combined "all outfits" view: catalog templates + user's generated outfits
server.get('/api/all-outfits', async (request, reply) => {
  try {
    const { userId } = getAuth(request);

    // Catalog outfits (public)
    const catalog = await db.select().from(outfitTemplates).where(eq(outfitTemplates.isActive, true));

    // User's generated outfits (if logged in)
    let generated: any[] = [];
    if (userId) {
      generated = await db.select().from(generatedOutfits)
        .where(eq(generatedOutfits.userId, userId));
    }

    const allOutfits = [
      ...catalog.map(o => ({ ...o, source: 'catalog' as const })),
      ...generated.map(o => ({ ...o, source: 'wardrobe' as const })),
    ];

    return { success: true, data: allOutfits };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch outfits' });
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

    let existing = null;
    if (templateId) {
      const [fav] = await db.select().from(outfitFavorites).where(and(eq(outfitFavorites.userId, userId), eq(outfitFavorites.templateOutfitId, templateId))).limit(1);
      existing = fav;
    } else if (generatedOutfitId) {
      const [fav] = await db.select().from(outfitFavorites).where(and(eq(outfitFavorites.userId, userId), eq(outfitFavorites.generatedOutfitId, generatedOutfitId))).limit(1);
      existing = fav;
    }

    if (existing) {
      // Toggle off
      await db.delete(outfitFavorites).where(eq(outfitFavorites.id, existing.id));
      return { success: true, removed: true };
    }

    // Toggle on
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
    const fullFavs = await Promise.all(favs.map(async (f) => {
      let outfit = null;
      if (f.templateOutfitId) {
        const [t] = await db.select().from(outfitTemplates).where(eq(outfitTemplates.id, f.templateOutfitId));
        if (t) outfit = { ...t, source: 'catalog' };
      } else if (f.generatedOutfitId) {
        const [g] = await db.select().from(generatedOutfits).where(eq(generatedOutfits.id, f.generatedOutfitId));
        if (g) {
          const items = await db.select().from(generatedOutfitItems).where(eq(generatedOutfitItems.generatedOutfitId, g.id));
          const withImages = await Promise.all(items.map(async (item) => {
             if (!item.wardrobeItemId) return null;
             const [wi] = await db.select().from(wardrobeItems).where(eq(wardrobeItems.id, item.wardrobeItemId));
             const imgs = await db.select().from(wardrobeItemImages).where(eq(wardrobeItemImages.wardrobeItemId, item.wardrobeItemId)).limit(1);
             return { id: item.wardrobeItemId, name: wi?.name || '', category: wi?.category || '', imageUrl: imgs[0]?.secureUrl || null };
          }));
          outfit = { ...g, source: 'wardrobe', collageItems: withImages.filter(Boolean) };
        }
      }
      return { ...f, outfit };
    }));
    return { success: true, data: fullFavs.filter(f => f.outfit) };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch favorites' });
  }
});

server.get('/api/profile', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    let user = await db.select().from(users).where(eq(users.externalAuthId, userId)).limit(1).then(res => res[0]);
    if (!user) {
      const [newUser] = await db.insert(users).values({ externalAuthId: userId, email: userId + '@placeholder.com' }).returning();
      user = newUser;
    }
    if (!user) throw new Error("Failed to create user");
    
    let profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1).then(res => res[0]);
    if (!profile) {
      const [newProfile] = await db.insert(userProfiles).values({ userId: user.id }).returning();
      profile = newProfile;
    }

    return { success: true, data: profile };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch profile' });
  }
});

server.put('/api/profile', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const body = request.body as { gender?: string, avatarUrl?: string };

    let user = await db.select().from(users).where(eq(users.externalAuthId, userId)).limit(1).then(res => res[0]);
    if (!user) {
      const [newUser] = await db.insert(users).values({ externalAuthId: userId, email: userId + '@placeholder.com' }).returning();
      user = newUser;
    }
    if (!user) throw new Error("Failed to create user");

    let finalAvatarUrl = body.avatarUrl;
    if (body.avatarUrl && body.avatarUrl.startsWith('data:image')) {
      const uploadRes = await cloudinary.uploader.upload(body.avatarUrl, {
        folder: 'dianis_avatars',
        resource_type: 'image'
      });
      finalAvatarUrl = uploadRes.secure_url;
    }

    const insertValues: { userId: string; gender?: string; avatarUrl?: string } = { userId: user.id };
    if (body.gender !== undefined) insertValues.gender = body.gender;
    if (finalAvatarUrl !== undefined) insertValues.avatarUrl = finalAvatarUrl;

    const setValues: { gender?: string; avatarUrl?: string } = {};
    if (body.gender !== undefined) setValues.gender = body.gender;
    if (finalAvatarUrl !== undefined) setValues.avatarUrl = finalAvatarUrl;

    if (Object.keys(setValues).length === 0) {
      return { success: true, data: null };
    }

    const [updatedProfile] = await db.insert(userProfiles).values(insertValues).onConflictDoUpdate({
      target: userProfiles.userId,
      set: setValues
    }).returning();

    return { success: true, data: updatedProfile };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to update profile' });
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

// ─── Style Reactions (like/dislike) ───────────────────────────────
server.post('/api/reactions', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });
    const { templateId, reaction } = request.body as { templateId: string; reaction: 'like' | 'dislike' };
    if (!templateId || !['like', 'dislike'].includes(reaction)) {
      return reply.status(400).send({ success: false, error: 'Invalid payload' });
    }
    // Upsert reaction
    const existing = await db.select().from(styleReactions)
      .where(and(eq(styleReactions.userId, userId), eq(styleReactions.templateOutfitId, templateId)))
      .limit(1);
    if (existing.length > 0) {
      if (existing[0]!.reaction === reaction) {
        // Toggle off
        await db.delete(styleReactions)
          .where(and(eq(styleReactions.userId, userId), eq(styleReactions.templateOutfitId, templateId)));
        return { success: true, removed: true };
      }
      await db.update(styleReactions)
        .set({ reaction })
        .where(and(eq(styleReactions.userId, userId), eq(styleReactions.templateOutfitId, templateId)));
    } else {
      await db.insert(styleReactions).values({ userId, templateOutfitId: templateId, reaction });
    }
    return { success: true, reaction };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to save reaction' });
  }
});

server.get('/api/reactions', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });
    const reactions = await db.select().from(styleReactions).where(eq(styleReactions.userId, userId));
    return { success: true, data: reactions };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch reactions' });
  }
});

// ─── Style Quiz ────────────────────────────────────────────────────
server.post('/api/quiz', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });
    const { answers } = request.body as { answers: Record<string, string | string[]> };
    // Build style profile from quiz answers
    const styleProfile = {
      ...answers,
      completedAt: new Date().toISOString(),
    };
    // Find user record
    const [userRec] = await db.select().from(users).where(eq(users.externalAuthId, userId)).limit(1);
    if (!userRec) return reply.status(404).send({ success: false, error: 'User not found' });
    // Upsert profile
    const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userRec.id)).limit(1);
    if (existing.length > 0) {
      await db.update(userProfiles)
        .set({ styleProfile, quizCompleted: true } as any)
        .where(eq(userProfiles.userId, userRec.id));
    } else {
      await db.insert(userProfiles).values({ userId: userRec.id, styleProfile, quizCompleted: true } as any);
    }
    return { success: true };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to save quiz' });
  }
});

// ─── Cron Job Trigger (Secret endpoint for testing/manual generation) ────
server.post('/api/trigger-cron', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    // Optional: add admin check here based on user ID if desired
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });
    
    // Run asynchronously so we don't block the HTTP response
    // (since image generation takes ~20 seconds)
    generateAndSaveNewOutfit('femenino').catch(e => server.log.error(e));
    generateAndSaveNewOutfit('masculino').catch(e => server.log.error(e));
    
    return { success: true, message: 'Cron job manually triggered. Generating outfits in background...' };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to trigger cron' });
  }
});

const start = async () => {
  try {
    // Initialize scheduled automated tasks
    initCronJobs();

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server running at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
