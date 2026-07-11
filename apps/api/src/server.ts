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
import { analyzeWardrobeItem, generateOutfit } from './ai.js';
import { generatedOutfits, generatedOutfitItems, outfitFavorites, wearHistory } from '@dianis/database';



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

server.register(clerkPlugin);

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
    
    // Upload to Cloudinary
    const cloudinaryResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'dianis-outfit/wardrobe' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    }) as any;

    // Analyze with AI
    let analysis = { category: 'tops', colorFamily: 'unknown', weatherTags: [], styleTags: [] };
    try {
      analysis = await analyzeWardrobeItem(cloudinaryResponse.secure_url);
    } catch (e) {
      server.log.error(e as Error, "AI Analysis failed");
    }

    return { success: true, data: { imageUrl: cloudinaryResponse.secure_url, analysis } };
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

    return { success: true, data: newItem };
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

    const items = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, userId));
    return { success: true, data: items };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch wardrobe' });
  }
});

server.post('/api/outfits/generate', async (request, reply) => {
  try {
    const { userId } = getAuth(request);
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });

    const body = request.body as { occasion: string, style: string };
    
    // Fetch user's wardrobe
    const userItems = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, userId));
    
    if (userItems.length < 2) {
      return reply.status(400).send({ success: false, error: 'Not enough items in wardrobe to generate an outfit' });
    }

    const aiResult = await generateOutfit(userItems, body.occasion, body.style);
    
    if (!aiResult) {
      return reply.status(500).send({ success: false, error: 'Failed to generate outfit' });
    }

    // Save generated outfit to DB
    const [newOutfit] = await db.insert(generatedOutfits).values({
      userId,
      sourceMode: 'curated',
      name: aiResult.name,
      description: aiResult.description,
      score: 100
    }).returning();

    // Attach items
    const itemsToAttach = [];
    if (newOutfit && aiResult.topId) itemsToAttach.push({ generatedOutfitId: newOutfit.id, wardrobeItemId: aiResult.topId });
    if (newOutfit && aiResult.bottomId) itemsToAttach.push({ generatedOutfitId: newOutfit.id, wardrobeItemId: aiResult.bottomId });
    if (newOutfit && aiResult.shoesId) itemsToAttach.push({ generatedOutfitId: newOutfit.id, wardrobeItemId: aiResult.shoesId });
    
    if (itemsToAttach.length > 0) {
      await db.insert(generatedOutfitItems).values(itemsToAttach);
    }

    return { success: true, data: { ...newOutfit, aiResult } };
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Generation failed' });
  }
});

server.get('/api/outfits/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    
    // Check if it's a template
    const template = await db.select().from(outfitTemplates).where(or(eq(outfitTemplates.id, id), eq(outfitTemplates.slug, id))).limit(1);
    
    if (template.length > 0) {
      return { success: true, data: template[0] };
    }
    
    // Check if it's generated
    const generated = await db.select().from(generatedOutfits).where(eq(generatedOutfits.id, id)).limit(1);
    
    if (generated.length > 0) {
      return { success: true, data: generated[0] };
    }
    
    return reply.status(404).send({ success: false, error: 'Outfit not found' });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: 'Failed to fetch outfit' });
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
