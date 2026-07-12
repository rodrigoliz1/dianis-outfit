import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, real } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enum simulation for Roles
export const roleEnum = ['owner', 'admin'] as const;

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalAuthId: text('external_auth_id').unique().notNull(), // Clerk User ID
  email: text('email').unique().notNull(),
  role: text('role', { enum: roleEnum }).default('owner').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  preferredName: text('preferred_name'),
  gender: text('gender'), // 'masculino', 'femenino', 'otro', etc.
  avatarUrl: text('avatar_url'), // Cloudinary URL for realistic avatar
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  favoriteColors: text('favorite_colors').array(),
  avoidedColors: text('avoided_colors').array(),
  favoriteStyles: text('favorite_styles').array(),
  heelPreference: text('heel_preference'),
  metalPreference: text('metal_preference'),
  comfortPreference: text('comfort_preference'),
  makeupSuggestionsEnabled: boolean('makeup_suggestions_enabled').default(false),
  hairSuggestionsEnabled: boolean('hair_suggestions_enabled').default(false),
  repeatFrequencyPreference: text('repeat_frequency_preference'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const wardrobeItems = pgTable('wardrobe_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID (e.g. user_XXXX)
  name: text('name').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  brand: text('brand'),
  description: text('description'),
  primaryColor: text('primary_color'),
  primaryColorHex: text('primary_color_hex'),
  secondaryColors: text('secondary_colors').array(),
  pattern: text('pattern'),
  textures: text('textures').array(),
  materials: jsonb('materials'), // Array of objects
  fit: text('fit'),
  silhouette: text('silhouette'),
  sleeveLength: text('sleeve_length'),
  neckline: text('neckline'),
  garmentLength: text('garment_length'),
  rise: text('rise'),
  legShape: text('leg_shape'),
  closure: text('closure'),
  heelType: text('heel_type'),
  heelHeightCm: real('heel_height_cm'),
  toeShape: text('toe_shape'),
  size: text('size'),
  formalityScore: integer('formality_score'), // 1 to 5
  warmthScore: integer('warmth_score'), // 1 to 5
  comfortScore: integer('comfort_score'), // 1 to 5
  seasons: text('seasons').array(),
  weatherTags: text('weather_tags').array(),
  occasionTags: text('occasion_tags').array(),
  styleTags: text('style_tags').array(),
  matchingColors: text('matching_colors').array(),
  isStatementPiece: boolean('is_statement_piece').default(false),
  isBasic: boolean('is_basic').default(false),
  isFavorite: boolean('is_favorite').default(false),
  status: text('status').default('available').notNull(), // available, laundry, borrowed, etc
  location: text('location'),
  careInstructions: jsonb('care_instructions'), // { washing, drying, ironing, dryCleaning, notes }
  personalNotes: text('personal_notes'),
  lastWornAt: timestamp('last_worn_at'),
  wearCount: integer('wear_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // soft delete
});

export const wardrobeItemImages = pgTable('wardrobe_item_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  wardrobeItemId: uuid('wardrobe_item_id').references(() => wardrobeItems.id, { onDelete: 'cascade' }).notNull(),
  cloudinaryPublicId: text('cloudinary_public_id').notNull(),
  secureUrl: text('secure_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  width: integer('width'),
  height: integer('height'),
  format: text('format'),
  bytes: integer('bytes'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiAnalysisJobs = pgTable('ai_analysis_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID
  imageId: text('image_id'), // Public ID of the analyzed image
  provider: text('provider').default('openai').notNull(),
  model: text('model').notNull(),
  status: text('status').default('pending').notNull(), // pending, completed, failed
  rawResponse: jsonb('raw_response'),
  validatedResult: jsonb('validated_result'),
  overallConfidence: real('overall_confidence'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const occasions = pgTable('occasions', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  group: text('group').notNull(),
  description: text('description'),
  formalityMin: integer('formality_min').notNull(),
  formalityMax: integer('formality_max').notNull(),
  requiredCategories: text('required_categories').array(),
  optionalCategories: text('optional_categories').array(),
  timeTags: text('time_tags').array(),
  weatherTags: text('weather_tags').array(),
  styleTags: text('style_tags').array(),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const outfitTemplates = pgTable('outfit_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  imagePublicId: text('image_public_id'),
  imagePrompt: text('image_prompt'),
  formalityScore: integer('formality_score'),
  comfortScore: integer('comfort_score'),
  occasionTags: text('occasion_tags').array(),
  styleTags: text('style_tags').array(),
  weatherTags: text('weather_tags').array(),
  timeTags: text('time_tags').array(),
  colorPalette: text('color_palette').array(),
  hairSuggestion: text('hair_suggestion'),
  makeupSuggestion: text('makeup_suggestion'),
  stylingTips: text('styling_tips'),
  gender: text('gender').default('femenino').notNull(), // 'masculino', 'femenino'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const outfitTemplatePieces = pgTable('outfit_template_pieces', {
  id: uuid('id').defaultRandom().primaryKey(),
  outfitTemplateId: uuid('outfit_template_id').references(() => outfitTemplates.id, { onDelete: 'cascade' }).notNull(),
  pieceType: text('piece_type').notNull(), // upper, lower, shoes, layer, bag, accessory
  name: text('name').notNull(),
  category: text('category'),
  subcategory: text('subcategory'),
  color: text('color'),
  materials: text('materials').array(),
  description: text('description'),
  isRequired: boolean('is_required').default(true),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const generatedOutfits = pgTable('generated_outfits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID
  sourceMode: text('source_mode').notNull(), // 'curated' or 'wardrobe'
  occasionId: uuid('occasion_id').references(() => occasions.id),
  category: text('category'), // From chosen style category
  name: text('name'),
  description: text('description'),
  imageUrl: text('image_url'), // DALL-E generated image URL (permanent)
  score: real('score'), // Match score
  scoreBreakdown: jsonb('score_breakdown'),
  explanation: text('explanation'), // AI explanation
  weatherContext: jsonb('weather_context'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const generatedOutfitItems = pgTable('generated_outfit_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  generatedOutfitId: uuid('generated_outfit_id').references(() => generatedOutfits.id, { onDelete: 'cascade' }).notNull(),
  wardrobeItemId: uuid('wardrobe_item_id').references(() => wardrobeItems.id),
  outfitTemplatePieceId: uuid('outfit_template_piece_id').references(() => outfitTemplatePieces.id),
  role: text('role'),
  sortOrder: integer('sort_order').default(0),
});

export const outfitFavorites = pgTable('outfit_favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID
  templateOutfitId: uuid('template_outfit_id').references(() => outfitTemplates.id),
  generatedOutfitId: uuid('generated_outfit_id').references(() => generatedOutfits.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wearHistory = pgTable('wear_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID
  templateOutfitId: uuid('template_outfit_id').references(() => outfitTemplates.id),
  generatedOutfitId: uuid('generated_outfit_id').references(() => generatedOutfits.id),
  occasionId: uuid('occasion_id').references(() => occasions.id),
  wornAt: timestamp('worn_at').defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const outfitRatings = pgTable('outfit_ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk user ID
  wearHistoryId: uuid('wear_history_id').references(() => wearHistory.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(), // 1 to 5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
