"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";

type Outfit = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  colorPalette?: string[];
  occasionTags?: string[];
  styleTags?: string[];
  gender?: string;
};

const CATEGORIES = [
  { key: "all", label: "✨ Todos" },
  { key: "oficina", label: "💼 Trabajo" },
  { key: "noche-casual", label: "🌙 Noche" },
  { key: "boda-de-dia", label: "💍 Bodas" },
  { key: "brunch", label: "☀️ Brunch" },
  { key: "cena", label: "🍽️ Cena" },
  { key: "playa", label: "🏖️ Playa" },
  { key: "universidad", label: "📚 Campus" },
  { key: "coctel", label: "🥂 Cóctel" },
  { key: "gala", label: "✨ Gala" },
  { key: "festival", label: "🎶 Festival" },
  { key: "dia-casual", label: "👟 Casual" },
  { key: "graduacion-propia", label: "🎓 Graduación" },
  { key: "cozy", label: "🏠 Casa" },
];

export default function CatalogPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userGender, setUserGender] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const token = isSignedIn ? await getToken() : null;

        // Step 1: Load profile to get gender FIRST (before catalog)
        let gender = "";
        if (token) {
          try {
            const profileRes = await fetch("/api/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const profileData = await profileRes.json();
            if (profileData.success && profileData.data?.gender) {
              gender = profileData.data.gender;
              setUserGender(gender);
            }
          } catch { /* ignore */ }
        }

        // Step 2: Load favorites
        if (token) {
          try {
            const favRes = await fetch("/api/favorites", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const favData = await favRes.json();
            if (favData.success) {
              const favIds = new Set<string>(
                favData.data
                  .filter((f: any) => f.templateOutfitId)
                  .map((f: any) => f.templateOutfitId as string)
              );
              setFavorites(favIds);
            }
          } catch { /* ignore */ }
        }

        // Step 3: Load catalog with gender already known
        const params = new URLSearchParams();
        if (gender) params.set("gender", gender);
        const res = await fetch(`/api/catalog?${params.toString()}`);
        const data = await res.json();
        if (data.success) setOutfits(data.data);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    load();
  }, [isSignedIn, getToken]); // No userGender dep — gender fetched inline

  const filteredOutfits =
    activeCategory === "all"
      ? outfits
      : outfits.filter(
          (o) => o.occasionTags && o.occasionTags.includes(activeCategory)
        );

  const handleFavorite = async (outfitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = await getToken();
      if (!token) { router.push("/sign-in"); return; }
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: outfitId }),
      });
      const data = await res.json();
      if (data.success) {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (data.removed) next.delete(outfitId);
          else next.add(outfitId);
          return next;
        });
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col min-h-screen bg-warm-white pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center space-x-2 pt-4 px-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Outfits Seleccionados</h1>
          {userGender && (
            <p className="text-xs text-soft-gold capitalize">{userGender === "femenino" ? "✦ Colección Femenina" : "✦ Colección Masculina"}</p>
          )}
        </div>
      </div>

      {/* Category Tabs - horizontal scrollable */}
      <div className="flex gap-2 px-4 pt-4 pb-1 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
              activeCategory === cat.key
                ? "bg-charcoal text-white shadow-sm"
                : "bg-ivory text-soft-gray border border-border/70 hover:border-soft-gold/50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="px-4 pt-1 pb-2 text-xs text-soft-gray">{filteredOutfits.length} outfits</p>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : filteredOutfits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-8">
          <Sparkles className="h-12 w-12 text-soft-gold/20 mb-4" />
          <p className="text-soft-gray font-medium">No hay outfits en esta categoría</p>
          <p className="text-soft-gray/60 text-sm mt-1">Prueba otra categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pt-1">
          <AnimatePresence>
            {filteredOutfits.map((outfit, index) => (
              <motion.div
                key={outfit.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.035 }}
              >
                <Card
                  className="overflow-hidden border-border/50 shadow-sm h-full flex flex-col cursor-pointer hover:shadow-md hover:border-soft-gold/40 transition-all duration-200"
                  onClick={() => router.push(`/assistant/outfit-detail/${outfit.slug}`)}
                >
                  <div className="aspect-[4/5] bg-ivory relative overflow-hidden">
                    {outfit.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={outfit.imageUrl}
                        alt={outfit.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-champagne/10 to-ivory">
                        <Sparkles className="h-10 w-10 text-soft-gold/20 mb-2" />
                        <span className="text-soft-gray text-xs text-center px-2">{outfit.name}</span>
                      </div>
                    )}
                    {/* Favorite button */}
                    <button
                      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition-all ${
                        favorites.has(outfit.id)
                          ? "bg-rose-500 text-white"
                          : "bg-white/90 text-soft-gray hover:text-rose-400"
                      }`}
                      onClick={(e) => handleFavorite(outfit.id, e)}
                    >
                      <Heart className={`h-3.5 w-3.5 ${favorites.has(outfit.id) ? "fill-white" : ""}`} />
                    </button>
                  </div>
                  <CardContent className="p-3 flex flex-col flex-1">
                    <p className="font-serif text-sm font-medium text-charcoal leading-tight">{outfit.name}</p>
                    {outfit.colorPalette && outfit.colorPalette.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {outfit.colorPalette.slice(0, 3).map((c, i) => (
                          <span key={i} className="text-xs bg-ivory border border-border/50 px-1.5 py-0.5 rounded-full text-soft-gray capitalize">{c}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
