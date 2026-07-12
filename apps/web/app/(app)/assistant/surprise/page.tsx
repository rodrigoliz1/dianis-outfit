"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, ArrowLeft, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";

type Outfit = {
  id: string;
  slug: string;
  name: string;
  description: string;
  colorPalette: string[];
  imageUrl?: string;
  styleTags?: string[];
};

export default function SurprisePage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<string>("");
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [reacting, setReacting] = useState(false);

  const fetchRandom = async (gender: string) => {
    setLoading(true);
    setReaction(null);
    try {
      const params = new URLSearchParams();
      if (gender) params.set("gender", gender);
      const res = await fetch(`/api/catalog?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const random = data.data[Math.floor(Math.random() * data.data.length)];
        setOutfit(random);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      let gender = "";
      if (isSignedIn) {
        try {
          const token = await getToken();
          if (token) {
            const res = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success && data.data?.gender) gender = data.data.gender;
          }
        } catch { /* ignore */ }
      }
      setUserGender(gender);
      await fetchRandom(gender);
    };
    init();
  }, [isSignedIn, getToken]);

  const handleReact = async (r: "like" | "dislike") => {
    if (!outfit || reacting) return;
    setReacting(true);
    setReaction(r);
    try {
      const token = await getToken();
      if (token) {
        await fetch("/api/reactions", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: outfit.id, reaction: r }),
        });
      }
    } catch { /* ignore */ } finally {
      setReacting(false);
    }
    // Auto-advance after like/dislike
    setTimeout(() => fetchRandom(userGender), 600);
  };

  return (
    <div className="flex flex-col min-h-screen bg-warm-white pb-24 animate-in fade-in duration-500">
      <div className="flex items-center space-x-2 pt-4 px-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Sorpréndeme</h1>
          {userGender && <p className="text-xs text-soft-gold capitalize">{userGender === "femenino" ? "✦ Colección Femenina" : "✦ Colección Masculina"}</p>}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 space-y-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="h-12 w-12 text-soft-gold" />
              </motion.div>
              <p className="text-soft-gray font-medium">Eligiendo algo especial para ti...</p>
            </motion.div>
          ) : outfit ? (
            <motion.div key={outfit.id} initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.35 }}>
              <Card className="overflow-hidden border-border/50 shadow-lg">
                <div className="aspect-[4/5] bg-ivory relative overflow-hidden">
                  {outfit.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={outfit.imageUrl} alt={outfit.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-16 w-16 text-soft-gold/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <h2 className="font-serif text-2xl font-medium">{outfit.name}</h2>
                    <p className="text-sm text-white/80 mt-1 line-clamp-2">{outfit.description}</p>
                    {outfit.colorPalette?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {outfit.colorPalette.slice(0, 3).map((c, i) => (
                          <span key={i} className="text-xs bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full capitalize">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Like / Dislike */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReact("dislike")}
                      disabled={reacting}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-medium text-sm ${
                        reaction === "dislike" ? "bg-red-50 border-red-400 text-red-500" : "border-border text-soft-gray hover:border-red-300 hover:text-red-400"
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      No es mi estilo
                    </button>
                    <button
                      onClick={() => handleReact("like")}
                      disabled={reacting}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-medium text-sm ${
                        reaction === "like" ? "bg-emerald-50 border-emerald-400 text-emerald-600" : "border-border text-soft-gray hover:border-emerald-300 hover:text-emerald-500"
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Me encanta
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => router.push(`/assistant/outfit-detail/${outfit.slug}`)}>
                      Ver detalles
                    </Button>
                    <Button className="flex-1 bg-soft-gold hover:bg-soft-gold/90 text-white" onClick={() => fetchRandom(userGender)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Otro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
