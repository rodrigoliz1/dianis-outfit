"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Heart, Sparkles, ImageIcon } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

type CollageItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
};

type Outfit = {
  id: string;
  slug?: string;
  name: string;
  description: string;
  colorPalette?: string[];
  imageUrl?: string | null;
  collageItems?: CollageItem[];
};

/** Mosaic collage from actual wardrobe item photos */
function WardrobeCollage({ items }: { items: CollageItem[] }) {
  const withImages = items.filter(i => i.imageUrl);
  const count = Math.min(withImages.length, 4);

  if (count === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-champagne/20 to-ivory">
        <Sparkles className="h-10 w-10 text-soft-gold/30 mb-2" />
        <span className="text-soft-gray text-sm">Sin imagen</span>
      </div>
    );
  }

  if (count === 1) {
    const first = withImages[0]!;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={first.imageUrl!} alt={first.name} className="absolute inset-0 w-full h-full object-cover" />
    );
  }

  // 2x2 grid collage
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-white">
      {withImages.slice(0, 4).map((item, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={item.id}
          src={item.imageUrl!}
          alt={item.name}
          className={`w-full h-full object-cover ${count === 3 && i === 2 ? 'col-span-2' : ''}`}
        />
      ))}
    </div>
  );
}

/** Catalog outfit card — image may be generating server-side, polls once */
function CatalogOutfitCard({ outfit, onView }: { outfit: Outfit; onView: () => void }) {
  const [imgUrl, setImgUrl] = useState<string | null>(outfit.imageUrl || null);
  const [imgLoading, setImgLoading] = useState(!outfit.imageUrl);

  // If no image yet, poll once after 20s (DALL-E takes ~15s)
  useEffect(() => {
    if (imgUrl) return;
    const timer = setTimeout(async () => {
      try {
        const id = outfit.slug || outfit.id;
        const res = await fetch(`/api/outfits/${id}`);
        const data = await res.json();
        if (data.success && data.data?.imageUrl) {
          setImgUrl(data.data.imageUrl);
        }
      } catch { /* ignore */ }
      setImgLoading(false);
    }, 22000);
    return () => clearTimeout(timer);
  }, [imgUrl, outfit.slug, outfit.id]);

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm h-full flex flex-col">
      <div className="aspect-[4/5] bg-ivory relative flex items-center justify-center overflow-hidden">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt={outfit.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : imgLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-champagne/10 to-ivory gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-soft-gold/30 border-t-soft-gold animate-spin" />
            <span className="text-xs text-soft-gray text-center px-4">Generando imagen con IA...</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-champagne/20 to-ivory p-4 text-center">
            <ImageIcon className="h-10 w-10 text-soft-gold/30 mb-2" />
            <span className="font-serif text-base text-charcoal/40">{outfit.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <Button variant="ghost" size="icon" className="absolute top-3 right-3 bg-white/50 backdrop-blur hover:bg-white/80 rounded-full z-10">
          <Heart className="h-4 w-4 text-soft-gray" />
        </Button>
      </div>
      <CardContent className="p-4 flex flex-col flex-1">
        <h3 className="font-serif text-lg font-medium text-charcoal mb-1 leading-tight">{outfit.name}</h3>
        <p className="text-xs text-soft-gray mb-3 flex-1 leading-relaxed">{outfit.description}</p>
        {outfit.colorPalette && outfit.colorPalette.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {outfit.colorPalette.slice(0, 3).map((color, i) => (
              <span key={i} className="text-xs bg-ivory border border-border px-2 py-0.5 rounded-full text-soft-gray capitalize">{color}</span>
            ))}
          </div>
        )}
        <Button variant="golden" className="w-full" onClick={onView}>
          Ver detalles
        </Button>
      </CardContent>
    </Card>
  );
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const occasion = searchParams.get("occasion");
  const mode = searchParams.get("mode");
  const { getToken } = useAuth();
  
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [wardrobeOutfit, setWardrobeOutfit] = useState<Outfit | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = await getToken();
        if (mode === "wardrobe") {
          const res = await fetch("/api/outfits/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ occasion, style: "casual" })
          });
          const data = await res.json();
          if (data.success && data.data) {
            setWardrobeOutfit(data.data);
          } else if (!data.success && data.error === 'Not enough items in wardrobe to generate an outfit') {
            alert("No tienes suficientes prendas en el armario para generar un outfit.");
          }
        } else {
          // Fetch user profile to get gender for filtering
          let gender = "";
          try {
            if (token) {
              const profileRes = await fetch("/api/profile", {
                headers: { Authorization: `Bearer ${token}` }
              });
              const profileData = await profileRes.json();
              if (profileData.success && profileData.data?.gender) {
                gender = profileData.data.gender;
              }
            }
          } catch { /* ignore profile fetch errors */ }

          const params = new URLSearchParams();
          if (occasion) params.set("occasion", occasion);
          if (gender) params.set("gender", gender);
          
          const url = `/api/catalog?${params.toString()}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.success) {
            setOutfits(data.data);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [occasion, mode, getToken]);

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center space-x-2 pt-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-2xl text-charcoal">
          {mode === "wardrobe" ? "Outfit de tu armario" : "Tus recomendaciones"}
        </h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-soft-gold/20 border-t-soft-gold animate-spin" />
            <Sparkles className="h-6 w-6 text-soft-gold absolute inset-0 m-auto" />
          </div>
          <p className="text-soft-gray font-medium">
            {mode === "wardrobe" ? "La IA está creando tu outfit personalizado..." : "Buscando outfits..."}
          </p>
        </div>
      ) : mode === "wardrobe" && wardrobeOutfit ? (
        /* ─── WARDROBE MODE: show collage + outfit info ─── */
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden border-border/50 shadow-md">
              {/* Collage */}
              <div className="aspect-square relative bg-ivory overflow-hidden">
                {wardrobeOutfit.collageItems && wardrobeOutfit.collageItems.length > 0 ? (
                  <WardrobeCollage items={wardrobeOutfit.collageItems} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-ivory">
                    <Sparkles className="h-12 w-12 text-soft-gold/20" />
                  </div>
                )}
                {/* Overlay label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                  <span className="text-white font-serif text-xl">{wardrobeOutfit.name}</span>
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                <p className="text-soft-gray leading-relaxed">{wardrobeOutfit.description}</p>

                {/* Individual pieces */}
                {wardrobeOutfit.collageItems && wardrobeOutfit.collageItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-soft-gray uppercase tracking-wider mb-3">Prendas seleccionadas</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {wardrobeOutfit.collageItems.map((item) => (
                        <div key={item.id} className="flex-shrink-0 text-center w-16">
                          <div className="w-16 h-16 rounded-lg bg-ivory border border-border overflow-hidden">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-border">
                                <Sparkles className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-soft-gray mt-1 truncate capitalize">{item.name || item.category}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="golden"
                  className="w-full h-12"
                  onClick={() => router.push(`/assistant/outfit-detail/${wardrobeOutfit.id}`)}
                >
                  Ver detalles completos
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : outfits.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-soft-gray">No encontramos outfits para esta ocasión aún.</p>
        </div>
      ) : (
        /* ─── CATALOG MODE: grid of outfits ─── */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {outfits.map((outfit, index) => (
            <motion.div 
              key={outfit.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <CatalogOutfitCard
                outfit={outfit}
                onView={() => router.push(`/assistant/outfit-detail/${outfit.slug || outfit.id}`)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-soft-gold" /></div>}>
      <ResultsContent />
    </Suspense>
  );
}
