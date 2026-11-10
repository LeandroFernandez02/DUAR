  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { aplicarAccesibilidadGuardada } from "./app/context/accesibilidad";
  import { iniciarScrollSuave } from "./app/utils/scrollSuave";
  import { capturarInstalacion } from "./app/utils/instalacion";

  // Tema y accesibilidad guardados, antes del primer pintado (si no, se ve un salto de colores y tamaños).
  document.documentElement.classList.toggle("dark", localStorage.getItem("duar-theme") === "dark");
  aplicarAccesibilidadGuardada();
  iniciarScrollSuave();
  // App instalable (10/11): el aviso de instalación de Chrome llega una sola vez, al cargar.
  capturarInstalacion();

  createRoot(document.getElementById("root")!).render(<App />);
