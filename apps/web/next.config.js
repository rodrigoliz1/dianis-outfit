/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    console.log("👉 VERCEL BUILD: La variable API_URL es:", process.env.API_URL || "¡NO ESTÁ DEFINIDA!");
    
    let apiUrl = process.env.API_URL || "";
    // Asegurarse de que tenga http:// o https://
    if (apiUrl && !apiUrl.startsWith("http")) {
      apiUrl = "https://" + apiUrl;
    }
    // Quitar barra final si la tiene
    if (apiUrl && apiUrl.endsWith("/")) {
      apiUrl = apiUrl.slice(0, -1);
    }

    // Si no está definida, forzamos un error en la ruta en lugar de un 404 silencioso
    const destination = apiUrl 
      ? `${apiUrl}/api/:path*`
      : 'https://FALTA-CONFIGURAR-API-URL-EN-VERCEL.com/api/:path*';

    console.log("👉 VERCEL BUILD: Destination configurada como:", destination);

    return [
      {
        source: '/api/:path*',
        destination,
      },
    ];
  },
};

export default nextConfig;
