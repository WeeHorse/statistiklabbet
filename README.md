# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Statistiklabbet

  En enkel frontend-app på svenska för att träna statistik i sjuan tillsammans med barn.

  Första versionen innehåller:

  - inmatning av ett värde i taget
  - visualisering som dragbara klossar
  - möjlighet att kasta ett värde i papperskorgen
  - automatisk beräkning av medelvärde, median, typvärde och värdespridning

  ## Kom igång

  ```bash
  npm install
  npm run dev
  ```

  ## Nästa steg

  - lägga till diagram
  - bygga en separat vy för kombinatorik
  - lägga till uppgifter eller små övningar direkt i appen
])
