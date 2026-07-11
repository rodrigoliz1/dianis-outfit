"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Heart, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";

type Outfit = {
  id: string;
  slug: string;
  name: string;
  description: string;
  colorPalette: string[];
  imageUrl?: string;
};

export default function OutfitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { getToken } = useAuth();
  
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFav, setSavingFav] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    fetch(`/api/outfits/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOutfit(data.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleFavorite = async () => {
    if (!outfit) return;
    setSavingFav(true);
    try {
      const token = await getToken();
      await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ templateId: outfit.id })
      });
      setIsFav(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingFav(false);
    }
  };

  const handleUseOutfit = async () => {
    try {
      const token = await getToken();
      await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ templateId: outfit?.id })
      });
      alert("¡Outfit registrado para hoy!");
      router.push("/assistant");
    } catch (e) {
      console.error(e);
      alert("Hubo un error al registrar el outfit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
      </div>
    );
  }

  if (!outfit) {
    return (
      <div className="text-center py-20 px-6">
        <h2 className="font-serif text-xl text-charcoal mb-2">Outfit no encontrado</h2>
        <Button variant="outline" onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-warm-white pb-24 animate-in fade-in duration-500">
      {/* Hero Image Section */}
      <div className="relative h-[55vh] bg-ivory flex items-center justify-center overflow-hidden">
        {outfit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={outfit.imageUrl} alt={outfit.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-soft-gold/30 mx-auto mb-4" />
            <span className="font-serif text-3xl text-soft-gold/30 block mb-2">{outfit.name}</span>
          </div>
        )}
        
        {/* Top Navigation */}
        <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/20 to-transparent">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/20 rounded-full backdrop-blur-sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleFavorite} 
            disabled={savingFav}
            className="text-white hover:bg-white/20 rounded-full backdrop-blur-sm"
          >
            <Heart className={`h-5 w-5 ${isFav ? 'fill-error text-error' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Details Section */}
      <div className="px-6 py-8 -mt-6 bg-warm-white rounded-t-3xl relative z-10 flex-1">
        <div className="flex items-start justify-between mb-2">
          <h1 className="font-serif text-3xl text-charcoal">{outfit.name}</h1>
        </div>
        
        <p className="text-soft-gray mb-8 leading-relaxed">
          {outfit.description}
        </p>

        {/* Color Palette */}
        {outfit.colorPalette && outfit.colorPalette.length > 0 && (
          <div className="mb-8">
            <h3 className="font-medium text-charcoal mb-3 flex items-center">
              <span className="w-8 h-[1px] bg-soft-gold mr-3"></span>
              Paleta de Colores
            </h3>
            <div className="flex flex-wrap gap-2">
              {outfit.colorPalette.map((color, i) => (
                <span key={i} className="text-sm bg-white border border-border px-3 py-1.5 rounded-full text-charcoal shadow-sm capitalize">
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-border flex gap-3 z-50">
        <Button 
          variant="outline" 
          className="flex-1 h-12"
          onClick={() => alert("Función para modificar prenda próximamente")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Modificar
        </Button>
        <Button 
          variant="golden" 
          className="flex-1 h-12"
          onClick={handleUseOutfit}
        >
          Usar este outfit
        </Button>
      </div>
    </div>
  );
}
