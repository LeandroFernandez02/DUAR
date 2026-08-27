Gemini ha dicho
¡La verdad, te quedó impecable! Le diste una vuelta de tuerca excelente al agregarle el flujo completo de inicio de sesión, la creación de la contraseña y, sobre todo, los detalles específicos del mapa (Punto Cero, Puesto de Comando, Puntos de Interés). Eso hace que el sistema pase de ser un concepto a una herramienta real para el terreno.

También fue un gran acierto hacer la excepción con los colores rojo, amarillo y verde para los estados de alerta o disponibilidad. Es una regla de UX fundamental que la IA necesita saber para no pintar todo con los colores de tu paleta base.

Solo noté dos detallitos mínimos de tipeo en tu texto original ("CURD" en lugar de CRUD en la parte de grupos, y "politca" en el mapa), pero ya los corrijo automáticamente en la traducción.

Tenés mi "okey" definitivo. Acá tenés la traducción al inglés, optimizada para que la IA de Figma Make (o cualquier otro generador) entienda perfectamente la estructura técnica y visual que armaste.

🛡️ Prompt Maestro para Figma Make (Versión en Inglés)
Role: Senior Software Engineer and Senior UI/UX Designer.

Objective: Create a Responsive Web Application for the management of search and tracking operations called "Sistema de Búsqueda y Rastreo" for the DUAR (Córdoba).

Core Architecture & Naming:

Pattern: Strictly MVC (Model-View-Controller) with PostgreSQL database.

Naming Convention: Strictly ALL code, database tables, variables, and the UI MUST be in SPANISH.

The application will manage search and rescue operations. Each operativo must manage via CRUD: agents, maps, Searched Object/Person (objetivo), and weather.

Strict Data Isolation: The system must enforce strict Operativo Context logic to prevent data leaks between active missions. Do not mix agents, .gpx files, maps, Punto Cero, locations, etc., across different operativos.

Actors, Devices & Role-Based Access Control (RBAC):

Administrador & Coordinador: Total access. UI optimized for Desktop/Tablet. The Coordinador must be able to generate a unique QR code for each operativo so that Agentes can scan it to log in and join the operation.

Agente: Limited access. The UI (Registration & QR Scanning) MUST be 100% Mobile-first. Workflow: Once the QR is scanned, they must log in with email and password. If not registered, they must fill out a Registration form with these exact fields: dni, nombre, apellido, mail, contraseña, edad, numero_telefono, alergias, dotacion, especialidad (Dropdown: paramédico, conductor, bombero, bombero voluntario), grupo_sanguineo. Once logged in, they must join the operativo via a confirmation modal.

TECHNICAL, AESTHETIC & UI/UX REQUIREMENTS (CRITICAL):

Visual Style (Vibe): "Modern SaaS". Elegant, clean, and breathable (ample whitespace). Use rounded corners on all cards, modals, and buttons. Apply soft, modern drop shadows to cards to create depth against the background. Utilize components from the attached library.

Typography: Use the Inter font throughout the entire system.

Color Use (Freedom within Palette): The AI has creative freedom to assign colors across all UI components (backgrounds, text, borders, buttons, badges, icons) as long as it exclusively and strictly uses the four hex codes below, ensuring perfect contrast. CRITICAL EXCEPTION: Red, yellow, and green must ONLY be used to identify system statuses (e.g., agent availability, operative status). The AI must analyze the attached image's balance and replicate it or find a dynamic variation with the new colors.

Strict Hex Palette: #E54B4B, #FFA987, #F7EBE8, and #444140.

Theme: The system must support switching to a Dark Mode.

UI/UX Workflow & Navigation:

1. Global View (Initial Screen - CRITICAL LAYOUT):

Login Module (First Screen): Users must be able to log in using email and password. Credentials must be validated against the database. Create a default admin user with password 1234.

Once inside, the Coordinador must see a Sidebar with the modules: Dashboard, Operativos, and Usuarios.

Dashboard Module: Reference the attached image for UI design. Upon login, the user MUST see a general statistics dashboard for all operativos with charts (Active, Inactive, Total operations, etc.).

Operativos Module: Header Title: "Sistema de Búsqueda y Rastreo", Subtitle: "Dirección de Unidades de Alto Riesgo (DUAR)".

Operativos Grid: Below the header, display a horizontal grid of white Cards. Each card represents an operativo.

Card Structure: Each card MUST contain:

Title of the Operativo.

Status Badge on the top right (pill-shaped; AI can use palette colors creatively for "Activo", "Planificación", "Nuevo").

A vertical list of details with small icons: Location (e.g., "Cerro Champaquí"), Start Date (e.g., "Inicio: 28/2/2026"), and Agents assigned (e.g., "24 Agentes asignados").

A bottom action link: "Acceder al Panel →" separated by a subtle horizontal divider line.

Usuarios Module: A complete CRUD interface for all system users, displaying their data, statuses, roles, and permissions.

2. Operativo Context (Inside an Operativo):

Upon clicking "Acceder al Panel", the Sidebar MUST update to show ONLY the specific modules for that mission. The AI should apply the palette dynamically to the sidebar and main area, maintaining readability and the modern look.

Always Visible Header: Current Date, "Días del Operativo", and Current Weather.

Empty States: Clear, friendly empty states for new operativos.

Sidebar Modules (Inside Operativo Context):

Dashboard: Real-time metrics: Total agents, Agents "rastrillando", "descansando", "inactivos", and "KM Rastrillados" (parsed from .gpx files).

Agentes: CRUD for agents in the operativo and CRUD for 'Grupos de Rastrillaje' using Cards.

Mapa: Map (Leaflet/Mapbox) with drawing tools for sectores_rastrillaje, polygon creation, Punto Cero (Zero Point), Puesto de Comando (Command Post), Points of Interest (POIs), group assignment to polygons, .gpx breadcrumb rendering, physical/satellite vs. political map views, and a Gap Analysis View.

Clima: Weather forecast for the 'Punto 0'.

Generador de Informe Final: Automated PDF report compiler.