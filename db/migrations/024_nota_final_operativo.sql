-- ============================================================================
-- 024 · Reseña de cierre del operativo en su propia columna (CU-10 · CU-41)
-- ============================================================================
-- Recorrido del 19/10: al finalizar, la reseña o conclusión que escribe el
-- coordinador se guardaba EN LUGAR de la descripción del operativo
-- (descripcion = COALESCE(nota, descripcion)): la descripción original se
-- perdía y el informe final mostraba la conclusión como si fuera la descripción.
--
-- Ahora la reseña va en `nota_final` y la descripción queda como se cargó.
--
-- Recupero: la auditoría de la finalización guarda la descripción de antes
-- (valores_previos) y la de después (valores_nuevos). Donde cambió, lo de
-- después era la reseña: va a nota_final y se repone la descripción original.
-- Idempotente.
-- ============================================================================

ALTER TABLE operativos ADD COLUMN IF NOT EXISTS nota_final text;

COMMENT ON COLUMN operativos.nota_final IS
  'Reseña o conclusión que escribe el coordinador al finalizar (CU-10). No pisa la descripción (024, 19/10).';

UPDATE operativos o
   SET nota_final  = la.valores_nuevos->>'descripcion',
       descripcion = la.valores_previos->>'descripcion'
  FROM logs_auditoria la
 WHERE la.entidad_afectada = 'operativos'
   AND la.registro_id = o.id
   AND la.valores_nuevos->>'estado' = 'FINALIZADO'
   AND (la.valores_previos->>'descripcion') IS DISTINCT FROM (la.valores_nuevos->>'descripcion')
   AND o.nota_final IS NULL;
