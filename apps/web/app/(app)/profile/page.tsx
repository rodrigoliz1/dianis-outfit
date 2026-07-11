"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user } = useUser();

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in pb-24 pt-4">
      <h1 className="font-serif text-2xl text-charcoal">Mi Perfil</h1>
      
      <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm border border-border">
        <div className="w-16 h-16 rounded-full bg-warm-white overflow-hidden flex-shrink-0">
          {user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="h-8 w-8 m-4 text-soft-gray" />
          )}
        </div>
        <div>
          <h2 className="font-medium text-charcoal">{user?.fullName || "Usuaria"}</h2>
          <p className="text-sm text-soft-gray">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-border space-y-3">
          <h3 className="font-medium text-charcoal mb-4 border-b border-border pb-2">Preferencias</h3>
          <p className="text-sm text-soft-gray flex justify-between">
            <span>Mostrar zapatos de tacón</span>
            <span className="text-charcoal">Sí</span>
          </p>
          <p className="text-sm text-soft-gray flex justify-between">
            <span>Sugerencias de peinado</span>
            <span className="text-charcoal">Sí</span>
          </p>
          <p className="text-sm text-soft-gray flex justify-between">
            <span>Estilo favorito</span>
            <span className="text-charcoal">Casual elegante</span>
          </p>
          <Button variant="outline" className="w-full mt-4">Editar preferencias</Button>
        </div>
      </div>

      <div className="mt-8">
        <SignOutButton>
          <Button variant="destructive" className="w-full bg-error/10 text-error hover:bg-error/20 border-none shadow-none">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </SignOutButton>
      </div>
    </div>
  );
}
