import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" keeps asset paths relative so the build works on Vercel and in static previews alike
export default defineConfig({ plugins: [react()], base: "./" });
