"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Heart, Sparkles } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

type Outfit = {
  id: string;
  slug: string;
  name: string;
  description: string;
  colorPalette: string[];
  imageUrl?: string;
};

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const occasion = searchParams.get("occasion");
  const mode = searchParams.get("mode");
  const { getToken } = useAuth();
  
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (mode === "wardrobe") {
          const token = await getToken();
          const res = await fetch("/api/outfits/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify({ occasion, style: "casual" }) // Default style for now
          });
          const data = await res.json();
          if (data.success && data.data) {
            // Transform generated outfit into the expected format
            setOutfits([{
              id: data.data.id,
              slug: data.data.id,
              name: data.data.name,
              description: data.data.description,
              colorPalette: []
            }]);
          } else if (!data.success && data.error === 'Not enough items in wardrobe to generate an outfit') {
            setOutfits([]);
            alert("No tienes suficientes prendas en el armario para generar un outfit.");
          }
        } else {
          const url = occasion 
            ? `/api/catalog?occasion=${occasion}`
            : "/api/catalog";
            
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
        <h1 className="font-serif text-2xl text-charcoal">Tus recomendaciones</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : outfits.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-soft-gray">No encontramos outfits para esta ocasión aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {outfits.map((outfit, index) => (
            <motion.div 
              key={outfit.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden border-border/50 shadow-sm">
                <div className="aspect-[4/5] bg-warm-white relative flex items-center justify-center p-8">
                  {outfit.imageUrl ? (
                    <img src={outfit.imageUrl} alt={outfit.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <img 
                      src={`https://images.unsplash.com/photo-${['1515886657613-9f3515b0c78f', '1434389670869-bac0858e14d1', '1483985988355-763728e1935b', '1529139574466-a303027c1d8b', '1485230895905-ef08ba37e5c9'][outfit.name.length % 5]}?q=80&w=400&auto=format&fit=crop`} 
                      alt="Fashion placeholder" 
                      className="absolute inset-0 w-full h-full object-cover" 
                    />
                  )}
                  <div className="absolute inset-0 bg-black/10"></div>
                  
                  <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-white/50 backdrop-blur hover:bg-white/80 rounded-full">
                    <Heart className="h-5 w-5 text-soft-gray hover:text-error transition-colors" />
                  </Button>
                </div>
                
                <CardContent className="p-5">
                  <h3 className="font-serif text-xl font-medium text-charcoal mb-2">{outfit.name}</h3>
                  <p className="text-sm text-soft-gray mb-4">{outfit.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {outfit.colorPalette?.map((color, i) => (
                      <span key={i} className="text-xs bg-ivory border border-border px-2 py-1 rounded-full text-soft-gray">
                        {color}
                      </span>
                    ))}
                  </div>
                  
                  <Button 
                    variant="golden" 
                    className="w-full"
                    onClick={() => router.push(`/assistant/outfit-detail/${outfit.slug || outfit.id}`)}
                  >
                    Ver detalles
                  </Button>
                </CardContent>
              </Card>
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
