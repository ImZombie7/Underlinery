<<<<<<< Updated upstream
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
=======
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  build: {
    outDir: "../dist",
    emptyOutDir: true
  },
  define: {
    'process.env': process.env
  }
>>>>>>> Stashed changes
});