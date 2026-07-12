/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'fal.media' },
      { protocol: 'https', hostname: 'v3.fal.media' },
    ],
  },
  async rewrites() {
    let apiUrl = process.env.API_URL || "";
    if (apiUrl && !apiUrl.startsWith("http")) apiUrl = "https://" + apiUrl;
    if (apiUrl && apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);

    const destination = apiUrl 
      ? `${apiUrl}/api/:path*`
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
