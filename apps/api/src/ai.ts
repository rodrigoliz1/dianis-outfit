import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeWardrobeItem(imageUrl: string) {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Eres un estilista experto y curador de moda de alta costura. Tu tarea es analizar minuciosamente la prenda en la imagen y clasificarla con precisión absoluta. Ignora el fondo y enfócate en la prenda principal. Devuelve ÚNICAMENTE un objeto JSON con las siguientes claves estrictas:\n1. 'category' (Solo una: tops, bottoms, dresses, outerwear, shoes, accessories).\n2. 'colorFamily' (El color dominante, ej: azul marino, terracota, beige, negro).\n3. 'weatherTags' (Arreglo con opciones según tela/corte: caluroso, templado, frio, lluvioso).\n4. 'styleTags' (Arreglo de 2-4 strings, ej: casual, elegante, boho, athleisure, minimalista, urbano, romántico, profesional, vintage)."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analiza esta prenda." },
            { type: "image_url", image_url: { url: imageUrl } },
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
      colorFamily: analysis.colorFamily || "unknown",
      weatherTags: analysis.weatherTags || [],
      styleTags: analysis.styleTags || [],
    };
  } catch (error) {
    console.error("Error analyzing image with AI:", error);
    // Return fallback values in case of failure
    return {
      category: "tops",
      colorFamily: "unknown",
      weatherTags: [],
      styleTags: [],
    };
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
          content: `Ocasión: ${occasion}\nEstilo: ${style}\n\nPrendas disponibles:\n${JSON.stringify(wardrobeItems.map(i => ({ id: i.id, category: i.category, colorFamily: i.colorFamily, tags: i.occasionTags })), null, 2)}`
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
