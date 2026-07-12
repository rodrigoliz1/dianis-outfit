"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Sparkles, Shirt, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";

type CollageItem = { id: string; name: string; imageUrl: string | null; category: string };
type MyOutfit = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  collageItems?: CollageItem[];
  createdAt: string;
};

function WardrobeCollage({ items, imageUrl }: { items: CollageItem[]; imageUrl?: string | null }) {
  if (imageUrl) return <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />;
  const withImg = items.filter(i => i.imageUrl).slice(0, 4);
  if (withImg.length === 0) return (
    <div className="absolute inset-0 flex items-center justify-center bg-ivory">
      <Sparkles className="h-12 w-12 text-soft-gold/20" />
    </div>
  );
  if (withImg.length === 1) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={withImg[0].imageUrl!} alt="" className="absolute inset-0 w-full h-full object-cover" />
  );
  return (
    <div className="absolute inset-0 grid grid-cols-2 gap-0.5 bg-white">
      {withImg.map((item, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={item.imageUrl!} alt={item.name} className="w-full h-full object-cover" />
      ))}
    </div>
  );
}

export default function MyOutfitsPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [outfits, setOutfits] = useState<MyOutfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    const load = async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/my-outfits", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) setOutfits(data.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, [isSignedIn, getToken]);

  return (
    <div className="flex flex-col min-h-screen bg-warm-white pb-24 animate-in fade-in duration-500">
      <div className="flex items-center justify-between pt-4 px-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-soft-gray">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-2xl text-charcoal">Mis outfits</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/wardrobe/add')}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar prenda
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : outfits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-ivory border border-border flex items-center justify-center mb-4">
            <Shirt className="h-10 w-10 text-soft-gray/30" />
          </div>
          <h2 className="font-serif text-xl text-charcoal mb-2">Sin outfits aún</h2>
          <p className="text-soft-gray text-sm mb-6">
            Agrega prendas a tu armario y el sistema generará outfits automáticamente con imágenes de IA.
          </p>
          <Button variant="golden" onClick={() => router.push('/wardrobe/add')}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar mi primera prenda
          </Button>
        </div>
      ) : (
        <div className="px-4 pt-4">
          <p className="text-soft-gray text-xs mb-4">
            {outfits.length} outfit{outfits.length !== 1 ? 's' : ''} generado{outfits.length !== 1 ? 's' : ''} automáticamente con tu armario
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {outfits.map((outfit, index) => (
              <motion.div
                key={outfit.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Card
                  className="overflow-hidden border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/assistant/outfit-detail/${outfit.id}`)}
                >
                  <div className="aspect-square relative bg-ivory overflow-hidden">
                    <WardrobeCollage
                      items={outfit.collageItems || []}
                      imageUrl={outfit.imageUrl}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-serif text-sm font-medium leading-tight drop-shadow">{outfit.name}</p>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-soft-gray line-clamp-2">{outfit.description}</p>
                    {outfit.collageItems && outfit.collageItems.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {outfit.collageItems.slice(0, 4).map((item) => (
                          <div key={item.id} className="w-7 h-7 rounded overflow-hidden bg-ivory border border-border flex-shrink-0">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-ivory" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
