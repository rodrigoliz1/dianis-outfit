CREATE TABLE IF NOT EXISTS "ai_analysis_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"image_id" text,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_response" jsonb,
	"validated_result" jsonb,
	"overall_confidence" real,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generated_outfit_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generated_outfit_id" uuid NOT NULL,
	"wardrobe_item_id" uuid,
	"outfit_template_piece_id" uuid,
	"role" text,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generated_outfits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_mode" text NOT NULL,
	"occasion_id" uuid,
	"category" text,
	"name" text,
	"description" text,
	"score" real,
	"score_breakdown" jsonb,
	"explanation" text,
	"weather_context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "occasions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"group" text NOT NULL,
	"description" text,
	"formality_min" integer NOT NULL,
	"formality_max" integer NOT NULL,
	"required_categories" text[],
	"optional_categories" text[],
	"time_tags" text[],
	"weather_tags" text[],
	"style_tags" text[],
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "occasions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outfit_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_outfit_id" uuid,
	"generated_outfit_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outfit_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wear_history_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outfit_template_pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outfit_template_id" uuid NOT NULL,
	"piece_type" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"subcategory" text,
	"color" text,
	"materials" text[],
	"description" text,
	"is_required" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outfit_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"image_public_id" text,
	"image_prompt" text,
	"formality_score" integer,
	"comfort_score" integer,
	"occasion_tags" text[],
	"style_tags" text[],
	"weather_tags" text[],
	"time_tags" text[],
	"color_palette" text[],
	"hair_suggestion" text,
	"makeup_suggestion" text,
	"styling_tips" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "outfit_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"preferred_name" text,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"favorite_colors" text[],
	"avoided_colors" text[],
	"favorite_styles" text[],
	"heel_preference" text,
	"metal_preference" text,
	"comfort_preference" text,
	"makeup_suggestions_enabled" boolean DEFAULT false,
	"hair_suggestions_enabled" boolean DEFAULT false,
	"repeat_frequency_preference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_auth_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_auth_id_unique" UNIQUE("external_auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wardrobe_item_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wardrobe_item_id" uuid NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"secure_url" text NOT NULL,
	"thumbnail_url" text,
	"width" integer,
	"height" integer,
	"format" text,
	"bytes" integer,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wardrobe_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"brand" text,
	"description" text,
	"primary_color" text,
	"primary_color_hex" text,
	"secondary_colors" text[],
	"pattern" text,
	"textures" text[],
	"materials" jsonb,
	"fit" text,
	"silhouette" text,
	"sleeve_length" text,
	"neckline" text,
	"garment_length" text,
	"rise" text,
	"leg_shape" text,
	"closure" text,
	"heel_type" text,
	"heel_height_cm" real,
	"toe_shape" text,
	"size" text,
	"formality_score" integer,
	"warmth_score" integer,
	"comfort_score" integer,
	"seasons" text[],
	"weather_tags" text[],
	"occasion_tags" text[],
	"style_tags" text[],
	"matching_colors" text[],
	"is_statement_piece" boolean DEFAULT false,
	"is_basic" boolean DEFAULT false,
	"is_favorite" boolean DEFAULT false,
	"status" text DEFAULT 'available' NOT NULL,
	"location" text,
	"care_instructions" jsonb,
	"personal_notes" text,
	"last_worn_at" timestamp,
	"wear_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wear_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_outfit_id" uuid,
	"generated_outfit_id" uuid,
	"occasion_id" uuid,
	"worn_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_analysis_jobs" ADD CONSTRAINT "ai_analysis_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_outfit_items" ADD CONSTRAINT "generated_outfit_items_generated_outfit_id_generated_outfits_id_fk" FOREIGN KEY ("generated_outfit_id") REFERENCES "generated_outfits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_outfit_items" ADD CONSTRAINT "generated_outfit_items_wardrobe_item_id_wardrobe_items_id_fk" FOREIGN KEY ("wardrobe_item_id") REFERENCES "wardrobe_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_outfit_items" ADD CONSTRAINT "generated_outfit_items_outfit_template_piece_id_outfit_template_pieces_id_fk" FOREIGN KEY ("outfit_template_piece_id") REFERENCES "outfit_template_pieces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_outfits" ADD CONSTRAINT "generated_outfits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_outfits" ADD CONSTRAINT "generated_outfits_occasion_id_occasions_id_fk" FOREIGN KEY ("occasion_id") REFERENCES "occasions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_favorites" ADD CONSTRAINT "outfit_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_favorites" ADD CONSTRAINT "outfit_favorites_template_outfit_id_outfit_templates_id_fk" FOREIGN KEY ("template_outfit_id") REFERENCES "outfit_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_favorites" ADD CONSTRAINT "outfit_favorites_generated_outfit_id_generated_outfits_id_fk" FOREIGN KEY ("generated_outfit_id") REFERENCES "generated_outfits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_ratings" ADD CONSTRAINT "outfit_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_ratings" ADD CONSTRAINT "outfit_ratings_wear_history_id_wear_history_id_fk" FOREIGN KEY ("wear_history_id") REFERENCES "wear_history"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outfit_template_pieces" ADD CONSTRAINT "outfit_template_pieces_outfit_template_id_outfit_templates_id_fk" FOREIGN KEY ("outfit_template_id") REFERENCES "outfit_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wardrobe_item_images" ADD CONSTRAINT "wardrobe_item_images_wardrobe_item_id_wardrobe_items_id_fk" FOREIGN KEY ("wardrobe_item_id") REFERENCES "wardrobe_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wardrobe_items" ADD CONSTRAINT "wardrobe_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wear_history" ADD CONSTRAINT "wear_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wear_history" ADD CONSTRAINT "wear_history_template_outfit_id_outfit_templates_id_fk" FOREIGN KEY ("template_outfit_id") REFERENCES "outfit_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wear_history" ADD CONSTRAINT "wear_history_generated_outfit_id_generated_outfits_id_fk" FOREIGN KEY ("generated_outfit_id") REFERENCES "generated_outfits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wear_history" ADD CONSTRAINT "wear_history_occasion_id_occasions_id_fk" FOREIGN KEY ("occasion_id") REFERENCES "occasions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
