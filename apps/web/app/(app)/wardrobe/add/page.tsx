"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Loader2, Camera, Check, Tag, Palette, Thermometer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@clerk/nextjs";

export default function AddWardrobeItemPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "analyzing" | "confirm" | "saving">("upload");
  const [error, setError] = useState<string | null>(null);
  
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    subcategory: "",
    colorFamily: "",
    brand: "",
  });

  // Compress image before upload (important for iPhone which takes 10-15MB photos)
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const maxSize = 2 * 1024 * 1024; // 2MB target
      if (file.size <= maxSize) { resolve(file); return; }
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        let { width, height } = img;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: "image/jpeg" }));
          else resolve(file);
        }, "image/jpeg", 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setPreview(URL.createObjectURL(selected));
      setFile(selected);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep("analyzing");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");

      // Compress before upload
      const compressed = await compressImage(file);
      
      const form = new FormData();
      form.append("file", compressed, compressed.name);

      const res = await fetch("/api/wardrobe/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setAnalysisData(data.data);
        setFormData({
          name: data.data.analysis.name || "Mi Prenda",
          category: data.data.analysis.category || "",
          subcategory: data.data.analysis.subcategory || "",
          colorFamily: data.data.analysis.colorFamily || "",
          brand: data.data.analysis.brand || "",
        });
        setStep("confirm");
      } else {
        throw new Error(data.error || "Error al analizar");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Hubo un error de conexión. Intenta de nuevo.");
      setStep("upload");
    }
  };

  const handleSave = async () => {
    setStep("saving");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");

      const payload = {
        imageUrl: analysisData.imageUrl,
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory,
        colorFamily: formData.colorFamily,
        brand: formData.brand,
        weatherTags: analysisData.analysis.weatherTags || [],
        styleTags: analysisData.analysis.styleTags || [],
        seasons: analysisData.analysis.seasons || [],
        pattern: analysisData.analysis.pattern || null,
        formalityScore: analysisData.analysis.formalityScore || 2,
      };

      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        router.push("/wardrobe");
      } else {
        throw new Error(data.error || "Error al guardar");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Hubo un error. Intenta de nuevo.");
      setStep("confirm");
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 px-4">
      <div className="flex items-center space-x-2 pt-4">
        <Button variant="ghost" size="icon" onClick={() => step === "confirm" ? setStep("upload") : router.back()} className="text-soft-gray -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-2xl text-charcoal">Añadir Prenda</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <Card className="border-border shadow-sm">
        <CardContent className="p-5">
          {(step === "upload" || step === "analyzing") && (
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors ${
                  preview ? "border-soft-gold bg-ivory/50" : "border-border bg-warm-white"
                }`}
                style={{ minHeight: "260px" }}
                onClick={() => !preview && fileInputRef.current?.click()}
              >
                {preview ? (
                  <div className="w-full flex flex-col items-center gap-3 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Preview" className="max-h-[240px] w-auto object-contain rounded-xl shadow-sm" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                      disabled={step === "analyzing"}
                    >
                      Cambiar foto
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 rounded-full bg-ivory mx-auto flex items-center justify-center shadow-sm border border-border/50">
                      <Camera className="h-9 w-9 text-soft-gold" />
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal">Sube una foto de tu prenda</p>
                      <p className="text-sm text-soft-gray mt-1">Buena iluminación, fondo claro</p>
                    </div>
                    <div className="flex flex-col gap-2 items-center">
                      <Button
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="bg-soft-gold hover:bg-soft-gold/90 text-white rounded-full px-6"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Tomar o seleccionar foto
                      </Button>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-charcoal hover:bg-charcoal/90 text-white rounded-full h-12 text-base font-medium"
                disabled={!file || step === "analyzing"}
                onClick={handleAnalyze}
              >
                {step === "analyzing" ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Analizando con IA...</>
                ) : (
                  <><Sparkles className="h-5 w-5 mr-2 text-soft-gold" />Analizar Prenda con IA</>
                )}
              </Button>
              <p className="text-xs text-center text-soft-gray">
                La IA detectará el tipo, color, marca y más detalles de tu prenda.
              </p>
            </div>
          )}

          {(step === "confirm" || step === "saving") && analysisData && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                  <Check className="h-5 w-5" />
                </div>
                <h2 className="font-serif text-xl text-charcoal">¡Prenda detectada!</h2>
                <p className="text-sm text-soft-gray">Revisa y corrige los datos si es necesario.</p>
              </div>

              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={analysisData.imageUrl} alt="Prenda" className="h-36 object-contain rounded-xl shadow border border-border" />
              </div>

              {analysisData.analysis && (
                <div className="bg-ivory rounded-xl p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-soft-gray uppercase tracking-wider">Detectado por IA</p>
                  {analysisData.analysis.styleTags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Tag className="h-3.5 w-3.5 text-soft-gold flex-shrink-0" />
                      {analysisData.analysis.styleTags.map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-white border border-border px-2 py-0.5 rounded-full capitalize">{tag}</span>
                      ))}
                    </div>
                  )}
                  {analysisData.analysis.weatherTags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Thermometer className="h-3.5 w-3.5 text-soft-gold flex-shrink-0" />
                      {analysisData.analysis.weatherTags.map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-white border border-border px-2 py-0.5 rounded-full capitalize">{tag}</span>
                      ))}
                    </div>
                  )}
                  {analysisData.analysis.primaryColorHex && (
                    <div className="flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5 text-soft-gold" />
                      <div className="w-4 h-4 rounded-full border border-border shadow-sm" style={{ backgroundColor: analysisData.analysis.primaryColorHex }} />
                      <span className="text-xs text-soft-gray">{analysisData.analysis.primaryColorHex}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">Nombre de la prenda</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="ej. Blusa de seda beige"
                    className="h-11 text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-sm font-medium">Categoría</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      placeholder="tops"
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subcategory" className="text-sm font-medium">Tipo</Label>
                    <Input
                      id="subcategory"
                      value={formData.subcategory}
                      onChange={e => setFormData({...formData, subcategory: e.target.value})}
                      placeholder="blusa"
                      className="h-11 text-base"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="color" className="text-sm font-medium">Color principal</Label>
                    <Input
                      id="color"
                      value={formData.colorFamily}
                      onChange={e => setFormData({...formData, colorFamily: e.target.value})}
                      placeholder="beige"
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="brand" className="text-sm font-medium">Marca</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      placeholder="Zara"
                      className="h-11 text-base"
                    />
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-soft-gold hover:bg-soft-gold/90 text-white rounded-full h-12 text-base font-semibold shadow-md"
                disabled={step === "saving"}
                onClick={handleSave}
              >
                {step === "saving" ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Guardando...</>
                ) : (
                  "✓ Guardar prenda"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
