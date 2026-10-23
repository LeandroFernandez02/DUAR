  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { aplicarAccesibilidadGuardada } from "./app/context/accesibilidad";
  import { iniciarScrollSuave } from "./app/utils/scrollSuave";

  // Tema y accesibilidad guardados, antes del primer pintado (si no, se ve un salto de colores y tamaños).
  document.documentElement.classList.toggle("dark", localStorage.getItem("duar-theme") === "dark");
  aplicarAccesibilidadGuardada();
  iniciarScrollSuave();

  createRoot(document.getElementById("root")!).render(<App />);
