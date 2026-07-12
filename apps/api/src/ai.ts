import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure Cloudinary (safe to call multiple times — idempotent)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export async function analyzeWardrobeItem(imageUrl: string) {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Eres un estilista experto en moda latinoamericana y alta costura con 20 años de experiencia. 
Analiza DETALLADAMENTE la prenda en la imagen. Ignora el fondo, modelos y accesorios secundarios. Enfócate en la prenda principal.

Devuelve ÚNICAMENTE un objeto JSON válido con estas claves exactas:
- "category": UNA de estas categorías exactas: "tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories"
- "subcategory": Subcategoría específica (ej: "blusa", "camiseta", "suéter", "jeans", "pantalón formal", "falda midi", "vestido casual", "vestido de noche", "chaqueta", "abrigo", "tenis", "tacones", "botas", "bolso tote", "cartera", "cinturón", "collar")
- "name": Nombre descriptivo y elegante de la prenda en español (ej: "Blusa de seda beige", "Jeans de tiro alto azul marino")
- "brand": Marca visible en la prenda o etiqueta. Si no se ve ninguna marca, pon null
- "colorFamily": Color dominante principal en español, muy específico (ej: "azul marino", "rosa palo", "beige tostado", "negro mate", "blanco marfil", "verde oliva", "terracota", "mostaza")
- "primaryColorHex": Código hexadecimal aproximado del color dominante (ej: "#2C3E50")
- "pattern": Tipo de estampado: "liso", "rayas", "cuadros", "floral", "animal print", "geométrico", "tie-dye", "bordado" o null si es liso
- "materials": Array con materiales identificados (ej: ["algodón", "poliéster"]) - dedúcelo de la textura visual
- "fit": Silueta del corte: "ajustado", "regular", "holgado", "oversized", "bodycon", "A-line", "recto"
- "formalityScore": Número del 1 al 5 (1=muy casual, 5=muy formal)
- "weatherTags": Array con opciones aplicables: "caluroso", "templado", "frío", "lluvioso"
- "styleTags": Array de 2 a 5 estilos: "casual", "formal", "elegante", "boho", "minimalista", "urbano", "romántico", "athleisure", "vintage", "preppy", "chic", "profesional", "festivo"
- "seasons": Array con temporadas aplicables: "primavera", "verano", "otoño", "invierno"

Sé muy específico y preciso. Si algo no es visible con certeza, proporciona tu mejor estimación basada en lo visible.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analiza esta prenda con el máximo detalle posible." },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content from OpenAI");

    const analysis = JSON.parse(content);
    return {
      category: analysis.category || "tops",
      subcategory: analysis.subcategory || null,
      name: analysis.name || "Mi Prenda",
      brand: analysis.brand || null,
      colorFamily: analysis.colorFamily || "unknown",
      primaryColorHex: analysis.primaryColorHex || null,
      pattern: analysis.pattern || "liso",
      materials: analysis.materials || [],
      fit: analysis.fit || null,
      formalityScore: analysis.formalityScore || 2,
      weatherTags: analysis.weatherTags || [],
      styleTags: analysis.styleTags || [],
      seasons: analysis.seasons || [],
    };
  } catch (error) {
    console.error("Error analyzing image with AI:", error);
    return {
      category: "tops",
      subcategory: null,
      name: "Mi Prenda",
      brand: null,
      colorFamily: "unknown",
      primaryColorHex: null,
      pattern: "liso",
      materials: [],
      fit: null,
      formalityScore: 2,
      weatherTags: [],
      styleTags: [],
      seasons: [],
    };
  }
}

/**
 * Generate a fashion outfit image using DALL-E 3.
 * Uploads the result to Cloudinary and returns the secure URL.
 */
export async function generateOutfitImage(
  outfitName: string,
  description: string,
  colorPalette: string[],
  styleTags: string[],
  occasionTags: string[],
  userGender?: string | null,
  userAvatarUrl?: string | null
): Promise<string | null> {
  try {
    const colors = colorPalette?.slice(0, 4).join(", ") || "neutros elegantes";
    const styles = styleTags?.slice(0, 3).join(", ") || "moderno";
    const occasion = occasionTags?.slice(0, 2).join(" y ") || "ocasión especial";

    let prompt = "";
    if (userGender) {
      const genderStr = userGender.toLowerCase() === "masculino" ? "man" : userGender.toLowerCase() === "femenino" ? "woman" : "person";
      prompt = `High-quality fashion editorial photograph of a realistic ${genderStr} modeling a complete outfit for ${occasion}.
Style: ${styles}. Color palette: ${colors}.
Outfit concept: "${outfitName}" — ${description}
The model should be posing naturally against a clean studio background or aesthetic street setting. Fashion magazine quality, professional lighting.`;
    } else {
      prompt = `High-quality fashion editorial photograph of a complete outfit styled for ${occasion}.
Style: ${styles}. Color palette: ${colors}.
Outfit concept: "${outfitName}" — ${description}
The photo should show the full outfit displayed in a flatlay or on a mannequin against a clean white or soft cream background.
Fashion magazine quality, professional studio lighting, elegant composition. No faces, no people — only the clothing arranged beautifully.`;
    }

    // DALL-E API is disabled due to missing credits (Tier 0). Returning static image.
    // Uncomment the below code to re-enable DALL-E generation.
    /*
    const imageResponse = await openai.images.generate({
      model: "dall-e-2",
      prompt: prompt.substring(0, 950), // limit for dall-e-2
      n: 1,
      size: "1024x1024",
    });

    const dalleUrl = imageResponse.data?.[0]?.url ?? null;
    if (!dalleUrl) throw new Error("No image URL from DALL-E");

    // Upload to Cloudinary for permanent storage
    const uploadResult = await cloudinary.uploader.upload(dalleUrl, {
      folder: "dianis-outfit/outfits",
      transformation: [{ quality: "auto:good", fetch_format: "auto" }],
    });

    return uploadResult.secure_url;
    */

    return "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop";
  } catch (error) {
    console.error("Error generating outfit image with DALL-E:", error);
    return "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop";
  }
}

export async function generateOutfit(wardrobeItems: any[], occasion: string, style: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un estilista personal de alto nivel. Se te proporcionará una lista de prendas del usuario en formato JSON. Selecciona las prendas (por ID) que forman el mejor outfit para la ocasión y estilo solicitados. Devuelve únicamente un JSON con las claves: 'name' (nombre creativo del outfit), 'description' (por qué funciona), 'topId', 'bottomId', 'shoesId' (y opcional 'outerwearId', 'accessoryId'). Si no hay prendas suficientes, usa las que mejor se adapten y deja nulos los demás."
        },
        {
          role: "user",
          content: `Ocasión: ${occasion}\nEstilo: ${style}\n\nPrendas disponibles:\n${JSON.stringify(wardrobeItems.map(i => ({ id: i.id, name: i.name, category: i.category, subcategory: i.subcategory, colorFamily: i.primaryColor, tags: i.styleTags })), null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content from OpenAI");

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating outfit:", error);
    return null;
  }
}
