import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
const sql = neon(process.env.DATABASE_URL!);

const occasionImageMap: Record<string, string> = {
  // Casual / Diario
  'brunch-dorado': 'https://images.unsplash.com/photo-1434389678232-067562c13a05?q=80&w=800&auto=format&fit=crop',
  'paseo-ciudad': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop',
  'mandados-con-estilo': 'https://images.unsplash.com/photo-1550614000-4b95d466f20b?q=80&w=800&auto=format&fit=crop',
  'cafe-con-encanto': 'https://images.unsplash.com/photo-1485230895905-ef2540b7d7f7?q=80&w=800&auto=format&fit=crop',
  
  // Trabajo / Oficina
  'oficina-minimalista': 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=800&auto=format&fit=crop',
  'oficina-creativa': 'https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=800&auto=format&fit=crop',
  'presentacion-impecable': 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop',
  'reunion-ejecutiva': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop',

  // Noche / Fiesta
  'noche-glam': 'https://images.unsplash.com/photo-1566207274740-0f8cf6b7d5a5?q=80&w=800&auto=format&fit=crop',
  'coctel-negro-oro': 'https://images.unsplash.com/photo-1572804013309-8c98e1694f26?q=80&w=800&auto=format&fit=crop',
  'noche-amigas': 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop',
  'cena-romantica': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800&auto=format&fit=crop',

  // Formal / Eventos
  'boda-dia': 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=800&auto=format&fit=crop',
  'boda-noche': 'https://images.unsplash.com/photo-1550928431-ee0ec6db30d3?q=80&w=800&auto=format&fit=crop',
  'gala-esmeralda': 'https://images.unsplash.com/photo-1560457099-64cb8a5eb50c?q=80&w=800&auto=format&fit=crop',
  'cena-formal-borgona': 'https://images.unsplash.com/photo-1566207274740-0f8cf6b7d5a5?q=80&w=800&auto=format&fit=crop',

  // Clima Específico / Especiales
  'capas-invierno': 'https://images.unsplash.com/photo-1516314704040-9a28bfcc11f7?q=80&w=800&auto=format&fit=crop',
  'lino-verano': 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800&auto=format&fit=crop',
  'dia-playa': 'https://images.unsplash.com/photo-1507680434267-3256ba765f0e?q=80&w=800&auto=format&fit=crop',
  'lluvia-refinada': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop'
};

const defaultImage = 'https://images.unsplash.com/photo-1485230895905-ef2540b7d7f7?q=80&w=800&auto=format&fit=crop';

async function main() {
  console.log("Asignando imágenes de stock a outfits preseleccionados...");
  
  const templates = await sql`SELECT id, slug FROM outfit_templates`;
  
  for (const template of templates) {
    const imageUrl = occasionImageMap[template.slug] || defaultImage;
    await sql`UPDATE outfit_templates SET image_url = ${imageUrl} WHERE id = ${template.id}`;
    console.log(`Asignado: ${template.slug} -> ${imageUrl}`);
  }
  
  console.log("¡Imágenes asignadas exitosamente!");
}

main().catch(console.error);
