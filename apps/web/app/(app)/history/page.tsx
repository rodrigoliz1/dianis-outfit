"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";

import { useAuth } from "@clerk/nextjs";

export default function HistoryPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/history", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setHistory(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [getToken]);

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in pb-24 pt-4">
      <h1 className="font-serif text-2xl text-charcoal">Mi Historial</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <Clock className="h-12 w-12 text-border mb-4" />
          <h2 className="font-medium text-charcoal mb-2">Historial vacío</h2>
          <p className="text-sm text-soft-gray">Aquí aparecerán los outfits que vayas usando.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, i) => (
             <div key={i} className="p-4 border border-border rounded-lg bg-white">
               Outfit usado el {new Date(item.wornAt).toLocaleDateString()}
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
