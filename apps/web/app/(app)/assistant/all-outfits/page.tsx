"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";

type Outfit = {
  id: string;
  slug?: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  colorPalette?: string[];
  styleTags?: string[];
  source: "catalog" | "wardrobe";
  collageItems?: { id: string; name: string; imageUrl: string | null }[];
};

function OutfitCard({ outfit, onView }: { outfit: Outfit; onView: () => void }) {
  const withImg = outfit.collageItems?.filter(i => i.imageUrl) ?? [];

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm h-full flex flex-col cursor-pointer" onClick={onView}>
      <div className="aspect-[4/5] bg-ivory relative overflow-hidden">
        {outfit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={outfit.imageUrl} alt={outfit.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : withImg.length > 0 ? (
          <div className={`absolute inset-0 grid gap-0.5 bg-white ${withImg.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {withImg.slice(0, 4).map((item, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={item.imageUrl!} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-champagne/10 to-ivory">
            <Sparkles className="h-10 w-10 text-soft-gold/20 mb-2" />
            <span className="text-soft-gray text-xs text-center px-2">{outfit.name}</span>
          </div>
        )}

        {/* Source badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            outfit.source === 'catalog' 
              ? 'bg-champagne/90 text-charcoal' 
              : 'bg-white/90 text-soft-gray border border-border'
          }`}>
            {outfit.source === 'catalog' ? '✨ Exclusivo' : '👗 Mi armario'}
          </span>
        </div>
      </div>

      <CardContent className="p-3 flex flex-col flex-1">
        <p className="font-serif text-sm font-medium text-charcoal leading-tight">{outfit.name}</p>
        <p className="text-xs text-soft-gray mt-1 line-clamp-2 flex-1">{outfit.description}</p>
      </CardContent>
    </Card>
  );
}

export default function AllOutfitsPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "catalog" | "wardrobe">("all");

  useEffect(() => {
    const load = async () => {
      try {
        const token = isSignedIn ? await getToken() : null;
        const res = await fetch("/api/all-outfits", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) setOutfits(data.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, [isSignedIn, getToken]);

  const filtered = filter === "all" ? outfits : outfits.filter(o => o.source === filter);

  return (
    <div className="flex flex-col min-h-screen bg-warm-white pb-24 animate-in fade-in duration-500">
      <div className="flex items-center space-x-2 pt-4 px-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-2xl text-charcoal">Todos los outfits</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 pt-4 pb-2">
        {(["all", "catalog", "wardrobe"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-charcoal text-white"
                : "bg-ivory text-soft-gray border border-border"
            }`}
          >
            {f === "all" ? "Todos" : f === "catalog" ? "✨ Exclusivos" : "👗 Mi armario"}
          </button>
        ))}
        <span className="ml-auto text-soft-gray text-xs self-center">{filtered.length} outfits</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pt-2">
          {filtered.map((outfit, index) => (
            <motion.div
              key={outfit.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <OutfitCard
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
