"use client";

import { useEffect, useState, useRef } from "react";
import { useUser, SignOutButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User, LogOut, Camera, Loader2, Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

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
          setQuizCompleted(data.data.quizCompleted || false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [getToken, isSignedIn]);

  const handleSave = async (updates: { gender?: string; avatarUrl?: string }) => {
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

  const handleGenderChange = (val: string) => {
    setGender(val);
    handleSave({ gender: val });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarUrl(base64);
      handleSave({ avatarUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const displayAvatar = avatarUrl || user?.imageUrl;

  return (
    <div className="flex flex-col space-y-5 animate-in fade-in pb-28 pt-4 px-4">
      <h1 className="font-serif text-2xl text-charcoal">Mi Perfil</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-soft-gold" />
        </div>
      ) : (
        <>
          {/* Avatar + Name */}
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
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div>
              <h2 className="font-medium text-charcoal text-lg">{user?.fullName || "Usuario"}</h2>
              <p className="text-sm text-soft-gray">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>

          {/* Gender */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border space-y-3">
            <h3 className="font-medium text-charcoal">Tu Género</h3>
            <p className="text-xs text-soft-gray">Personaliza el catálogo y outfits que ves.</p>
            <div className="flex gap-2">
              {[
                { value: "femenino", label: "👩 Mujer" },
                { value: "masculino", label: "👨 Hombre" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleGenderChange(opt.value)}
                  disabled={saving}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                    gender === opt.value
                      ? "border-soft-gold bg-champagne/20 text-charcoal"
                      : "border-border text-soft-gray hover:border-soft-gold/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style Quiz */}
          <button
            onClick={() => router.push("/quiz")}
            className="w-full bg-white p-5 rounded-2xl shadow-sm border border-border flex items-center gap-4 text-left hover:border-soft-gold/50 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-champagne/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-soft-gold" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-charcoal">Mi Perfil de Estilo</p>
                {quizCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </div>
              <p className="text-xs text-soft-gray mt-0.5">
                {quizCompleted
                  ? "Perfil completado · Toca para actualizar"
                  : "Responde el quiz para personalizar tus outfits"}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-soft-gray flex-shrink-0" />
          </button>

          {/* Sign Out */}
          <div className="pt-2">
            <SignOutButton>
              <Button variant="ghost" className="w-full text-error hover:bg-error/10 hover:text-error rounded-xl h-12">
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
