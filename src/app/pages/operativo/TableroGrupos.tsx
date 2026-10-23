/**
 * Pestaña "Grupos" del panel de Agentes (CU-24 paso 1) — el tablero del
 * Coordinador para CU-22 a CU-27, contra la API real.
 *
 * Tiempo real = consulta periódica cada 10 s (decisión del 22/09: Vercel no
 * sostiene WebSockets) más recarga inmediata después de cada acción propia.
 * Así el Coordinador ve en ≤10 s lo que el Líder marca desde su portal. La
 * consulta se pausa con la pestaña del navegador oculta y durante un arrastre,
 * para no re-renderizar el tablero debajo del cursor.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Users, AlertCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  agentesOperativoApi, gruposApi, ApiError,
  type AccionGrupo, type GrupoApi, type IntegranteGrupoApi, type PersonalOperativoApi,
} from '../../services/api';
import { Vacio } from '../../components/shared/Listados';
import GruposDnD, { hayArrastreEnCurso, type AgenteTablero } from './GruposDnD';
import ExtraerAgenteModal from '../../components/shared/ExtraerAgenteModal';
import LineaTiempoModal from '../../components/shared/LineaTiempoModal';
import {
  CrearGrupoModal, EditarGrupoModal, AccionGrupoModal, ArmadoAutomaticoModal, DisolverGrupoModal,
} from '../../components/shared/GrupoModales';

const INTERVALO_MS = 10_000;

interface Props {
  operativoId: string;
  /** Operativo finalizado o eliminado: se puede mirar, no reorganizar. */
  soloLectura: boolean;
  /** Cuántos grupos hay (para el subtítulo de la sección). */
  onCantidad?: (n: number) => void;
}

/** Lo que el padre (Agentes.tsx) puede pedirle al tablero desde su propia cabecera. */
export interface TableroGruposHandle {
  abrirCrear: () => void;
}

const TableroGrupos = forwardRef<TableroGruposHandle, Props>(function TableroGrupos({ operativoId, soloLectura, onCantidad }, ref) {
  const [grupos, setGrupos] = useState<GrupoApi[]>([]);
  const [personal, setPersonal] = useState<PersonalOperativoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [crear, setCrear] = useState(false);
  useImperativeHandle(ref, () => ({ abrirCrear: () => setCrear(true) }), []);
  const [armado, setArmado] = useState(false);
  const [editar, setEditar] = useState<GrupoApi | null>(null);
  const [disolver, setDisolver] = useState<GrupoApi | null>(null);
  const [retirar, setRetirar] = useState<{ grupo: GrupoApi; integrante: IntegranteGrupoApi } | null>(null);
  const [accion, setAccion] = useState<{ grupo: GrupoApi; accion: AccionGrupo } | null>(null);
  const [historia, setHistoria] = useState<GrupoApi | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [g, p] = await Promise.all([gruposApi.listar(operativoId), agentesOperativoApi.listar(operativoId)]);
      setGrupos(g.grupos);
      setPersonal(p.personal);
      setError(null);
    } catch (err) {
      // CU-24 (Fracaso): se avisa la desconexión en vez de dejar un tablero viejo como si fuera actual.
      setError(err instanceof ApiError ? err.message : 'Sin conexión con el servidor: el tablero puede estar desactualizado.');
    } finally {
      setCargando(false);
    }
  }, [operativoId]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (!cargando) onCantidad?.(grupos.length); }, [cargando, grupos.length, onCantidad]);

  // Consulta periódica. Los modales trabajan sobre `vigente(...)`, así que
  // refrescar con uno abierto no les pisa lo que el usuario está escribiendo.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible' || hayArrastreEnCurso()) return;
      cargar();
    }, INTERVALO_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', alVolver); };
  }, [cargar]);

  // El modal trabaja sobre la versión más nueva del grupo que tiene abierto.
  const vigente = (g: GrupoApi | null) => (g ? grupos.find(x => x.id === g.id) ?? g : null);

  // Sólo un agente DISPONIBLE entra a un grupo. Sin grupo también puede haber
  // No disponibles y Replegados (retirados por CU-27 que vuelven): no se muestran
  // en el tablero (CU-24 obs. 2) y se habilitan desde la sección Agentes o su portal.
  const sinGrupo: AgenteTablero[] = useMemo(
    () => personal.filter(a => !a.grupoId && a.estado === 'DISPONIBLE'),
    [personal]
  );
  const disponiblesSinGrupo = personal.filter(a => !a.grupoId && a.estado === 'DISPONIBLE');
  // La asignación automática sólo reparte agentes de rastrillaje: los recursos especiales
  // (26/09) y los conductores (28/09, esperan en la camioneta) se suman a mano.
  const agentesSinGrupo = disponiblesSinGrupo.filter(a => !a.esRecursoCritico && !a.esConductor);
  const nombres = grupos.map(g => g.nombre);

  const mover = async (agente: AgenteTablero, destino: GrupoApi | null) => {
    setAviso(null);
    const nombre = `${agente.nombre} ${agente.apellido}`;
    try {
      await gruposApi.mover(operativoId, agente.id, destino?.id ?? null);
      toast(destino ? `${nombre} sumado a ${destino.nombre}` : `${nombre} quedó sin grupo`);
    } catch (err) {
      setAviso(err instanceof ApiError ? err.message : 'No se pudo mover al agente.');
    }
    await cargar();
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: 'var(--muted-foreground)' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  // CU-24 paso 3.1: tablero vacío.
  if (personal.length === 0 && grupos.length === 0) {
    return (
      <Vacio icono={Users} titulo="Aún no hay agentes asignados a este operativo"
        texto="Sumá personal desde la sección Agentes o con el QR del operativo, y después armá los grupos acá." />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]" style={{ background: 'color-mix(in srgb, #d97706 calc(10% + var(--tinte-oscuro, 0%) * 0.08), transparent)', border: '1px solid color-mix(in srgb, #d97706 30%, transparent)', color: 'color-mix(in srgb, #fcd34d var(--tinte-oscuro, 0%), #92400e)', fontSize: 'var(--text-label)' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}
      {aviso && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--radius-input)]" style={{ background: 'color-mix(in srgb, var(--destructive) calc(10% + var(--tinte-oscuro, 0%) * 0.1), transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 30%, transparent)', color: 'color-mix(in srgb, #fca5a5 var(--tinte-oscuro, 0%), #b91c1c)', fontSize: 'var(--text-label)' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span className="flex-1">{aviso}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      )}

      <GruposDnD
        grupos={grupos}
        sinGrupo={sinGrupo}
        editable={!soloLectura}
        onMover={mover}
        onEditar={setEditar}
        onDisolver={setDisolver}
        onRetirar={(grupo, integrante) => setRetirar({ grupo, integrante })}
        onArmadoAutomatico={() => setArmado(true)}
        onAccion={(grupo, a) => setAccion({ grupo, accion: a })}
        onLineaTiempo={setHistoria}
        onAviso={t => toast(t)}
        onNuevoGrupo={() => setCrear(true)}
      />

      {crear && (
        <CrearGrupoModal operativoId={operativoId} disponibles={disponiblesSinGrupo} nombresUsados={nombres}
          onClose={() => setCrear(false)} onCreado={cargar} />
      )}
      {armado && (
        <ArmadoAutomaticoModal operativoId={operativoId} disponibles={agentesSinGrupo.length}
          lideresDuar={agentesSinGrupo.filter(a => a.esDuar).length}
          recursosEspeciales={disponiblesSinGrupo.length - agentesSinGrupo.length}
          onClose={() => setArmado(false)} onHecho={cargar} />
      )}
      {editar && (
        <EditarGrupoModal operativoId={operativoId} grupo={vigente(editar)!} nombresUsados={nombres}
          onClose={() => setEditar(null)} onGuardado={cargar}
          onCorregirEstado={() => { const g = vigente(editar)!; setEditar(null); setAccion({ grupo: g, accion: 'corregir' }); }} />
      )}
      {disolver && (
        <DisolverGrupoModal grupo={vigente(disolver)!} onClose={() => setDisolver(null)}
          onConfirmar={async () => { await gruposApi.disolver(operativoId, disolver.id); await cargar(); }} />
      )}
      {retirar && (
        <ExtraerAgenteModal operativoId={operativoId} grupo={vigente(retirar.grupo)!} integrante={retirar.integrante}
          onClose={() => setRetirar(null)} onHecho={cargar} />
      )}
      {accion && (
        <AccionGrupoModal operativoId={operativoId} grupo={vigente(accion.grupo)!} accion={accion.accion}
          onClose={() => setAccion(null)} onHecho={cargar} />
      )}
      {historia && (
        <LineaTiempoModal vista="grupo" titulo={`Historia de ${historia.nombre}`}
          subtitulo="Cada cambio con la hora en que pasó, quién lo informó y por qué vía."
          cargar={() => gruposApi.lineaTiempo(operativoId, historia.id).then(r => r.eventos)}
          onClose={() => setHistoria(null)} />
      )}
    </div>
  );
});

export default TableroGrupos;
