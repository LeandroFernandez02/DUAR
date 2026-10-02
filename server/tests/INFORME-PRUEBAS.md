# Informe de pruebas automatizadas · Sistema DUAR

- **Fecha:** 2/10/26, 1:29 a. m. (hora de Córdoba)
- **Resultado:** 117 de 117 pruebas OK
- **Cómo se corre:** `cd server && npm run test:informe`, con la API local levantada (`npm run dev`).
- **Alcance:** reglas puras del modelo de estados y de composición, y casos de uso de los Módulos 1, 2 y 4 contra la API real. Las pruebas de API corren sobre un operativo y usuarios propios ("PRUEBAS AUTOMÁTICAS - no tocar", auto.*@prueba.duar) y se detienen si encuentran datos ajenos.

## Grupos: composición y clases (CU-21, CU-24, CU-25)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 1 | crear un grupo sin elegir la clase → 400 clase_requerida | CU-21 | ✅ OK | 53 ms |
| 2 | Líder de rastrillaje que no es del DUAR → 409 lider_no_duar | CU-21 | ✅ OK | 248 ms |
| 3 | Líder de rastrillaje que es recurso especial → 409 | CU-21 | ✅ OK | 247 ms |
| 4 | Líder de rastrillaje que es conductor → 409 lider_conductor | CU-21 | ✅ OK | 248 ms |
| 5 | crear con Líder del DUAR → En formación y el Líder queda Agrupado | CU-21 | ✅ OK | 646 ms |
| 6 | nombre de grupo repetido en el operativo → 409 nombre_duplicado | CU-21 | ✅ OK | 346 ms |
| 7 | un recurso especial no entra a un grupo de rastrillaje → 409 | CU-24 | ✅ OK | 352 ms |
| 8 | un recurso especial que va de conductor sí entra a uno de rastrillaje | CU-24 | ✅ OK | 839 ms |
| 9 | no se le saca el conductor a un recurso especial dentro de uno de rastrillaje → 409 | CU-17 | ✅ OK | 201 ms |
| 10 | sacarlo arrastrando a "Sin grupo" lo deja Disponible | CU-24 | ✅ OK | 851 ms |
| 11 | confirmar con una sola persona que rastrilla (el conductor no cuenta) → 409 binomio_minimo | CU-21 | ✅ OK | 889 ms |
| 12 | cambiar el Líder por el conductor → 409 lider_conductor | CU-24 | ✅ OK | 346 ms |
| 13 | cambiar el Líder por alguien que no es del DUAR → 409 lider_no_duar | CU-24 | ✅ OK | 894 ms |
| 14 | la clase del grupo no se puede cambiar → 400 clase_fija | CU-24 | ✅ OK | 53 ms |
| 15 | con dos que rastrillan se confirma | CU-21 | ✅ OK | 597 ms |
| 16 | a un grupo confirmado no se suma gente arrastrando → 409 grupo_no_en_formacion | CU-24 | ✅ OK | 346 ms |
| 17 | un grupo especial lo lidera un recurso especial y se confirma sin requisitos | CU-21 | ✅ OK | 1.1 s |
| 18 | disolver un grupo en la base deja a sus integrantes Disponibles y sin grupo | CU-25 | ✅ OK | 1.6 s |

## Grupos: ciclo de estados y Regla 1 (CU-23, CU-17, CU-25)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 19 | en formación, todos los integrantes están Agrupados | CU-23 | ✅ OK | 50 ms |
| 20 | salir sin estar asignado → 409 transicion_invalida | CU-23 | ✅ OK | 299 ms |
| 21 | confirmar y asignar exige describir la zona → 400 zona_requerida | CU-23 | ✅ OK | 652 ms |
| 22 | asignar con zona → Asignado; los integrantes siguen Agrupados y sin tiempo en el terreno | CU-23 | ✅ OK | 645 ms |
| 23 | salir → Desplegado: todos Desplegados y se abre el tiempo en el terreno de cada uno | CU-23 | ✅ OK | 998 ms |
| 24 | no se disuelve un grupo en el terreno → 409 | CU-25 | ✅ OK | 297 ms |
| 25 | llegar al polígono → Rastrillando; el conductor queda Desplegado con la camioneta | CU-23 | ✅ OK | 789 ms |
| 26 | con grupo, el estado del agente no se cambia a mano → 409 agente_en_grupo | CU-17 | ✅ OK | 150 ms |
| 27 | el Líder de un grupo de rastrillaje no puede pasar a ser conductor → 409 | CU-17 | ✅ OK | 247 ms |
| 28 | sacarle el conductor a alguien que rastrilla lo pone a rastrillar (Regla 1) | CU-17 | ✅ OK | 1.4 s |
| 29 | corregir un estado exige motivo → 400 motivo_requerido | CU-23 | ✅ OK | 52 ms |
| 30 | corregir con motivo → vuelve a Desplegado y arrastra a los integrantes | CU-23 | ✅ OK | 1.5 s |
| 31 | volver → Replegado y llegar a la base → En espera; se cierra el tiempo en el terreno | CU-23 | ✅ OK | 1.9 s |
| 32 | reabrir desde En espera → En formación y todos Agrupados | CU-23 | ✅ OK | 843 ms |
| 33 | disolver en la base → todos Disponibles y sin grupo | CU-25 | ✅ OK | 893 ms |
| 34 | en toda la base, ningún agente contradice el estado de su grupo | Regla 1 | ✅ OK | 50 ms |

## Portal del Líder: avisos del terreno y radio (CU-23)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 35 | el Líder ve su grupo y sabe que lo lidera | Portal | ✅ OK | 153 ms |
| 36 | la radio registra la llegada al polígono → Rastrillando | Portal | ✅ OK | 840 ms |
| 37 | el mismo hecho informado por el Líder después queda como CONFIRMACIÓN | Portal | ✅ OK | 743 ms |
| 38 | reenviar el mismo aviso no lo duplica (idempotencia) | Portal | ✅ OK | 494 ms |
| 39 | un integrante que no es el Líder → RECHAZADO | Portal | ✅ OK | 547 ms |
| 40 | una transición imposible (de Rastrillando a la base) → RECHAZADO y el tablero no se mueve | Portal | ✅ OK | 644 ms |
| 41 | con grupo, el agente no cambia su propio estado → 409 agente_en_grupo | Portal | ✅ OK | 294 ms |
| 42 | sin grupo, el agente se marca No disponible y Disponible | Portal | ✅ OK | 890 ms |
| 43 | un aviso viejo que llega después de un cambio posterior → SUPERADO; el tablero no retrocede | Portal | ✅ OK | 8.1 s |
| 44 | una hora futura del celular se aplica con la hora del servidor y queda marcada no confiable | Portal | ✅ OK | 1.2 s |
| 45 | la del Líder muestra su agrupamiento y cada cambio por cascada | Línea de tiempo | ✅ OK | 156 ms |
| 46 | la del grupo guarda lo rechazado y lo superado, con su fuente | Línea de tiempo | ✅ OK | 153 ms |

## Retiro de un agente en el terreno (CU-26)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 47 | retirar a alguien que no integra el grupo → 409 | CU-26 | ✅ OK | 347 ms |
| 48 | retirar al Líder sin designar sucesor → 409 sucesion_requerida | CU-26 | ✅ OK | 347 ms |
| 49 | el sucesor de un grupo de rastrillaje no puede ser el conductor → 409 | CU-26 | ✅ OK | 347 ms |
| 50 | el sucesor tiene que ser del DUAR → 409 | CU-26 | ✅ OK | 345 ms |
| 51 | retirar al Líder con sucesor del DUAR: el grupo sigue rastrillando con el nuevo Líder | CU-26 | ✅ OK | 692 ms |
| 52 | el retirado queda Replegado y sin grupo, y su período se cierra con el motivo | CU-26 | ✅ OK | 95 ms |
| 53 | si quedaría una sola persona rastrillando (el conductor no cuenta) hay que aceptar el riesgo → 409 | CU-26 | ✅ OK | 347 ms |
| 54 | con el riesgo aceptado el grupo sigue en el terreno y queda la alerta de binomio | CU-26 | ✅ OK | 753 ms |
| 55 | en la base no se retira: se reabre y se saca arrastrando → 409 grupo_no_extraible | CU-26 | ✅ OK | 1.4 s |
| 56 | el retirado, al llegar a la base, se marca Disponible desde su portal | CU-26 | ✅ OK | 446 ms |

## Armado automático (CU-22)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 57 | un tamaño fuera de rango → 400 | CU-22 | ✅ OK | 52 ms |
| 58 | con 5 agentes que rastrillan y tamaño 3 arma 2 grupos y los reparte a todos | CU-22 | ✅ OK | 945 ms |
| 59 | cada grupo es de rastrillaje, En formación, con Líder del DUAR que no maneja y al menos dos integrantes | CU-22 | ✅ OK | 152 ms |
| 60 | el conductor y el recurso especial quedan sin grupo, para sumarlos a mano | CU-22 | ✅ OK | 49 ms |
| 61 | sin agentes del DUAR disponibles para liderar → 409 sin_lideres_duar | CU-22 | ✅ OK | 247 ms |

## Sesión, roles y cuentas (CU-01, CU-04 a CU-07)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 62 | sin sesión no se accede a la API → 401 | CU-01 | ✅ OK | 2 ms |
| 63 | una sesión inventada → 401 | CU-01 | ✅ OK | 51 ms |
| 64 | un agente no gestiona usuarios ni operativos → 403 | CU-04 | ✅ OK | 102 ms |
| 65 | el administrador ve a los administradores en la lista | CU-04 | ✅ OK | 101 ms |
| 66 | el coordinador no ve a ningún administrador en la lista | CU-04 | ✅ OK | 102 ms |
| 67 | el coordinador no puede abrir a un administrador ni ver su auditoría → 404 | CU-04 | ✅ OK | 202 ms |
| 68 | el coordinador no puede editar a un administrador ni cambiarle la clave → 404 | CU-06 | ✅ OK | 202 ms |
| 69 | el coordinador no puede eliminar a un administrador → 404 | CU-07 | ✅ OK | 102 ms |
| 70 | el coordinador no puede crear un administrador → 403 rol_no_permitido | CU-05 | ✅ OK | 251 ms |
| 71 | el coordinador no puede ascender a nadie a administrador → 403 | CU-06 | ✅ OK | 151 ms |
| 72 | nadie cambia su propio rol → 409 propio_rol | CU-06 | ✅ OK | 301 ms |
| 73 | nadie se desactiva ni se elimina a sí mismo → 409 autobloqueo | CU-06/07 | ✅ OK | 254 ms |
| 74 | el coordinador sí edita a un agente | CU-06 | ✅ OK | 395 ms |
| 75 | un id mal formado en la dirección responde 400, no 500 | Errores | ✅ OK | 296 ms |
| 76 | un grupo que no es de este operativo no se encuentra → 404 grupo_no_encontrado | Errores | ✅ OK | 289 ms |

## Puesto de comando: presencia de mando (CU nuevo del Módulo 3)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 77 | un coordinador presente en otro operativo no entra sin trasladarse; al trasladarse deja el otro | Mando | ✅ OK | 1.6 s |
| 78 | la base impide que un coordinador tenga dos presencias abiertas a la vez | Mando | ✅ OK | 616 ms |
| 79 | al finalizar el operativo se cierran todas las presencias y el mando | CU-10 | ✅ OK | 999 ms |
| 80 | un administrador tiene que elegir qué coordinador ingresa → 400 | Mando | ✅ OK | 57 ms |
| 81 | en el puesto de comando sólo se registra a coordinadores → 409 | Mando | ✅ OK | 258 ms |
| 82 | el primer coordinador que ingresa queda a cargo | Mando | ✅ OK | 774 ms |
| 83 | el listado de operativos muestra quién está a cargo | CU-11 | ✅ OK | 138 ms |
| 84 | ingresar dos veces → 409 ya_presente | Mando | ✅ OK | 361 ms |
| 85 | un coordinador registra el ingreso de otro: queda presente, no a cargo, y consta quién lo registró | Mando | ✅ OK | 731 ms |
| 86 | sólo quien está a cargo pasa el mando → 403 solo_a_cargo | Mando | ✅ OK | 308 ms |
| 87 | traspaso: el que está a cargo le pasa el mando a otro presente, sin huecos en la historia | Mando | ✅ OK | 683 ms |
| 88 | registrar el retiro de otro coordinador exige motivo → 400 | Mando | ✅ OK | 54 ms |
| 89 | si se retira el que está a cargo y quedan otros, tiene que elegir sucesor → 409 | Mando | ✅ OK | 366 ms |
| 90 | con sucesor: se retira y el mando pasa en el mismo instante | Mando | ✅ OK | 774 ms |
| 91 | un administrador registra presencias y pasa el mando aunque no esté a cargo | Mando | ✅ OK | 1.3 s |
| 92 | lo que registra un coordinador presente queda "en el puesto"; lo de uno ausente, "a distancia" | Línea de tiempo | ✅ OK | 2.8 s |
| 93 | si el que está a cargo se registra como agente, deja el puesto y el operativo queda sin coordinador a cargo | Mando | ✅ OK | 1.5 s |
| 94 | quien figura como agente no entra al puesto de comando → 409 es_agente | Mando | ✅ OK | 314 ms |
| 95 | sin nadie a cargo, un presente toma el mando | Mando | ✅ OK | 640 ms |
| 96 | el último a cargo se retira solo: el operativo queda sin coordinador a cargo | Mando | ✅ OK | 731 ms |
| 97 | sin nadie a cargo, el listado conserva quién estuvo a cargo por última vez | CU-11 | ✅ OK | 105 ms |
| 98 | cada movimiento del puesto de comando queda en la auditoría | Mando | ✅ OK | 49 ms |

## Acceso: límite de intentos de login y CORS (CU-01)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 99 | un correo que no existe y una clave incorrecta responden igual (no se enumera) | CU-01 | ✅ OK | 570 ms |
| 100 | tras 5 intentos fallidos el correo queda bloqueado → 429 con Retry-After | CU-01 | ✅ OK | 1.0 s |
| 101 | mientras dura el bloqueo, ni la clave correcta entra | CU-01 | ✅ OK | 1.3 s |
| 102 | levantado el bloqueo, la clave correcta entra y borra el contador | CU-01 | ✅ OK | 351 ms |
| 103 | un login correcto no deja el contador de fallos anteriores | CU-01 | ✅ OK | 2.1 s |
| 104 | un sitio web ajeno no recibe permiso para leer la API (CORS) | Acceso | ✅ OK | 261 ms |
| 105 | la propia aplicación (localhost:5173 en desarrollo) sí recibe permiso | Acceso | ✅ OK | 260 ms |
| 106 | sin Origin (servidor a servidor) la API responde igual | Acceso | ✅ OK | 53 ms |

## Reglas puras del modelo de estados y de composición

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 107 | Regla 1: cada estado del grupo define el de sus integrantes | Estados | ✅ OK | 1 ms |
| 108 | Regla 1: el conductor queda Desplegado mientras el grupo rastrilla | Estados | ✅ OK | 0 ms |
| 109 | ningún estado de grupo deja a un integrante en un estado "sin grupo" | Estados | ✅ OK | 0 ms |
| 110 | cada acción sale de estados válidos y llega a un estado del catálogo | Estados | ✅ OK | 0 ms |
| 111 | las acciones del terreno sólo avanzan: salir → llegar → volver → base | Estados | ✅ OK | 0 ms |
| 112 | sólo se disuelve un grupo que está en la base | CU-25 | ✅ OK | 0 ms |
| 113 | el Líder informa sólo hechos del terreno; confirmar, asignar y disolver son del coordinador | Estados | ✅ OK | 0 ms |
| 114 | a un grupo de rastrillaje entra un agente o un conductor, no un recurso especial | CU-21/24 | ✅ OK | 0 ms |
| 115 | Líder de rastrillaje: del DUAR, no recurso especial y no conductor | CU-21/24/26 | ✅ OK | 0 ms |
| 116 | un grupo especial lo lidera cualquiera, incluso un conductor de afuera | CU-21 | ✅ OK | 0 ms |
| 117 | binomio: rastrillan todos menos el conductor | CU-26 | ✅ OK | 0 ms |
