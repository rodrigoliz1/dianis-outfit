"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Shirt, Grid3X3, ChevronRight, Loader2, ImageIcon } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

type MyOutfit = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  collageItems?: { id: string; name: string; imageUrl: string | null; category: string }[];
};

function SmallCollage({ items }: { items: { imageUrl: string | null }[] }) {
  const withImg = items.filter(i => i.imageUrl).slice(0, 4);
  if (withImg.length === 0) return <div className="w-full h-full bg-ivory flex items-center justify-center"><Sparkles className="h-6 w-6 text-soft-gold/30" /></div>;
  if (withImg.length === 1) {
    const first = withImg[0]!;
    return <img src={first.imageUrl!} alt="" className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-white">
      {withImg.map((item, i) => (
        <img key={i} src={item.imageUrl!} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}

export default function AssistantPage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [myOutfits, setMyOutfits] = useState<MyOutfit[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(true);

  useEffect(() => {
    if (!isSignedIn) { setLoadingOutfits(false); return; }
    const load = async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/my-outfits", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) setMyOutfits(data.data);
      } catch { /* ignore */ }
      finally { setLoadingOutfits(false); }
    };
    load();
  }, [isSignedIn, getToken]);

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="text-center pt-8">
        <h1 className="font-serif text-3xl text-charcoal">¿Cómo elegiremos hoy?</h1>
        <p className="mt-2 text-soft-gray text-sm">
          Selecciona una opción para encontrar el outfit perfecto.
        </p>
      </div>

      {/* Main action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="cursor-pointer hover:border-soft-gold hover:shadow-md transition-all h-full" onClick={() => router.push('/assistant/results')}>
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-champagne/30 flex items-center justify-center mb-2">
                <Sparkles className="w-8 h-8 text-deep-gold" />
              </div>
              <h3 className="font-serif text-xl font-medium">Outfits seleccionados</h3>
              <p className="text-sm text-muted-foreground">
                Explora el catálogo de combinaciones prearmadas diseñadas exclusivamente.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="cursor-pointer hover:border-soft-gold hover:shadow-md transition-all h-full" onClick={() => router.push('/assistant/my-outfits')}>
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-soft-gold/10 flex items-center justify-center mb-2">
                <Shirt className="w-8 h-8 text-deep-gold" />
              </div>
              <h3 className="font-serif text-xl font-medium">Mis outfits</h3>
              <p className="text-sm text-muted-foreground">
                Outfits creados automáticamente con las prendas de tu armario.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Ver todos */}
      <div className="flex justify-between items-center">
        <span className="font-serif text-lg text-charcoal">Todos los outfits</span>
        <Button variant="ghost" size="sm" className="text-soft-gold text-sm" onClick={() => router.push('/assistant/all-outfits')}>
          Ver todos <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* My wardrobe outfits preview */}
      {loadingOutfits ? (
        <div className="flex items-center gap-2 text-soft-gray text-sm py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando tus outfits...
        </div>
      ) : myOutfits.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-soft-gray uppercase tracking-wider">Mis outfits del armario</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {myOutfits.slice(0, 6).map((outfit) => (
              <motion.div
                key={outfit.id}
                whileHover={{ scale: 1.03 }}
                className="flex-shrink-0 w-36 cursor-pointer"
                onClick={() => router.push(`/assistant/outfit-detail/${outfit.id}`)}
              >
                <div className="w-36 h-36 rounded-2xl overflow-hidden bg-ivory border border-border relative">
                  {outfit.imageUrl ? (
                    <img src={outfit.imageUrl} alt={outfit.name} className="w-full h-full object-cover" />
                  ) : outfit.collageItems && outfit.collageItems.length > 0 ? (
                    <SmallCollage items={outfit.collageItems} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-soft-gold/20" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-charcoal mt-1.5 truncate">{outfit.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ) : isSignedIn ? (
        <div className="text-center py-6 bg-ivory rounded-2xl border border-border/50">
          <Shirt className="h-8 w-8 text-soft-gray/30 mx-auto mb-2" />
          <p className="text-soft-gray text-sm">Agrega prendas a tu armario para ver outfits generados automáticamente</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/wardrobe/add')}>
            Agregar prenda
          </Button>
        </div>
      ) : null}

      {/* Surprise */}
      <div className="flex justify-center pt-2">
        <Button variant="ghost" className="text-soft-gray" onClick={() => router.push('/assistant/surprise')}>
          <Sparkles className="h-4 w-4 mr-2 text-soft-gold" />
          Sorpréndeme
        </Button>
      </div>
    </div>
  );
}
