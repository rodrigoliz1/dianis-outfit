"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Loader2, Camera, Check } from "lucide-react";
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
  
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "Mi Prenda",
    category: "",
    colorFamily: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setStep("analyzing");
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");

      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/wardrobe/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form,
      });

      const data = await res.json();
      if (data.success) {
        setAnalysisData(data.data);
        setFormData({
          name: "Mi Prenda",
          category: data.data.analysis.category,
          colorFamily: data.data.analysis.colorFamily,
        });
        setStep("confirm");
      } else {
        alert("Error al analizar prenda");
        setStep("upload");
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error de conexión");
      setStep("upload");
    }
  };

  const handleSave = async () => {
    setStep("saving");
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");

      const payload = {
        imageUrl: analysisData.imageUrl,
        name: formData.name,
        category: formData.category,
        colorFamily: formData.colorFamily,
        weatherTags: analysisData.analysis.weatherTags,
        styleTags: analysisData.analysis.styleTags,
      };

      const res = await fetch("/api/wardrobe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/wardrobe");
      } else {
        alert("Error al guardar prenda");
        setStep("confirm");
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error de conexión");
      setStep("confirm");
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center space-x-2 pt-4">
        <Button variant="ghost" size="icon" onClick={() => step === "confirm" ? setStep("upload") : router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-2xl text-charcoal">Añadir Prenda</h1>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          {(step === "upload" || step === "analyzing") && (
            <div className="space-y-8">
              <div 
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors ${preview ? 'border-soft-gold bg-ivory' : 'border-border bg-warm-white'}`}
                style={{ minHeight: '300px' }}
              >
                {preview ? (
                  <div className="relative w-full h-full flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Preview" className="max-h-[300px] object-contain rounded-lg mb-4 shadow-sm" />
                    <Button variant="outline" onClick={() => { setFile(null); setPreview(null); }} disabled={step === "analyzing"}>
                      Cambiar foto
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-ivory mx-auto flex items-center justify-center shadow-sm">
                      <Camera className="h-8 w-8 text-soft-gold" />
                    </div>
                    <div>
                      <p className="font-medium text-charcoal">Sube una foto de tu prenda</p>
                      <p className="text-sm text-soft-gray mt-1">Buena iluminación, fondo claro</p>
                    </div>
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      variant="secondary"
                      className="mt-2"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar imagen
                    </Button>
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
              
              <div>
                <Button 
                  className="w-full" 
                  variant="default"
                  size="lg"
                  disabled={!file || step === "analyzing"} 
                  onClick={handleAnalyze}
                >
                  {step === "analyzing" ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Analizando con IA...
                    </>
                  ) : (
                    "Analizar Prenda"
                  )}
                </Button>
                <p className="text-xs text-center text-soft-gray mt-4">
                  Nuestra IA analizará automáticamente el color y tipo de prenda.
                </p>
              </div>
            </div>
          )}

          {(step === "confirm" || step === "saving") && analysisData && (
            <div className="space-y-6">
              <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#496B52]/10 text-[#496B52] mx-auto flex items-center justify-center">
                  <Check className="h-6 w-6" />
                </div>
                <h2 className="font-serif text-xl text-charcoal">Esto es lo que encontré</h2>
                <p className="text-sm text-soft-gray">¿Está correcto? Modifica lo que necesites.</p>
              </div>

              <div className="flex justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={analysisData.imageUrl} alt="Analysis" className="h-32 object-contain rounded-md shadow-sm border border-border" />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Input 
                    id="category" 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color Principal</Label>
                  <Input 
                    id="color" 
                    value={formData.colorFamily} 
                    onChange={e => setFormData({...formData, colorFamily: e.target.value})} 
                  />
                </div>
              </div>

              <Button 
                className="w-full mt-6" 
                variant="default"
                size="lg"
                disabled={step === "saving"} 
                onClick={handleSave}
              >
                {step === "saving" ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar prenda"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
