/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    console.log("👉 VERCEL BUILD: La variable API_URL es:", process.env.API_URL || "¡NO ESTÁ DEFINIDA!");
    
    // Si no está definida, forzamos un error en la ruta en lugar de un 404 silencioso
    const destination = process.env.API_URL 
      ? `${process.env.API_URL}/api/:path*`
      : 'https://FALTA-CONFIGURAR-API-URL-EN-VERCEL.com/api/:path*';

    return [
      {
        source: '/api/:path*',
        destination,
      },
    ];
  },
};

export default nextConfig;
