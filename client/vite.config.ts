import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("../package.json", "utf-8"));

export default defineConfig({
  plugins: [
    react(),
    {
      name: "version-tag",
      transformIndexHtml(html) {
        return html.replace(
          "</head>",
          `  <meta name="app-version" content="${pkg.version}">\n  </head>`
        );
      }
    }
  ],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        banner: `/*! TeaDraw Version: ${pkg.version} */`
      }
    }
  },
  esbuild: {
    banner: `/*! TeaDraw Version: ${pkg.version} */`,
    legalComments: "inline"
  },
  server: {
    host: true,
    port: 5173
  }
});

