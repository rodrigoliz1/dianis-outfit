"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Heart, Sparkles, Plus, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";

type Outfit = {
  id: string;
  slug?: string;
  name: string;
  description: string;
  colorPalette?: string[];
  imageUrl?: string | null;
  styleTags?: string[];
  occasionTags?: string[];
  hairSuggestion?: string | null;
  makeupSuggestion?: string | null;
  stylingTips?: string | null;
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageGenerating, setImageGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/outfits/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOutfit(data.data);
          const img = data.data.imageUrl || null;
          setImageUrl(img);
          // If no image, it's being generated in the background — poll after 22s
          if (!img) {
            setImageGenerating(true);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);

  // Poll for generated image
  useEffect(() => {
    if (!imageGenerating || !outfit) return;
    const timer = setTimeout(async () => {
      try {
        const id = outfit.slug || outfit.id;
        const res = await fetch(`/api/outfits/${id}`);
        const data = await res.json();
        if (data.success && data.data?.imageUrl) {
          setImageUrl(data.data.imageUrl);
          setImageGenerating(false);
        } else {
          setImageGenerating(false); // stop trying after one poll
        }
      } catch {
        setImageGenerating(false);
      }
    }, 22000);
    return () => clearTimeout(timer);
  }, [imageGenerating, outfit]);

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
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={outfit.name} className="w-full h-full object-cover" />
        ) : imageGenerating ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-14 h-14 rounded-full border-2 border-soft-gold/30 border-t-soft-gold animate-spin" />
            <div>
              <p className="font-serif text-lg text-charcoal mb-1">Creando imagen con IA</p>
              <p className="text-sm text-soft-gray">DALL-E está generando una foto estilizada del outfit...</p>
            </div>
          </div>
        ) : (
          <div className="text-center px-8">
            <ImageIcon className="h-12 w-12 text-soft-gold/20 mx-auto mb-4" />
            <span className="font-serif text-2xl text-soft-gold/30 block">{outfit.name}</span>
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
            <Heart className={`h-5 w-5 ${isFav ? 'fill-red-400 text-red-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Details Section */}
      <div className="px-6 py-8 -mt-6 bg-warm-white rounded-t-3xl relative z-10 flex-1 space-y-6">
        <h1 className="font-serif text-3xl text-charcoal">{outfit.name}</h1>
        
        <p className="text-soft-gray leading-relaxed">
          {outfit.description}
        </p>

        {/* Color Palette */}
        {outfit.colorPalette && outfit.colorPalette.length > 0 && (
          <div>
            <h3 className="font-medium text-charcoal mb-3 flex items-center text-sm uppercase tracking-wider">
              <span className="w-6 h-[1px] bg-soft-gold mr-3" />
              Paleta de colores
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

        {/* Style Tags */}
        {outfit.styleTags && outfit.styleTags.length > 0 && (
          <div>
            <h3 className="font-medium text-charcoal mb-3 flex items-center text-sm uppercase tracking-wider">
              <span className="w-6 h-[1px] bg-soft-gold mr-3" />
              Estilo
            </h3>
            <div className="flex flex-wrap gap-2">
              {outfit.styleTags.map((tag, i) => (
                <span key={i} className="text-sm bg-champagne/20 border border-champagne px-3 py-1 rounded-full text-charcoal capitalize">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Styling Tips */}
        {outfit.stylingTips && (
          <div className="bg-ivory rounded-2xl p-4">
            <h3 className="font-medium text-charcoal mb-2 flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-soft-gold" />
              Consejo de estilismo
            </h3>
            <p className="text-soft-gray text-sm leading-relaxed">{outfit.stylingTips}</p>
          </div>
        )}

        {/* Hair & Makeup */}
        {(outfit.hairSuggestion || outfit.makeupSuggestion) && (
          <div className="grid grid-cols-2 gap-3">
            {outfit.hairSuggestion && (
              <div className="bg-white rounded-xl p-3 border border-border">
                <p className="text-xs text-soft-gray uppercase tracking-wider mb-1">Cabello</p>
                <p className="text-sm text-charcoal">{outfit.hairSuggestion}</p>
              </div>
            )}
            {outfit.makeupSuggestion && (
              <div className="bg-white rounded-xl p-3 border border-border">
                <p className="text-xs text-soft-gray uppercase tracking-wider mb-1">Maquillaje</p>
                <p className="text-sm text-charcoal">{outfit.makeupSuggestion}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-border flex gap-3 z-50">
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
