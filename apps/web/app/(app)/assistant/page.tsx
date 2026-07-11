"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Shirt } from "lucide-react";

export default function AssistantPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center pt-8">
        <h1 className="font-serif text-3xl text-charcoal">¿Cómo elegiremos hoy?</h1>
        <p className="mt-2 text-soft-gray text-sm md:text-base">
          Selecciona una de las opciones para comenzar a buscar el outfit perfecto para ti.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="cursor-pointer hover:border-soft-gold hover:shadow-md transition-all h-full" onClick={() => router.push('/assistant/occasion?mode=curated')}>
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
          <Card className="cursor-pointer hover:border-soft-gold hover:shadow-md transition-all h-full" onClick={() => router.push('/assistant/occasion?mode=wardrobe')}>
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-soft-gold/10 flex items-center justify-center mb-2">
                <Shirt className="w-8 h-8 text-deep-gold" />
              </div>
              <h3 className="font-serif text-xl font-medium">Crear con mi armario</h3>
              <p className="text-sm text-muted-foreground">
                Genera combinaciones utilizando únicamente las prendas reales que tienes guardadas.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex justify-center mt-6">
        <Button variant="ghost" className="text-soft-gray" onClick={() => router.push('/assistant/surprise')}>
          Sorpréndeme
        </Button>
      </div>
    </div>
  );
}
