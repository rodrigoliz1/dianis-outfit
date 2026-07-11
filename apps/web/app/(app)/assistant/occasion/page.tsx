"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

type Occasion = {
  id: string;
  slug: string;
  name: string;
  group: string;
};

function OccasionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch from the Next.js API route that proxies to Fastify
    // For now, we simulate fetching the occasions from our backend
    fetch("/api/occasions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOccasions(data.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (slug: string) => {
    router.push(`/assistant/results?mode=${mode}&occasion=${slug}`);
  };

  const groupedOccasions = occasions.reduce((acc, curr) => {
    if (!acc[curr.group]) acc[curr.group] = [];
    acc[curr.group]!.push(curr);
    return acc;
  }, {} as Record<string, Occasion[]>);

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center space-x-2 pt-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-2xl text-charcoal">¿Para qué ocasión?</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedOccasions).map(([group, occs]) => (
            <div key={group}>
              <h2 className="text-sm font-medium text-soft-gray uppercase tracking-wider mb-4">{group}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {occs.map((occ) => (
                  <motion.div key={occ.slug} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Card 
                      className="cursor-pointer hover:border-soft-gold transition-colors text-center"
                      onClick={() => handleSelect(occ.slug)}
                    >
                      <CardContent className="p-4 flex items-center justify-center h-full min-h-[80px]">
                        <span className="font-medium text-charcoal text-sm">{occ.name}</span>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OccasionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-soft-gold" /></div>}>
      <OccasionContent />
    </Suspense>
  );
}
