import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Daftar dan masuk udah digabung di /login (satu-satunya jalur emang
      // Google). Redirect ini jaga link/bookmark lama ke /register biar
      // nggak 404. Sengaja nggak permanent biar browser nggak nge-cache-nya.
      { source: "/register", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
