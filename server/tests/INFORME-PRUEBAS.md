# Informe de pruebas automatizadas · Sistema DUAR

- **Fecha:** 1/10/26, 1:03 a. m. (hora de Córdoba)
- **Resultado:** 107 de 107 pruebas OK
- **Cómo se corre:** `cd server && npm run test:informe`, con la API local levantada (`npm run dev`).
- **Alcance:** reglas puras del modelo de estados y de composición, y casos de uso de los Módulos 1, 2 y 4 contra la API real. Las pruebas de API corren sobre un operativo y usuarios propios ("PRUEBAS AUTOMÁTICAS - no tocar", auto.*@prueba.duar) y se detienen si encuentran datos ajenos.

## Grupos: composición y clases (CU-21, CU-24, CU-25)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 1 | crear un grupo sin elegir la clase → 400 clase_requerida | CU-21 | ✅ OK | 51 ms |
| 2 | Líder de rastrillaje que no es del DUAR → 409 lider_no_duar | CU-21 | ✅ OK | 233 ms |
| 3 | Líder de rastrillaje que es recurso especial → 409 | CU-21 | ✅ OK | 235 ms |
| 4 | Líder de rastrillaje que es conductor → 409 lider_conductor | CU-21 | ✅ OK | 236 ms |
| 5 | crear con Líder del DUAR → En formación y el Líder queda Agrupado | CU-21 | ✅ OK | 626 ms |
| 6 | nombre de grupo repetido en el operativo → 409 nombre_duplicado | CU-21 | ✅ OK | 339 ms |
| 7 | un recurso especial no entra a un grupo de rastrillaje → 409 | CU-24 | ✅ OK | 331 ms |
| 8 | un recurso especial que va de conductor sí entra a uno de rastrillaje | CU-24 | ✅ OK | 798 ms |
| 9 | no se le saca el conductor a un recurso especial dentro de uno de rastrillaje → 409 | CU-17 | ✅ OK | 190 ms |
| 10 | sacarlo arrastrando a "Sin grupo" lo deja Disponible | CU-24 | ✅ OK | 797 ms |
| 11 | confirmar con una sola persona que rastrilla (el conductor no cuenta) → 409 binomio_minimo | CU-21 | ✅ OK | 850 ms |
| 12 | cambiar el Líder por el conductor → 409 lider_conductor | CU-24 | ✅ OK | 334 ms |
| 13 | cambiar el Líder por alguien que no es del DUAR → 409 lider_no_duar | CU-24 | ✅ OK | 837 ms |
| 14 | la clase del grupo no se puede cambiar → 400 clase_fija | CU-24 | ✅ OK | 50 ms |
| 15 | con dos que rastrillan se confirma | CU-21 | ✅ OK | 560 ms |
| 16 | a un grupo confirmado no se suma gente arrastrando → 409 grupo_no_en_formacion | CU-24 | ✅ OK | 325 ms |
| 17 | un grupo especial lo lidera un recurso especial y se confirma sin requisitos | CU-21 | ✅ OK | 1.1 s |
| 18 | disolver un grupo en la base deja a sus integrantes Disponibles y sin grupo | CU-25 | ✅ OK | 1.5 s |

## Grupos: ciclo de estados y Regla 1 (CU-23, CU-17, CU-25)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 19 | en formación, todos los integrantes están Agrupados | CU-23 | ✅ OK | 49 ms |
| 20 | salir sin estar asignado → 409 transicion_invalida | CU-23 | ✅ OK | 282 ms |
| 21 | confirmar y asignar exige describir la zona → 400 zona_requerida | CU-23 | ✅ OK | 610 ms |
| 22 | asignar con zona → Asignado; los integrantes siguen Agrupados y sin tiempo en el terreno | CU-23 | ✅ OK | 613 ms |
| 23 | salir → Desplegado: todos Desplegados y se abre el tiempo en el terreno de cada uno | CU-23 | ✅ OK | 933 ms |
| 24 | no se disuelve un grupo en el terreno → 409 | CU-25 | ✅ OK | 280 ms |
| 25 | llegar al polígono → Rastrillando; el conductor queda Desplegado con la camioneta | CU-23 | ✅ OK | 744 ms |
| 26 | con grupo, el estado del agente no se cambia a mano → 409 agente_en_grupo | CU-17 | ✅ OK | 142 ms |
| 27 | el Líder de un grupo de rastrillaje no puede pasar a ser conductor → 409 | CU-17 | ✅ OK | 234 ms |
| 28 | sacarle el conductor a alguien que rastrilla lo pone a rastrillar (Regla 1) | CU-17 | ✅ OK | 1.3 s |
| 29 | corregir un estado exige motivo → 400 motivo_requerido | CU-23 | ✅ OK | 48 ms |
| 30 | corregir con motivo → vuelve a Desplegado y arrastra a los integrantes | CU-23 | ✅ OK | 1.4 s |
| 31 | volver → Replegado y llegar a la base → En espera; se cierra el tiempo en el terreno | CU-23 | ✅ OK | 1.8 s |
| 32 | reabrir desde En espera → En formación y todos Agrupados | CU-23 | ✅ OK | 789 ms |
| 33 | disolver en la base → todos Disponibles y sin grupo | CU-25 | ✅ OK | 837 ms |
| 34 | en toda la base, ningún agente contradice el estado de su grupo | Regla 1 | ✅ OK | 48 ms |

## Portal del Líder: avisos del terreno y radio (CU-23)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 35 | el Líder ve su grupo y sabe que lo lidera | Portal | ✅ OK | 149 ms |
| 36 | la radio registra la llegada al polígono → Rastrillando | Portal | ✅ OK | 810 ms |
| 37 | el mismo hecho informado por el Líder después queda como CONFIRMACIÓN | Portal | ✅ OK | 717 ms |
| 38 | reenviar el mismo aviso no lo duplica (idempotencia) | Portal | ✅ OK | 480 ms |
| 39 | un integrante que no es el Líder → RECHAZADO | Portal | ✅ OK | 527 ms |
| 40 | una transición imposible (de Rastrillando a la base) → RECHAZADO y el tablero no se mueve | Portal | ✅ OK | 623 ms |
| 41 | con grupo, el agente no cambia su propio estado → 409 agente_en_grupo | Portal | ✅ OK | 286 ms |
| 42 | sin grupo, el agente se marca No disponible y Disponible | Portal | ✅ OK | 859 ms |
| 43 | un aviso viejo que llega después de un cambio posterior → SUPERADO; el tablero no retrocede | Portal | ✅ OK | 7.9 s |
| 44 | una hora futura del celular se aplica con la hora del servidor y queda marcada no confiable | Portal | ✅ OK | 1.1 s |
| 45 | la del Líder muestra su agrupamiento y cada cambio por cascada | Línea de tiempo | ✅ OK | 201 ms |
| 46 | la del grupo guarda lo rechazado y lo superado, con su fuente | Línea de tiempo | ✅ OK | 152 ms |

## Retiro de un agente en el terreno (CU-26)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 47 | retirar a alguien que no integra el grupo → 409 | CU-26 | ✅ OK | 341 ms |
| 48 | retirar al Líder sin designar sucesor → 409 sucesion_requerida | CU-26 | ✅ OK | 335 ms |
| 49 | el sucesor de un grupo de rastrillaje no puede ser el conductor → 409 | CU-26 | ✅ OK | 336 ms |
| 50 | el sucesor tiene que ser del DUAR → 409 | CU-26 | ✅ OK | 335 ms |
| 51 | retirar al Líder con sucesor del DUAR: el grupo sigue rastrillando con el nuevo Líder | CU-26 | ✅ OK | 672 ms |
| 52 | el retirado queda Replegado y sin grupo, y su período se cierra con el motivo | CU-26 | ✅ OK | 94 ms |
| 53 | si quedaría una sola persona rastrillando (el conductor no cuenta) hay que aceptar el riesgo → 409 | CU-26 | ✅ OK | 337 ms |
| 54 | con el riesgo aceptado el grupo sigue en el terreno y queda la alerta de binomio | CU-26 | ✅ OK | 721 ms |
| 55 | en la base no se retira: se reabre y se saca arrastrando → 409 grupo_no_extraible | CU-26 | ✅ OK | 1.4 s |
| 56 | el retirado, al llegar a la base, se marca Disponible desde su portal | CU-26 | ✅ OK | 430 ms |

## Armado automático (CU-22)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 57 | un tamaño fuera de rango → 400 | CU-22 | ✅ OK | 51 ms |
| 58 | con 5 agentes que rastrillan y tamaño 3 arma 2 grupos y los reparte a todos | CU-22 | ✅ OK | 908 ms |
| 59 | cada grupo es de rastrillaje, En formación, con Líder del DUAR que no maneja y al menos dos integrantes | CU-22 | ✅ OK | 147 ms |
| 60 | el conductor y el recurso especial quedan sin grupo, para sumarlos a mano | CU-22 | ✅ OK | 48 ms |
| 61 | sin agentes del DUAR disponibles para liderar → 409 sin_lideres_duar | CU-22 | ✅ OK | 240 ms |

## Sesión, roles y cuentas (CU-01, CU-04 a CU-07)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 62 | sin sesión no se accede a la API → 401 | CU-01 | ✅ OK | 3 ms |
| 63 | una sesión inventada → 401 | CU-01 | ✅ OK | 49 ms |
| 64 | un agente no gestiona usuarios ni operativos → 403 | CU-04 | ✅ OK | 99 ms |
| 65 | el administrador ve a los administradores en la lista | CU-04 | ✅ OK | 97 ms |
| 66 | el coordinador no ve a ningún administrador en la lista | CU-04 | ✅ OK | 97 ms |
| 67 | el coordinador no puede abrir a un administrador ni ver su auditoría → 404 | CU-04 | ✅ OK | 193 ms |
| 68 | el coordinador no puede editar a un administrador ni cambiarle la clave → 404 | CU-06 | ✅ OK | 193 ms |
| 69 | el coordinador no puede eliminar a un administrador → 404 | CU-07 | ✅ OK | 97 ms |
| 70 | el coordinador no puede crear un administrador → 403 rol_no_permitido | CU-05 | ✅ OK | 240 ms |
| 71 | el coordinador no puede ascender a nadie a administrador → 403 | CU-06 | ✅ OK | 144 ms |
| 72 | nadie cambia su propio rol → 409 propio_rol | CU-06 | ✅ OK | 286 ms |
| 73 | nadie se desactiva ni se elimina a sí mismo → 409 autobloqueo | CU-06/07 | ✅ OK | 243 ms |
| 74 | el coordinador sí edita a un agente | CU-06 | ✅ OK | 377 ms |
| 75 | un id mal formado en la dirección responde 400, no 500 | Errores | ✅ OK | 193 ms |
| 76 | un grupo que no es de este operativo no se encuentra → 404 grupo_no_encontrado | Errores | ✅ OK | 287 ms |

## Puesto de comando: presencia de mando (CU nuevo del Módulo 3)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 77 | un coordinador presente en otro operativo no entra sin trasladarse; al trasladarse deja el otro | Mando | ✅ OK | 1.7 s |
| 78 | la base impide que un coordinador tenga dos presencias abiertas a la vez | Mando | ✅ OK | 630 ms |
| 79 | al finalizar el operativo se cierran todas las presencias y el mando | CU-10 | ✅ OK | 1.0 s |
| 80 | un administrador tiene que elegir qué coordinador ingresa → 400 | Mando | ✅ OK | 53 ms |
| 81 | en el puesto de comando sólo se registra a coordinadores → 409 | Mando | ✅ OK | 245 ms |
| 82 | el primer coordinador que ingresa queda a cargo | Mando | ✅ OK | 760 ms |
| 83 | ingresar dos veces → 409 ya_presente | Mando | ✅ OK | 342 ms |
| 84 | un coordinador registra el ingreso de otro: queda presente, no a cargo, y consta quién lo registró | Mando | ✅ OK | 685 ms |
| 85 | sólo quien está a cargo pasa el mando → 403 solo_a_cargo | Mando | ✅ OK | 287 ms |
| 86 | traspaso: el que está a cargo le pasa el mando a otro presente, sin huecos en la historia | Mando | ✅ OK | 622 ms |
| 87 | registrar el retiro de otro coordinador exige motivo → 400 | Mando | ✅ OK | 50 ms |
| 88 | si se retira el que está a cargo y quedan otros, tiene que elegir sucesor → 409 | Mando | ✅ OK | 332 ms |
| 89 | con sucesor: se retira y el mando pasa en el mismo instante | Mando | ✅ OK | 716 ms |
| 90 | un administrador registra presencias y pasa el mando aunque no esté a cargo | Mando | ✅ OK | 1.2 s |
| 91 | lo que registra un coordinador presente queda "en el puesto"; lo de uno ausente, "a distancia" | Línea de tiempo | ✅ OK | 2.7 s |
| 92 | si el que está a cargo se registra como agente, deja el puesto y el operativo queda sin coordinador a cargo | Mando | ✅ OK | 1.4 s |
| 93 | quien figura como agente no entra al puesto de comando → 409 es_agente | Mando | ✅ OK | 286 ms |
| 94 | sin nadie a cargo, un presente toma el mando | Mando | ✅ OK | 576 ms |
| 95 | el último a cargo se retira solo: el operativo queda sin coordinador a cargo | Mando | ✅ OK | 669 ms |
| 96 | cada movimiento del puesto de comando queda en la auditoría | Mando | ✅ OK | 50 ms |

## Reglas puras del modelo de estados y de composición

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 97 | Regla 1: cada estado del grupo define el de sus integrantes | Estados | ✅ OK | 1 ms |
| 98 | Regla 1: el conductor queda Desplegado mientras el grupo rastrilla | Estados | ✅ OK | 0 ms |
| 99 | ningún estado de grupo deja a un integrante en un estado "sin grupo" | Estados | ✅ OK | 0 ms |
| 100 | cada acción sale de estados válidos y llega a un estado del catálogo | Estados | ✅ OK | 0 ms |
| 101 | las acciones del terreno sólo avanzan: salir → llegar → volver → base | Estados | ✅ OK | 1 ms |
| 102 | sólo se disuelve un grupo que está en la base | CU-25 | ✅ OK | 0 ms |
| 103 | el Líder informa sólo hechos del terreno; confirmar, asignar y disolver son del coordinador | Estados | ✅ OK | 0 ms |
| 104 | a un grupo de rastrillaje entra un agente o un conductor, no un recurso especial | CU-21/24 | ✅ OK | 0 ms |
| 105 | Líder de rastrillaje: del DUAR, no recurso especial y no conductor | CU-21/24/26 | ✅ OK | 0 ms |
| 106 | un grupo especial lo lidera cualquiera, incluso un conductor de afuera | CU-21 | ✅ OK | 0 ms |
| 107 | binomio: rastrillan todos menos el conductor | CU-26 | ✅ OK | 0 ms |
