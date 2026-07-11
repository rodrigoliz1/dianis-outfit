"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, HeartCrack } from "lucide-react";

import { useAuth } from "@clerk/nextjs";

export default function FavoritesPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
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
  }, [getToken]);

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in pb-24 pt-4">
      <h1 className="font-serif text-2xl text-charcoal">Mis Favoritos</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <HeartCrack className="h-12 w-12 text-border mb-4" />
          <h2 className="font-medium text-charcoal mb-2">Sin favoritos aún</h2>
          <p className="text-sm text-soft-gray">Guarda los outfits que más te gusten para verlos aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {favorites.map((fav, i) => (
             <motion.div key={i}></motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
