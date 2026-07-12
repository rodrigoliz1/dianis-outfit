"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Outfit = {
  id: string;
  slug: string;
  name: string;
  description: string;
  colorPalette: string[];
  imageUrl?: string;
};

export default function SurprisePage() {
  const router = useRouter();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all outfits and pick a random one
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          const random = data.data[Math.floor(Math.random() * data.data.length)];
          setOutfit(random);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSurpriseAgain = () => {
    setLoading(true);
    setOutfit(null);
    fetch("/api/catalog")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          const random = data.data[Math.floor(Math.random() * data.data.length)];
          setOutfit(random);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col min-h-screen bg-warm-white pb-24 animate-in fade-in duration-500">
      <div className="flex items-center space-x-2 pt-4 px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-2xl text-charcoal">Sorpréndeme</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center flex-1 py-32 space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-12 w-12 text-soft-gold" />
          </motion.div>
          <p className="text-soft-gray font-medium">Eligiendo algo especial para ti...</p>
        </div>
      ) : outfit ? (
        <div className="px-6 pt-6 flex-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="overflow-hidden border-border/50 shadow-lg">
              <div className="aspect-[4/5] bg-ivory relative flex items-center justify-center">
                {outfit.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={outfit.imageUrl}
                    alt={outfit.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <Sparkles className="h-20 w-20 text-soft-gold/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-white/50 backdrop-blur hover:bg-white/80 rounded-full"
                >
                  <Heart className="h-5 w-5 text-soft-gray" />
                </Button>
              </div>

              <CardContent className="p-6 space-y-4">
                <h2 className="font-serif text-2xl text-charcoal">{outfit.name}</h2>
                <p className="text-soft-gray leading-relaxed">{outfit.description}</p>

                {outfit.colorPalette && outfit.colorPalette.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {outfit.colorPalette.map((color, i) => (
                      <span key={i} className="text-xs bg-ivory border border-border px-3 py-1.5 rounded-full text-charcoal capitalize">
                        {color}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={handleSurpriseAgain}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Otro outfit
              </Button>
              <Button
                variant="golden"
                className="flex-1 h-12"
                onClick={() => router.push(`/assistant/outfit-detail/${outfit.slug || outfit.id}`)}
              >
                Ver detalles
              </Button>
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="text-center py-20 px-6">
          <p className="text-soft-gray">No hay outfits disponibles aún.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Volver
          </Button>
        </div>
      )}
    </div>
  );
}
