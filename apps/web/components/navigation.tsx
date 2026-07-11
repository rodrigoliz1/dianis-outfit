"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Shirt, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/assistant", icon: Search, label: "Elegir" },
  { href: "/wardrobe", icon: Shirt, label: "Armario" },
  { href: "/favorites", icon: Heart, label: "Favoritos" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-ivory/80 backdrop-blur-md pb-safe md:hidden shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center w-full h-full space-y-1 text-xs transition-colors",
              isActive ? "text-deep-gold" : "text-soft-gray hover:text-charcoal"
            )}
          >
            <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
            <span className="font-medium">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-px left-1/2 h-0.5 w-12 -translate-x-1/2 rounded-full bg-soft-gold"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-[100dvh] border-r border-border bg-ivory p-6">
      <div className="mb-12 text-center">
        <h2 className="font-serif text-2xl font-medium text-charcoal">Dianis Outfit</h2>
      </div>
      <nav className="flex flex-col space-y-4 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors",
                isActive ? "bg-soft-gold/10 text-deep-gold font-medium" : "text-soft-gray hover:bg-warm-white hover:text-charcoal"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
