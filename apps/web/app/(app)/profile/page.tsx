"use client";

import { useEffect, useState, useRef } from "react";
import { useUser, SignOutButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { User, LogOut, Camera, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setGender(data.data.gender || "");
          setAvatarUrl(data.data.avatarUrl || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [getToken, isSignedIn]);

  const handleSave = async (updates: { gender?: string, avatarUrl?: string }) => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setGender(data.data.gender || "");
        setAvatarUrl(data.data.avatarUrl || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setGender(val);
    handleSave({ gender: val });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarUrl(base64); // Optimistic UI
      handleSave({ avatarUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const displayAvatar = avatarUrl || user?.imageUrl;

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in pb-24 pt-4 px-4">
      <h1 className="font-serif text-2xl text-charcoal">Mi Perfil</h1>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center bg-white p-6 rounded-2xl shadow-sm border border-border text-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-warm-white overflow-hidden flex-shrink-0 border-4 border-white shadow-sm">
                {displayAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-12 w-12 m-5 text-soft-gray" />
                )}
              </div>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-charcoal text-white p-2 rounded-full shadow-md hover:bg-black transition-colors"
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
            </div>
            
            <div>
              <h2 className="font-medium text-charcoal text-lg">{user?.fullName || "Usuaria"}</h2>
              <p className="text-sm text-soft-gray">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-border space-y-4">
              <h3 className="font-medium text-charcoal border-b border-border pb-2">Personalización IA</h3>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-soft-gray uppercase tracking-wider">Tu Género</label>
                <p className="text-xs text-soft-gray/80 mb-2">Usaremos esto para adaptar cómo te quedan los outfits generados.</p>
                <select 
                  className="w-full p-3 rounded-xl bg-warm-white border border-border text-charcoal focus:outline-none focus:border-soft-gold transition-colors"
                  value={gender}
                  onChange={handleGenderChange}
                  disabled={saving}
                >
                  <option value="">No especificado</option>
                  <option value="femenino">Femenino (Mujer)</option>
                  <option value="masculino">Masculino (Hombre)</option>
                  <option value="no binario">No Binario / Neutro</option>
                </select>
              </div>
              
              <div className="text-xs text-soft-gray bg-ivory p-3 rounded-lg border border-border/50">
                <span className="font-medium text-charcoal">Nota sobre tu foto:</span> La IA usará tu foto para adaptar el estilo, pero no realizará un reemplazo exacto de tu rostro (Face Swap) por limitaciones de privacidad y tecnología.
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border/50">
            <SignOutButton>
              <Button variant="ghost" className="w-full text-error hover:bg-error/10 hover:text-error">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </SignOutButton>
          </div>
        </>
      )}
    </div>
  );
}
