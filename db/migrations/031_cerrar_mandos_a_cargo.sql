-- ============================================================================
-- 031 · Cierre de los «coordinador a cargo» abiertos (02/11) — APLICAR AL PUBLICAR
-- ============================================================================
-- Con la 030 el responsable del operativo pasa a ser el Jefe de Operativo y el código
-- nuevo ya no lee ni escribe mando_operativo. Esta migración cierra los períodos que
-- quedaron abiertos, con la hora en que se aplica. No va antes de publicar el código
-- nuevo: el anterior mostraría esos operativos «sin coordinador a cargo». Idempotente.
-- ============================================================================

-- El «a cargo» deja de existir: los mandos abiertos se cierran con la hora de la migración.
UPDATE mando_operativo
   SET hasta = clock_timestamp(), cerrado_por = usuario_id,
       motivo_fin = 'El responsable del operativo pasa a ser el Jefe de Operativo'
 WHERE hasta IS NULL;
