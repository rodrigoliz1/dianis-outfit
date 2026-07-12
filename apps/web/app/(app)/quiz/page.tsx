"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";

type Question = {
  id: string;
  question: string;
  emoji: string;
  type: "single" | "multi";
  options: { value: string; label: string; emoji?: string }[];
};

const QUESTIONS: Question[] = [
  {
    id: "lifestyle",
    question: "¿Cómo describirías tu estilo de vida?",
    emoji: "🌟",
    type: "single",
    options: [
      { value: "profesional", label: "Profesional / Ejecutivo", emoji: "💼" },
      { value: "creativo", label: "Creativo / Artístico", emoji: "🎨" },
      { value: "casual", label: "Casual / Relajado", emoji: "☕" },
      { value: "activo", label: "Activo / Deportivo", emoji: "🏃" },
      { value: "socialite", label: "Social / Nocturno", emoji: "🥂" },
    ],
  },
  {
    id: "occasions",
    question: "¿Para qué ocasiones vistes más frecuentemente?",
    emoji: "📅",
    type: "multi",
    options: [
      { value: "oficina", label: "Trabajo / Oficina", emoji: "🏢" },
      { value: "salidas", label: "Salidas con amigos", emoji: "👯" },
      { value: "citas", label: "Citas románticas", emoji: "💕" },
      { value: "eventos", label: "Eventos y fiestas", emoji: "🎉" },
      { value: "casa", label: "Quedarse en casa", emoji: "🏠" },
      { value: "deporte", label: "Ejercicio / Deporte", emoji: "⚡" },
    ],
  },
  {
    id: "palette",
    question: "¿Qué paleta de colores prefieres?",
    emoji: "🎨",
    type: "multi",
    options: [
      { value: "neutros", label: "Neutros (beige, camel, crema)", emoji: "🤍" },
      { value: "oscuros", label: "Oscuros (negro, marino, gris)", emoji: "🖤" },
      { value: "pasteles", label: "Pasteles (rosa, lila, menta)", emoji: "🌸" },
      { value: "vibrantes", label: "Vibrantes (rojo, verde, azul)", emoji: "🌈" },
      { value: "terrosos", label: "Terrosos (marrón, terracota)", emoji: "🍂" },
      { value: "metalicos", label: "Metálicos (dorado, plateado)", emoji: "✨" },
    ],
  },
  {
    id: "formality",
    question: "¿Cómo prefieres verte generalmente?",
    emoji: "👗",
    type: "single",
    options: [
      { value: "muy-formal", label: "Muy formal, siempre elegante", emoji: "👑" },
      { value: "smart-casual", label: "Smart casual, pulido pero cómodo", emoji: "✨" },
      { value: "casual", label: "Casual y relajado", emoji: "😎" },
      { value: "varia", label: "Varía mucho según el día", emoji: "🔄" },
    ],
  },
  {
    id: "comfort",
    question: "¿Qué priorizas al elegir una prenda?",
    emoji: "💭",
    type: "single",
    options: [
      { value: "comodidad", label: "Comodidad ante todo", emoji: "🛋️" },
      { value: "estilo", label: "Estilo y tendencia", emoji: "👠" },
      { value: "calidad", label: "Calidad y materiales", emoji: "💎" },
      { value: "equilibrio", label: "Equilibrio entre todo", emoji: "⚖️" },
    ],
  },
  {
    id: "avoid",
    question: "¿Qué evitas usar?",
    emoji: "🚫",
    type: "multi",
    options: [
      { value: "estampados", label: "Estampados llamativos", emoji: "🐆" },
      { value: "colores-brillantes", label: "Colores muy brillantes", emoji: "🌈" },
      { value: "muy-ajustado", label: "Ropa muy ceñida", emoji: "📐" },
      { value: "muy-holgado", label: "Ropa muy holgada", emoji: "🎈" },
      { value: "tacones-altos", label: "Tacones muy altos", emoji: "👠" },
      { value: "nada", label: "No tengo restricciones", emoji: "✅" },
    ],
  },
  {
    id: "inspiration",
    question: "¿Qué estilo te inspira más?",
    emoji: "💫",
    type: "single",
    options: [
      { value: "minimalista", label: "Minimalista y limpio", emoji: "⬜" },
      { value: "romantico", label: "Romántico y femenino", emoji: "🌷" },
      { value: "urbano", label: "Urbano y moderno", emoji: "🏙️" },
      { value: "clasico", label: "Clásico y atemporal", emoji: "🎩" },
      { value: "bohemio", label: "Bohemio y artístico", emoji: "🌻" },
      { value: "sexy-elegante", label: "Sexy y elegante", emoji: "🔥" },
    ],
  },
];

export default function StyleQuizPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [step, setStep] = useState(0); // 0 = intro, 1..N = questions, N+1 = done
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);

  const total = QUESTIONS.length;
  const isIntro = step === 0;
  const isDone = step > total;
  const currentQ = QUESTIONS[step - 1];

  const toggleMulti = (qId: string, val: string) => {
    const prev = (answers[qId] as string[]) || [];
    const next = prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val];
    setAnswers({ ...answers, [qId]: next });
  };

  const setSingle = (qId: string, val: string) => {
    setAnswers({ ...answers, [qId]: val });
  };

  const canNext = () => {
    if (!currentQ) return true;
    const ans = answers[currentQ.id];
    if (currentQ.type === "single") return !!ans;
    return Array.isArray(ans) && ans.length > 0;
  };

  const handleNext = async () => {
    if (step < total) {
      setStep(step + 1);
    } else {
      // Save quiz
      setSaving(true);
      try {
        const token = await getToken();
        if (token) {
          await fetch("/api/quiz", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ answers }),
          });
        }
      } catch { /* ignore */ }
      setStep(step + 1);
      setSaving(false);
    }
  };

  const progress = step === 0 ? 0 : Math.round((step / total) * 100);

  return (
    <div className="min-h-screen bg-warm-white flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center pt-4 px-4 gap-2">
        <Button variant="ghost" size="icon" onClick={() => step > 0 && !isDone ? setStep(step - 1) : router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {!isIntro && !isDone && (
          <div className="flex-1">
            <div className="flex justify-between text-xs text-soft-gray mb-1">
              <span>Pregunta {step} de {total}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-soft-gold rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col px-4 pt-6">
        <AnimatePresence mode="wait">
          {/* INTRO */}
          {isIntro && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center space-y-6 pt-8">
              <div className="w-24 h-24 rounded-full bg-champagne/30 flex items-center justify-center">
                <Sparkles className="h-12 w-12 text-soft-gold" />
              </div>
              <div>
                <h1 className="font-serif text-3xl text-charcoal">Tu Perfil de Estilo</h1>
                <p className="text-soft-gray mt-3 leading-relaxed">
                  Responde {total} preguntas rápidas y nuestra IA construirá un perfil único para darte recomendaciones perfectas para ti.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                {["Outfits personalizados", "Sorpresas acertadas", "Estilo que evoluciona", "Recomendaciones únicas"].map((benefit) => (
                  <div key={benefit} className="bg-ivory border border-border/60 rounded-xl p-3 text-sm text-charcoal flex items-center gap-2">
                    <Check className="h-4 w-4 text-soft-gold flex-shrink-0" />
                    {benefit}
                  </div>
                ))}
              </div>
              <Button className="w-full bg-soft-gold hover:bg-soft-gold/90 text-white rounded-full h-12 text-base font-semibold mt-4"
                onClick={() => setStep(1)}>
                Comenzar Quiz <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* QUESTIONS */}
          {!isIntro && !isDone && currentQ && (
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }} className="flex flex-col space-y-6">
              <div className="text-center">
                <span className="text-4xl">{currentQ.emoji}</span>
                <h2 className="font-serif text-xl text-charcoal mt-3 leading-snug">{currentQ.question}</h2>
                {currentQ.type === "multi" && <p className="text-xs text-soft-gray mt-1">Selecciona todas las que apliquen</p>}
              </div>

              <div className="space-y-2.5">
                {currentQ.options.map((opt) => {
                  const isSelected = currentQ.type === "single"
                    ? answers[currentQ.id] === opt.value
                    : ((answers[currentQ.id] as string[]) || []).includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => currentQ.type === "single" ? setSingle(currentQ.id, opt.value) : toggleMulti(currentQ.id, opt.value)}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-soft-gold bg-champagne/20 text-charcoal"
                          : "border-border bg-white text-soft-gray hover:border-soft-gold/40"
                      }`}
                    >
                      {opt.emoji && <span className="text-xl flex-shrink-0">{opt.emoji}</span>}
                      <span className="font-medium text-sm">{opt.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-soft-gold ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <Button
                className="w-full bg-charcoal hover:bg-charcoal/90 text-white rounded-full h-12 text-base font-medium"
                disabled={!canNext() || saving}
                onClick={handleNext}
              >
                {step === total ? (saving ? "Guardando..." : "Ver mi perfil de estilo ✨") : "Siguiente"}
                {step < total && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </motion.div>
          )}

          {/* DONE */}
          {isDone && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center space-y-6 pt-12">
              <motion.div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
                <Check className="h-12 w-12 text-emerald-500" />
              </motion.div>
              <div>
                <h2 className="font-serif text-3xl text-charcoal">¡Perfil creado!</h2>
                <p className="text-soft-gray mt-3 leading-relaxed">
                  Tu perfil de estilo está listo. La IA usará tus preferencias para personalizar cada recomendación. 
                  Puedes actualizar tu perfil cuando quieras.
                </p>
              </div>
              <div className="w-full space-y-3">
                <Button className="w-full bg-soft-gold hover:bg-soft-gold/90 text-white rounded-full h-12 text-base font-semibold"
                  onClick={() => router.push("/assistant")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ver mis outfits personalizados
                </Button>
                <Button variant="outline" className="w-full rounded-full h-12"
                  onClick={() => router.push("/profile")}>
                  Volver a mi perfil
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
