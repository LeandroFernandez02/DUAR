# Informe de pruebas automatizadas · Sistema DUAR

- **Fecha:** 30/9/26, 9:15 p. m. (hora de Córdoba)
- **Resultado:** 87 de 87 pruebas OK
- **Cómo se corre:** `cd server && npm run test:informe`, con la API local levantada (`npm run dev`).
- **Alcance:** reglas puras del modelo de estados y de composición, y casos de uso de los Módulos 1, 2 y 4 contra la API real. Las pruebas de API corren sobre un operativo y usuarios propios ("PRUEBAS AUTOMÁTICAS - no tocar", auto.*@prueba.duar) y se detienen si encuentran datos ajenos.

## Grupos: composición y clases (CU-21, CU-24, CU-25)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 1 | crear un grupo sin elegir la clase → 400 clase_requerida | CU-21 | ✅ OK | 51 ms |
| 2 | Líder de rastrillaje que no es del DUAR → 409 lider_no_duar | CU-21 | ✅ OK | 239 ms |
| 3 | Líder de rastrillaje que es recurso especial → 409 | CU-21 | ✅ OK | 240 ms |
| 4 | Líder de rastrillaje que es conductor → 409 lider_conductor | CU-21 | ✅ OK | 239 ms |
| 5 | crear con Líder del DUAR → En formación y el Líder queda Agrupado | CU-21 | ✅ OK | 624 ms |
| 6 | nombre de grupo repetido en el operativo → 409 nombre_duplicado | CU-21 | ✅ OK | 335 ms |
| 7 | un recurso especial no entra a un grupo de rastrillaje → 409 | CU-24 | ✅ OK | 334 ms |
| 8 | un recurso especial que va de conductor sí entra a uno de rastrillaje | CU-24 | ✅ OK | 812 ms |
| 9 | no se le saca el conductor a un recurso especial dentro de uno de rastrillaje → 409 | CU-17 | ✅ OK | 192 ms |
| 10 | sacarlo arrastrando a "Sin grupo" lo deja Disponible | CU-24 | ✅ OK | 814 ms |
| 11 | confirmar con una sola persona que rastrilla (el conductor no cuenta) → 409 binomio_minimo | CU-21 | ✅ OK | 859 ms |
| 12 | cambiar el Líder por el conductor → 409 lider_conductor | CU-24 | ✅ OK | 337 ms |
| 13 | cambiar el Líder por alguien que no es del DUAR → 409 lider_no_duar | CU-24 | ✅ OK | 862 ms |
| 14 | la clase del grupo no se puede cambiar → 400 clase_fija | CU-24 | ✅ OK | 50 ms |
| 15 | con dos que rastrillan se confirma | CU-21 | ✅ OK | 575 ms |
| 16 | a un grupo confirmado no se suma gente arrastrando → 409 grupo_no_en_formacion | CU-24 | ✅ OK | 334 ms |
| 17 | un grupo especial lo lidera un recurso especial y se confirma sin requisitos | CU-21 | ✅ OK | 1.1 s |
| 18 | disolver un grupo en la base deja a sus integrantes Disponibles y sin grupo | CU-25 | ✅ OK | 1.5 s |

## Grupos: ciclo de estados y Regla 1 (CU-23, CU-17, CU-25)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 19 | en formación, todos los integrantes están Agrupados | CU-23 | ✅ OK | 51 ms |
| 20 | salir sin estar asignado → 409 transicion_invalida | CU-23 | ✅ OK | 288 ms |
| 21 | confirmar y asignar exige describir la zona → 400 zona_requerida | CU-23 | ✅ OK | 625 ms |
| 22 | asignar con zona → Asignado; los integrantes siguen Agrupados y sin tiempo en el terreno | CU-23 | ✅ OK | 636 ms |
| 23 | salir → Desplegado: todos Desplegados y se abre el tiempo en el terreno de cada uno | CU-23 | ✅ OK | 971 ms |
| 24 | no se disuelve un grupo en el terreno → 409 | CU-25 | ✅ OK | 287 ms |
| 25 | llegar al polígono → Rastrillando; el conductor queda Desplegado con la camioneta | CU-23 | ✅ OK | 770 ms |
| 26 | con grupo, el estado del agente no se cambia a mano → 409 agente_en_grupo | CU-17 | ✅ OK | 146 ms |
| 27 | el Líder de un grupo de rastrillaje no puede pasar a ser conductor → 409 | CU-17 | ✅ OK | 239 ms |
| 28 | sacarle el conductor a alguien que rastrilla lo pone a rastrillar (Regla 1) | CU-17 | ✅ OK | 1.4 s |
| 29 | corregir un estado exige motivo → 400 motivo_requerido | CU-23 | ✅ OK | 51 ms |
| 30 | corregir con motivo → vuelve a Desplegado y arrastra a los integrantes | CU-23 | ✅ OK | 1.5 s |
| 31 | volver → Replegado y llegar a la base → En espera; se cierra el tiempo en el terreno | CU-23 | ✅ OK | 1.8 s |
| 32 | reabrir desde En espera → En formación y todos Agrupados | CU-23 | ✅ OK | 813 ms |
| 33 | disolver en la base → todos Disponibles y sin grupo | CU-25 | ✅ OK | 862 ms |
| 34 | en toda la base, ningún agente contradice el estado de su grupo | Regla 1 | ✅ OK | 52 ms |

## Portal del Líder: avisos del terreno y radio (CU-23)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 35 | el Líder ve su grupo y sabe que lo lidera | Portal | ✅ OK | 149 ms |
| 36 | la radio registra la llegada al polígono → Rastrillando | Portal | ✅ OK | 813 ms |
| 37 | el mismo hecho informado por el Líder después queda como CONFIRMACIÓN | Portal | ✅ OK | 720 ms |
| 38 | reenviar el mismo aviso no lo duplica (idempotencia) | Portal | ✅ OK | 481 ms |
| 39 | un integrante que no es el Líder → RECHAZADO | Portal | ✅ OK | 528 ms |
| 40 | una transición imposible (de Rastrillando a la base) → RECHAZADO y el tablero no se mueve | Portal | ✅ OK | 622 ms |
| 41 | con grupo, el agente no cambia su propio estado → 409 agente_en_grupo | Portal | ✅ OK | 579 ms |
| 42 | sin grupo, el agente se marca No disponible y Disponible | Portal | ✅ OK | 861 ms |
| 43 | un aviso viejo que llega después de un cambio posterior → SUPERADO; el tablero no retrocede | Portal | ✅ OK | 7.9 s |
| 44 | una hora futura del celular se aplica con la hora del servidor y queda marcada no confiable | Portal | ✅ OK | 1.1 s |
| 45 | la del Líder muestra su agrupamiento y cada cambio por cascada | Línea de tiempo | ✅ OK | 152 ms |
| 46 | la del grupo guarda lo rechazado y lo superado, con su fuente | Línea de tiempo | ✅ OK | 152 ms |

## Retiro de un agente en el terreno (CU-26)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 47 | retirar a alguien que no integra el grupo → 409 | CU-26 | ✅ OK | 340 ms |
| 48 | retirar al Líder sin designar sucesor → 409 sucesion_requerida | CU-26 | ✅ OK | 336 ms |
| 49 | el sucesor de un grupo de rastrillaje no puede ser el conductor → 409 | CU-26 | ✅ OK | 336 ms |
| 50 | el sucesor tiene que ser del DUAR → 409 | CU-26 | ✅ OK | 337 ms |
| 51 | retirar al Líder con sucesor del DUAR: el grupo sigue rastrillando con el nuevo Líder | CU-26 | ✅ OK | 670 ms |
| 52 | el retirado queda Replegado y sin grupo, y su período se cierra con el motivo | CU-26 | ✅ OK | 94 ms |
| 53 | si quedaría una sola persona rastrillando (el conductor no cuenta) hay que aceptar el riesgo → 409 | CU-26 | ✅ OK | 335 ms |
| 54 | con el riesgo aceptado el grupo sigue en el terreno y queda la alerta de binomio | CU-26 | ✅ OK | 722 ms |
| 55 | en la base no se retira: se reabre y se saca arrastrando → 409 grupo_no_extraible | CU-26 | ✅ OK | 1.4 s |
| 56 | el retirado, al llegar a la base, se marca Disponible desde su portal | CU-26 | ✅ OK | 431 ms |

## Armado automático (CU-22)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 57 | un tamaño fuera de rango → 400 | CU-22 | ✅ OK | 51 ms |
| 58 | con 5 agentes que rastrillan y tamaño 3 arma 2 grupos y los reparte a todos | CU-22 | ✅ OK | 910 ms |
| 59 | cada grupo es de rastrillaje, En formación, con Líder del DUAR que no maneja y al menos dos integrantes | CU-22 | ✅ OK | 147 ms |
| 60 | el conductor y el recurso especial quedan sin grupo, para sumarlos a mano | CU-22 | ✅ OK | 52 ms |
| 61 | sin agentes del DUAR disponibles para liderar → 409 sin_lideres_duar | CU-22 | ✅ OK | 240 ms |

## Sesión, roles y cuentas (CU-01, CU-04 a CU-07)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 62 | sin sesión no se accede a la API → 401 | CU-01 | ✅ OK | 2 ms |
| 63 | una sesión inventada → 401 | CU-01 | ✅ OK | 50 ms |
| 64 | un agente no gestiona usuarios ni operativos → 403 | CU-04 | ✅ OK | 99 ms |
| 65 | el administrador ve a los administradores en la lista | CU-04 | ✅ OK | 98 ms |
| 66 | el coordinador no ve a ningún administrador en la lista | CU-04 | ✅ OK | 98 ms |
| 67 | el coordinador no puede abrir a un administrador ni ver su auditoría → 404 | CU-04 | ✅ OK | 197 ms |
| 68 | el coordinador no puede editar a un administrador ni cambiarle la clave → 404 | CU-06 | ✅ OK | 199 ms |
| 69 | el coordinador no puede eliminar a un administrador → 404 | CU-07 | ✅ OK | 98 ms |
| 70 | el coordinador no puede crear un administrador → 403 rol_no_permitido | CU-05 | ✅ OK | 244 ms |
| 71 | el coordinador no puede ascender a nadie a administrador → 403 | CU-06 | ✅ OK | 146 ms |
| 72 | nadie cambia su propio rol → 409 propio_rol | CU-06 | ✅ OK | 291 ms |
| 73 | nadie se desactiva ni se elimina a sí mismo → 409 autobloqueo | CU-06/07 | ✅ OK | 248 ms |
| 74 | el coordinador sí edita a un agente | CU-06 | ✅ OK | 384 ms |
| 75 | un id mal formado en la dirección responde 400, no 500 | Errores | ✅ OK | 347 ms |
| 76 | un grupo que no es de este operativo no se encuentra → 404 grupo_no_encontrado | Errores | ✅ OK | 296 ms |

## Reglas puras del modelo de estados y de composición

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 77 | Regla 1: cada estado del grupo define el de sus integrantes | Estados | ✅ OK | 1 ms |
| 78 | Regla 1: el conductor queda Desplegado mientras el grupo rastrilla | Estados | ✅ OK | 0 ms |
| 79 | ningún estado de grupo deja a un integrante en un estado "sin grupo" | Estados | ✅ OK | 0 ms |
| 80 | cada acción sale de estados válidos y llega a un estado del catálogo | Estados | ✅ OK | 0 ms |
| 81 | las acciones del terreno sólo avanzan: salir → llegar → volver → base | Estados | ✅ OK | 0 ms |
| 82 | sólo se disuelve un grupo que está en la base | CU-25 | ✅ OK | 0 ms |
| 83 | el Líder informa sólo hechos del terreno; confirmar, asignar y disolver son del coordinador | Estados | ✅ OK | 0 ms |
| 84 | a un grupo de rastrillaje entra un agente o un conductor, no un recurso especial | CU-21/24 | ✅ OK | 0 ms |
| 85 | Líder de rastrillaje: del DUAR, no recurso especial y no conductor | CU-21/24/26 | ✅ OK | 0 ms |
| 86 | un grupo especial lo lidera cualquiera, incluso un conductor de afuera | CU-21 | ✅ OK | 0 ms |
| 87 | binomio: rastrillan todos menos el conductor | CU-26 | ✅ OK | 0 ms |
