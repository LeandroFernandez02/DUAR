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
  // iPhone con la app instalada: el contenido de arriba baja un poco más que la zona del reloj
  // (la transparencia de iOS la excede). Ver --reloj-arriba en theme.css.
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) {
    document.documentElement.classList.add("ios-app");
  }

  // La franja del reloj y la batería toma el color del encabezado (blanco o, en modo oscuro, el
  // gris de la barra superior), y lo sigue cuando la persona cambia el tema.
  const colorBarra = () => {
    const color = getComputedStyle(document.documentElement).getPropertyValue("--cabecera-movil").trim() || "#ffffff";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  };
  colorBarra();
  new MutationObserver(colorBarra).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  createRoot(document.getElementById("root")!).render(<App />);
