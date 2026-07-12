"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Loader2, Search, Shirt, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@clerk/nextjs";

type WardrobeItem = {
  id: string;
  imageUrl: string | null;
  name: string;
  category: string;
  primaryColor: string | null;
  subcategory: string | null;
};

export default function WardrobePage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      
      const res = await fetch("/api/wardrobe", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [getToken]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres borrar esta prenda?")) return;
    setDeletingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/wardrobe/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (e) {
      console.error(e);
      alert("Error al borrar prenda.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between pt-4 px-4">
        <h1 className="font-serif text-2xl text-charcoal">Mi Armario</h1>
        <Button onClick={() => router.push("/wardrobe/add")} size="icon" className="rounded-full h-10 w-10">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative mx-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-soft-gray" />
        <Input placeholder="Buscar prendas..." className="pl-9 bg-white" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 rounded-full bg-warm-white flex items-center justify-center mb-4 text-soft-gray">
            <Shirt className="h-8 w-8" />
          </div>
          <h2 className="font-medium text-charcoal mb-2">Tu armario está vacío</h2>
          <p className="text-sm text-soft-gray mb-6">Agrega prendas para que podamos armar outfits con tu propia ropa.</p>
          <Button variant="outline" onClick={() => router.push("/wardrobe/add")}>
            Agregar mi primera prenda
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className="overflow-hidden h-full group relative">
                <div className="absolute top-2 right-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex space-x-1">
                  <Button size="icon" variant="destructive" className="h-7 w-7 rounded-full shadow" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}>
                    {deletingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="aspect-square bg-warm-white relative">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name || item.category} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-warm-white">
                      <Shirt className="h-10 w-10 text-border" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium capitalize truncate">{item.name || item.subcategory || item.category}</p>
                  <p className="text-xs text-soft-gray capitalize">{item.primaryColor}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
