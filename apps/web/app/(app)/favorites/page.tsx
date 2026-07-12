"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, HeartCrack, Sparkles } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

function OutfitCard({ outfit, onView }: { outfit: any; onView: () => void }) {
  const withImg = outfit.collageItems?.filter((i: any) => i.imageUrl) ?? [];

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm h-full flex flex-col cursor-pointer" onClick={onView}>
      <div className="aspect-[4/5] bg-ivory relative overflow-hidden">
        {outfit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={outfit.imageUrl} alt={outfit.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : withImg.length > 0 ? (
          <div className={`absolute inset-0 grid gap-0.5 bg-white ${withImg.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {withImg.slice(0, 4).map((item: any, i: number) => (
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

export default function FavoritesPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    const fetchFavs = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/favorites", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setFavorites(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavs();
  }, [getToken, isSignedIn]);

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in pb-24 pt-4 px-4">
      <h1 className="font-serif text-2xl text-charcoal">Mis Favoritos</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center bg-ivory rounded-2xl border border-border">
          <HeartCrack className="h-12 w-12 text-soft-gray/30 mb-4" />
          <h2 className="font-medium text-charcoal mb-2">Sin favoritos aún</h2>
          <p className="text-sm text-soft-gray">Guarda los outfits que más te gusten para verlos aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {favorites.map((fav, i) => (
             <motion.div
               key={fav.id}
               initial={{ opacity: 0, y: 16 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
             >
               <OutfitCard 
                 outfit={fav.outfit} 
                 onView={() => router.push(`/assistant/outfit-detail/${fav.outfit.slug || fav.outfit.id}`)}
               />
             </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
