import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import rehypeExternalLinks from "rehype-external-links";

// https://vite.dev/config/
export default defineConfig({
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:3000/", // Your Express port
                // changeOrigin: true,
                // rewrite: (path) => path.replace(/^\/api/, '')
            },
        },
    },
    plugins: [
        react(),
        tailwindcss(),
        mdx({
            rehypePlugins: [
                [
                    rehypeExternalLinks,
                    {
                        target: "_blank",
                        rel: ["noopener", "noreferrer"],
                    },
                ],
            ],
        }),
    ],
});
