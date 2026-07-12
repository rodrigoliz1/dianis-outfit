import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const sql = neon(process.env.DATABASE_URL!);
const FAL_KEY = process.env.FAL_KEY!;

const maleOutfits = [
  // Casual
  { slug: 'casual-urbano-hombre', name: 'Casual Urbano', description: 'Look relajado y moderno para el día a día en la ciudad. Jeans slim fit, playera lisa y zapatillas premium.', occasionTags: ['dia-casual', 'hacer-mandados', 'ir-de-compras'], styleTags: ['casual', 'urbano', 'moderno'], colorPalette: ['azul marino', 'blanco', 'gris'], formalityScore: 2 },
  { slug: 'streetwear-premium', name: 'Streetwear Premium', description: 'Estilo urbano elevado con hoodie estructurado, cargo pants y sneakers de edición limitada.', occasionTags: ['dia-casual', 'concierto', 'festival'], styleTags: ['streetwear', 'urban', 'bold'], colorPalette: ['negro', 'gris oscuro', 'blanco'], formalityScore: 1 },
  { slug: 'campus-masculino', name: 'Campus Masculino', description: 'Outfit universitario fresco: chinos beige, polo bien planchado y loafers.', occasionTags: ['universidad', 'biblioteca', 'dia-casual'], styleTags: ['preppy', 'casual pulido', 'académico'], colorPalette: ['beige', 'navy', 'blanco'], formalityScore: 2 },
  { slug: 'weekend-warrior', name: 'Weekend Warrior', description: 'Perfecto para el fin de semana: shorts chinos, playera gráfica y sandalias de cuero.', occasionTags: ['dia-casual', 'cafe', 'brunch'], styleTags: ['casual', 'relajado', 'verano'], colorPalette: ['khaki', 'azul cielo', 'blanco'], formalityScore: 1 },
  
  // Trabajo / Smart Casual
  { slug: 'smart-casual-masculino', name: 'Smart Casual Ejecutivo', description: 'Pantalón chino bien cortado, camisa Oxford y mocasines. Listo para la oficina sin sacrificar estilo.', occasionTags: ['oficina', 'reunion-trabajo', 'evento-profesional'], styleTags: ['smart casual', 'ejecutivo', 'profesional'], colorPalette: ['azul marino', 'blanco', 'beige'], formalityScore: 3 },
  { slug: 'oficina-creativa-hombre', name: 'Oficina Creativa', description: 'Para el hombre que trabaja en un ambiente creativo: blazer casual, jeans oscuros y Chelsea boots.', occasionTags: ['trabajo-creativo', 'oficina', 'evento-profesional'], styleTags: ['smart casual', 'creativo', 'moderno'], colorPalette: ['negro', 'gris', 'azul pizarra'], formalityScore: 3 },
  { slug: 'business-casual-hombre', name: 'Business Casual Clásico', description: 'Camisa de vestir sin corbata, pantalón de vestir slim y zapatos Oxford. Profesional y accesible.', occasionTags: ['reunion-trabajo', 'entrevista', 'cena-de-negocios'], styleTags: ['business casual', 'clásico', 'profesional'], colorPalette: ['gris carbón', 'celeste', 'beige'], formalityScore: 4 },
  
  // Formal
  { slug: 'traje-slim-hombre', name: 'Traje Slim Moderno', description: 'Traje slim fit en azul marino con corbata sutil. La elegancia masculina en su máxima expresión.', occasionTags: ['boda-de-dia', 'gala', 'etiqueta', 'evento-profesional'], styleTags: ['formal', 'clásico', 'elegante'], colorPalette: ['azul marino', 'blanco', 'plateado'], formalityScore: 5 },
  { slug: 'tuxedo-nocturno', name: 'Tuxedo Nocturno', description: 'Esmoquin negro con camisa blanca y pajarita. El código de vestimenta más impactante para la noche.', occasionTags: ['boda-de-noche', 'gala', 'etiqueta', 'coctel'], styleTags: ['formal', 'elegante', 'clásico'], colorPalette: ['negro', 'blanco', 'dorado'], formalityScore: 5 },
  { slug: 'blazer-sin-corbata', name: 'Blazer Refinado', description: 'Blazer estructurado, pantalón slim y camisa sin corbata para eventos de dress code semi-formal.', occasionTags: ['coctel', 'cumpleanos', 'cena-formal', 'boda-de-dia'], styleTags: ['semi-formal', 'moderno', 'elegante'], colorPalette: ['azul pizarra', 'blanco', 'gris'], formalityScore: 4 },
  
  // Noche
  { slug: 'noche-urbana-hombre', name: 'Noche Urbana', description: 'Jeans negros, camisa entallada y botas de cuero. El outfit perfecto para salir de noche.', occasionTags: ['noche-casual', 'antro-club', 'concierto'], styleTags: ['casual elegante', 'nocturno', 'urbano'], colorPalette: ['negro', 'gris oscuro', 'borgoña'], formalityScore: 3 },
  { slug: 'velada-masculina', name: 'Velada con Estilo', description: 'Camisa de lino abierta, pantalón de vestir y mocasines. Sofisticado sin esfuerzo.', occasionTags: ['cena', 'cena-playa', 'rooftop', 'noche-casual'], styleTags: ['smart casual', 'mediterráneo', 'verano'], colorPalette: ['blanco roto', 'azul marino', 'arena'], formalityScore: 3 },
  
  // Playa / Resort
  { slug: 'resort-hombre', name: 'Resort Caribeño', description: 'Camisa de lino floral, shorts elegantes y sandalias de cuero. Vacaciones con clase.', occasionTags: ['playa', 'resort', 'comida-playa', 'alberca'], styleTags: ['resort', 'verano', 'tropical'], colorPalette: ['blanco', 'azul cielo', 'verde salvia'], formalityScore: 1 },
  { slug: 'dia-playa-hombre', name: 'Día de Playa', description: 'Traje de baño premium, camisa abierta de playa y flip-flops de cuero. Relajado y estiloso.', occasionTags: ['playa', 'alberca', 'dia-caluroso', 'comida-playa'], styleTags: ['beach', 'casual', 'verano'], colorPalette: ['navy', 'blanco', 'coral'], formalityScore: 1 },

  // Athleisure / Deportivo
  { slug: 'athleisure-hombre', name: 'Athleisure Elite', description: 'Joggers premium, hoodie estructurado y sneakers de diseñador. Cómodo pero impecable.', occasionTags: ['dia-deportivo', 'dia-casual', 'hacer-mandados'], styleTags: ['athleisure', 'deportivo', 'moderno'], colorPalette: ['gris perla', 'negro', 'blanco'], formalityScore: 1 },

  // Clima frío
  { slug: 'capas-invierno-hombre', name: 'Capas de Invierno', description: 'Abrigo trench, sweater de cachemir, jeans oscuros y botas Chelsea. El invierno más elegante.', occasionTags: ['dia-frio', 'dia-casual', 'aeropuerto', 'oficina'], styleTags: ['invierno', 'capas', 'clásico'], colorPalette: ['camel', 'gris', 'navy', 'crema'], formalityScore: 3 },
  { slug: 'lluvia-masculina', name: 'Lluvia Refinada', description: 'Gabardina impermeable, sweater y botas de cuero. Elegante incluso bajo la lluvia.', occasionTags: ['dia-lluvioso', 'dia-casual', 'oficina'], styleTags: ['funcional', 'elegante', 'outerwear'], colorPalette: ['azul marino', 'gris', 'camel'], formalityScore: 3 },

  // Viaje / Aeropuerto
  { slug: 'aeropuerto-hombre', name: 'Aeropuerto Casual', description: 'Joggers ajustados, hoodie premium, sneakers de lujo y mochila de cuero. Viaja con estilo.', occasionTags: ['aeropuerto', 'viaje', 'road-trip'], styleTags: ['travel', 'cómodo', 'moderno'], colorPalette: ['gris oscuro', 'negro', 'blanco'], formalityScore: 2 },

  // Graduación
  { slug: 'graduacion-hombre', name: 'Graduación Impecable', description: 'Traje de gala bien cortado para el día más importante de tu vida académica.', occasionTags: ['graduacion-propia', 'evento-profesional', 'gala'], styleTags: ['formal', 'especial', 'clásico'], colorPalette: ['azul marino', 'gris carbón', 'blanco'], formalityScore: 5 },
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImage(prompt: string): Promise<string | null> {
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt.substring(0, 950), image_size: 'square_hd', num_inference_steps: 4 })
  });
  const data = await res.json();
  if (res.ok) return data.images?.[0]?.url || null;
  console.error('  ❌ Fal error:', data.detail || JSON.stringify(data));
  return null;
}

async function main() {
  console.log(`📦 Inserting ${maleOutfits.length} male outfit templates...\n`);

  for (const [i, outfit] of maleOutfits.entries()) {
    console.log(`[${i + 1}/${maleOutfits.length}] ${outfit.name} (${outfit.slug})`);
    
    // Insert outfit
    await sql`
      INSERT INTO outfit_templates (slug, name, description, occasion_tags, style_tags, color_palette, formality_score, gender, is_active)
      VALUES (
        ${outfit.slug},
        ${outfit.name},
        ${outfit.description},
        ${outfit.occasionTags},
        ${outfit.styleTags},
        ${outfit.colorPalette},
        ${outfit.formalityScore},
        'masculino',
        true
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        gender = 'masculino',
        is_active = true
    `;

    // Generate image
    const colors = outfit.colorPalette.slice(0, 3).join(', ');
    const styles = outfit.styleTags.slice(0, 2).join(', ');
    const occasion = outfit.occasionTags.slice(0, 2).join(' y ');
    const prompt = `High-quality fashion editorial photograph of a stylish man wearing a complete outfit. Occasion: ${occasion}. Style: ${styles}. Colors: ${colors}. The outfit is called "${outfit.name}". Professional men's fashion photography, clean studio or lifestyle background, natural male model pose, magazine quality.`;

    const imageUrl = await generateImage(prompt);
    if (imageUrl) {
      await sql`UPDATE outfit_templates SET image_url = ${imageUrl} WHERE slug = ${outfit.slug}`;
      console.log(`  ✅ Image saved`);
    } else {
      console.log(`  ⚠️ No image, continuing...`);
    }

    if (i < maleOutfits.length - 1) await sleep(3000);
  }

  console.log(`\n✅ Done! ${maleOutfits.length} male outfits created.`);
}

main().catch(console.error);
