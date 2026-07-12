"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Tag, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@clerk/nextjs";

export default function EditWardrobeItemPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const id = params.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    subcategory: "",
    primaryColor: "",
  });

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        
        const res = await fetch(`/api/wardrobe/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const item = data.data;
          setFormData({
            name: item.name || "",
            category: item.category || "",
            subcategory: item.subcategory || "",
            primaryColor: item.primaryColor || "",
          });
          setImageUrl(item.imageUrl || null);
        } else {
          alert("Prenda no encontrada");
          router.push("/wardrobe");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [getToken, id, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");

      const payload = {
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory,
        primaryColor: formData.primaryColor,
      };

      const res = await fetch(`/api/wardrobe/${id}`, {
        method: "PUT",
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
        alert("Error al editar prenda");
        setSaving(false);
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error de conexión");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center space-x-2 pt-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-soft-gray">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-serif text-2xl text-charcoal">Editar Prenda</h1>
      </div>

      <Card className="border-border">
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
            </div>
          ) : (
            <div className="space-y-6">
              {imageUrl && (
                <div className="w-full flex justify-center mb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Prenda" className="max-h-[250px] object-contain rounded-lg shadow-sm" />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-charcoal font-medium">Nombre de la prenda</Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="border-soft-gold/30 focus:border-soft-gold"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-charcoal font-medium flex items-center">
                      <Tag className="w-3 h-3 mr-1 text-soft-gold" /> Categoría
                    </Label>
                    <Input 
                      id="category" 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="border-soft-gold/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcategory" className="text-charcoal font-medium">Subcategoría</Label>
                    <Input 
                      id="subcategory" 
                      value={formData.subcategory}
                      onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
                      className="border-soft-gold/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor" className="text-charcoal font-medium flex items-center">
                    <Palette className="w-3 h-3 mr-1 text-soft-gold" /> Color Principal
                  </Label>
                  <Input 
                    id="primaryColor" 
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                    className="border-soft-gold/30"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full bg-soft-gold hover:bg-gold-dark text-white rounded-full h-12 shadow-md hover:shadow-lg transition-all"
                >
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
