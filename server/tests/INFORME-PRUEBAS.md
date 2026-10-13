# Informe de pruebas automatizadas · Sistema DUAR

- **Fecha:** 13/10/26, 20:38 (hora de Córdoba)
- **Resultado:** 177 de 177 pruebas OK
- **Cómo se corre:** `cd server && npm run test:informe`, con la API local levantada (`npm run dev`).
- **Alcance:** reglas puras del modelo de estados, de composición y de la lectura de archivos GPX, y casos de uso de los Módulos 1 a 5 (del 3, Punto Cero, finalizar, listado y presencia de mando; el 5 es el Mapa Operacional) contra la API real, la base y el almacenamiento de archivos. Las pruebas de API corren sobre un operativo y usuarios propios ("PRUEBAS AUTOMÁTICAS - no tocar", auto.*@prueba.duar) y se detienen si encuentran datos ajenos; después se borran con `npm run limpiar-pruebas -- --confirmar`.

## Grupos: composición y clases (CU-22, CU-25, CU-26)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 1 | crear un grupo sin elegir la clase → 400 clase_requerida | CU-22 | ✅ OK | 46 ms |
| 2 | Líder de rastrillaje que no es del DUAR → 409 lider_no_duar | CU-22 | ✅ OK | 217 ms |
| 3 | Líder de rastrillaje que es recurso especial → 409 | CU-22 | ✅ OK | 214 ms |
| 4 | Líder de rastrillaje que es conductor → 409 lider_conductor | CU-22 | ✅ OK | 214 ms |
| 5 | crear con Líder del DUAR → En formación y el Líder queda Agrupado | CU-22 | ✅ OK | 577 ms |
| 6 | nombre de grupo repetido en el operativo → 409 nombre_duplicado | CU-22 | ✅ OK | 302 ms |
| 7 | un recurso especial no entra a un grupo de rastrillaje → 409 | CU-25 | ✅ OK | 299 ms |
| 8 | un recurso especial que va de conductor sí entra a uno de rastrillaje | CU-25 | ✅ OK | 738 ms |
| 9 | no se le saca el conductor a un recurso especial dentro de uno de rastrillaje → 409 | CU-18 | ✅ OK | 173 ms |
| 10 | sacarlo arrastrando a "Sin grupo" lo deja Disponible | CU-25 | ✅ OK | 734 ms |
| 11 | confirmar con una sola persona que rastrilla (el conductor no cuenta) → 409 binomio_minimo | CU-22 | ✅ OK | 772 ms |
| 12 | cambiar el Líder por el conductor → 409 lider_conductor | CU-25 | ✅ OK | 301 ms |
| 13 | cambiar el Líder por alguien que no es del DUAR → 409 lider_no_duar | CU-25 | ✅ OK | 772 ms |
| 14 | la clase del grupo no se puede cambiar → 400 clase_fija | CU-25 | ✅ OK | 45 ms |
| 15 | con dos que rastrillan se confirma | CU-22 | ✅ OK | 564 ms |
| 16 | a un grupo confirmado no se suma gente arrastrando → 409 grupo_no_en_formacion | CU-25 | ✅ OK | 299 ms |
| 17 | un grupo especial lo lidera un recurso especial y se confirma sin requisitos | CU-22 | ✅ OK | 1.0 s |
| 18 | disolver un grupo en la base deja a sus integrantes Disponibles y sin grupo | CU-26 | ✅ OK | 1.5 s |

## Grupos: ciclo de estados y Regla 1 (CU-24, CU-18, CU-26)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 19 | en formación, todos los integrantes están Agrupados | CU-24 | ✅ OK | 44 ms |
| 20 | salir sin estar asignado → 409 transicion_invalida | CU-24 | ✅ OK | 254 ms |
| 21 | confirmar y asignar sin polígono → 400 poligono_requerido | CU-24/30 | ✅ OK | 597 ms |
| 22 | asignar a un polígono → Asignado; los integrantes siguen Agrupados y sin tiempo en el terreno | CU-24/30 | ✅ OK | 1.4 s |
| 23 | salir → Desplegado: todos Desplegados y se abre el tiempo en el terreno de cada uno | CU-24 | ✅ OK | 915 ms |
| 24 | no se disuelve un grupo en el terreno → 409 | CU-26 | ✅ OK | 275 ms |
| 25 | llegar al polígono → Rastrillando; el conductor queda Desplegado con la camioneta | CU-24 | ✅ OK | 729 ms |
| 26 | con grupo, el estado del agente no se cambia a mano → 409 agente_en_grupo | CU-18 | ✅ OK | 139 ms |
| 27 | el Líder de un grupo de rastrillaje no puede pasar a ser conductor → 409 | CU-18 | ✅ OK | 229 ms |
| 28 | sacarle el conductor a alguien que rastrilla lo pone a rastrillar (Regla 1) | CU-18 | ✅ OK | 1.3 s |
| 29 | corregir un estado exige motivo → 400 motivo_requerido | CU-24 | ✅ OK | 48 ms |
| 30 | corregir con motivo → vuelve a Desplegado y arrastra a los integrantes | CU-24 | ✅ OK | 1.4 s |
| 31 | volver → Replegado y llegar a la base → En espera; se cierra el tiempo en el terreno | CU-24 | ✅ OK | 1.9 s |
| 32 | reabrir desde En espera → En formación y todos Agrupados | CU-24 | ✅ OK | 827 ms |
| 33 | disolver en la base → todos Disponibles y sin grupo | CU-26 | ✅ OK | 865 ms |
| 34 | en toda la base, ningún agente contradice el estado de su grupo | Regla 1 | ✅ OK | 43 ms |

## Portal del Líder: avisos del terreno y radio (CU-24)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 35 | el Líder ve su grupo y sabe que lo lidera | Portal | ✅ OK | 141 ms |
| 36 | la radio registra la llegada al polígono → Rastrillando | Portal | ✅ OK | 781 ms |
| 37 | el mismo hecho informado por el Líder después queda como CONFIRMACIÓN | Portal | ✅ OK | 688 ms |
| 38 | reenviar el mismo aviso no lo duplica (idempotencia) | Portal | ✅ OK | 458 ms |
| 39 | un integrante que no es el Líder → RECHAZADO | Portal | ✅ OK | 503 ms |
| 40 | una transición imposible (de Rastrillando a la base) → RECHAZADO y el tablero no se mueve | Portal | ✅ OK | 597 ms |
| 41 | con grupo, el agente no cambia su propio estado → 409 agente_en_grupo | Portal | ✅ OK | 270 ms |
| 42 | sin grupo, el agente se marca No disponible y Disponible | Portal | ✅ OK | 819 ms |
| 43 | un aviso viejo que llega después de un cambio posterior → SUPERADO; el tablero no retrocede | Portal | ✅ OK | 8.5 s |
| 44 | una hora futura del celular se aplica con la hora del servidor y queda marcada no confiable | Portal | ✅ OK | 1.1 s |
| 45 | la del Líder muestra su agrupamiento y cada cambio por cascada | Línea de tiempo | ✅ OK | 142 ms |
| 46 | la del grupo guarda lo rechazado y lo superado, con su fuente | Línea de tiempo | ✅ OK | 142 ms |

## Retiro de un agente en el terreno (CU-27)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 47 | retirar a alguien que no integra el grupo → 409 | CU-27 | ✅ OK | 321 ms |
| 48 | retirar al Líder sin designar sucesor → 409 sucesion_requerida | CU-27 | ✅ OK | 318 ms |
| 49 | el sucesor de un grupo de rastrillaje no puede ser el conductor → 409 | CU-27 | ✅ OK | 319 ms |
| 50 | el sucesor tiene que ser del DUAR → 409 | CU-27 | ✅ OK | 318 ms |
| 51 | retirar al Líder con sucesor del DUAR: el grupo sigue rastrillando con el nuevo Líder | CU-27 | ✅ OK | 638 ms |
| 52 | el retirado queda Replegado y sin grupo, y su período se cierra con el motivo | CU-27 | ✅ OK | 91 ms |
| 53 | si quedaría una sola persona rastrillando (el conductor no cuenta) hay que aceptar el riesgo → 409 | CU-27 | ✅ OK | 319 ms |
| 54 | con el riesgo aceptado el grupo sigue en el terreno y queda la alerta de binomio | CU-27 | ✅ OK | 688 ms |
| 55 | en la base no se retira: se reabre y se saca arrastrando → 409 grupo_no_extraible | CU-27 | ✅ OK | 1.3 s |
| 56 | el retirado, al llegar a la base, se marca Disponible desde su portal | CU-27 | ✅ OK | 412 ms |

## Armado automático (CU-23)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 57 | un tamaño fuera de rango → 400 | CU-23 | ✅ OK | 48 ms |
| 58 | con 5 agentes que rastrillan y tamaño 3 arma 2 grupos y los reparte a todos | CU-23 | ✅ OK | 860 ms |
| 59 | cada grupo es de rastrillaje, En formación, con Líder del DUAR que no maneja y al menos dos integrantes | CU-23 | ✅ OK | 139 ms |
| 60 | el conductor y el recurso especial quedan sin grupo, para sumarlos a mano | CU-23 | ✅ OK | 48 ms |
| 61 | sin agentes del DUAR disponibles para liderar → 409 sin_lideres_duar | CU-23 | ✅ OK | 228 ms |

## Sesión, roles y cuentas (CU-01, CU-04 a CU-07)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 62 | sin sesión no se accede a la API → 401 | CU-01 | ✅ OK | 3 ms |
| 63 | una sesión inventada → 401 | CU-01 | ✅ OK | 47 ms |
| 64 | un agente no gestiona usuarios ni operativos → 403 | CU-04 | ✅ OK | 95 ms |
| 65 | el administrador ve a los administradores en la lista | CU-04 | ✅ OK | 93 ms |
| 66 | el coordinador no ve a ningún administrador en la lista | CU-04 | ✅ OK | 94 ms |
| 67 | el coordinador no puede abrir a un administrador ni ver su auditoría → 404 | CU-04 | ✅ OK | 186 ms |
| 68 | el coordinador no puede editar a un administrador ni cambiarle la clave → 404 | CU-06 | ✅ OK | 187 ms |
| 69 | el coordinador no puede eliminar a un administrador → 404 | CU-07 | ✅ OK | 93 ms |
| 70 | el coordinador no puede crear un administrador → 403 rol_no_permitido | CU-05 | ✅ OK | 230 ms |
| 71 | el DNI de una cuenta eliminada la REACTIVA (misma cuenta, datos y clave nuevos); su correo no lo usa nadie más | CU-07 | ✅ OK | 2.5 s |
| 72 | registrarse por QR con el DNI de una cuenta eliminada también la reactiva | CU-02/07 | ✅ OK | 4.4 s |
| 73 | el coordinador no puede ascender a nadie a administrador → 403 | CU-06 | ✅ OK | 139 ms |
| 74 | nadie cambia su propio rol → 409 propio_rol | CU-06 | ✅ OK | 277 ms |
| 75 | nadie se desactiva ni se elimina a sí mismo → 409 autobloqueo | CU-06/07 | ✅ OK | 238 ms |
| 76 | el coordinador sí edita a un agente | CU-06 | ✅ OK | 365 ms |
| 77 | un id mal formado en la dirección responde 400, no 500 | Errores | ✅ OK | 185 ms |
| 78 | un grupo que no es de este operativo no se encuentra → 404 grupo_no_encontrado | Errores | ✅ OK | 258 ms |

## Puesto de comando: presencia de mando (CU-15)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 79 | un coordinador presente en otro operativo no entra sin trasladarse; al trasladarse deja el otro | CU-15 | ✅ OK | 1.5 s |
| 80 | la base impide que un coordinador tenga dos presencias abiertas a la vez | CU-15 | ✅ OK | 607 ms |
| 81 | al finalizar el operativo se cierran todas las presencias y el mando | CU-10 | ✅ OK | 980 ms |
| 82 | un administrador tiene que elegir qué coordinador ingresa → 400 | CU-15 | ✅ OK | 48 ms |
| 83 | en el puesto de comando sólo se registra a coordinadores → 409 | CU-15 | ✅ OK | 214 ms |
| 84 | el primer coordinador que ingresa queda a cargo | CU-15 | ✅ OK | 643 ms |
| 85 | el listado de operativos muestra quién está a cargo | CU-11 | ✅ OK | 88 ms |
| 86 | ingresar dos veces → 409 ya_presente | CU-15 | ✅ OK | 301 ms |
| 87 | un coordinador registra el ingreso de otro: queda presente, no a cargo, y consta quién lo registró | CU-15 | ✅ OK | 600 ms |
| 88 | sólo quien está a cargo pasa el mando → 403 solo_a_cargo | CU-15 | ✅ OK | 255 ms |
| 89 | traspaso: el que está a cargo le pasa el mando a otro presente, sin huecos en la historia | CU-15 | ✅ OK | 554 ms |
| 90 | registrar el retiro de otro coordinador exige motivo → 400 | CU-15 | ✅ OK | 45 ms |
| 91 | si se retira el que está a cargo y quedan otros, tiene que elegir sucesor → 409 | CU-15 | ✅ OK | 298 ms |
| 92 | con sucesor: se retira y el mando pasa en el mismo instante | CU-15 | ✅ OK | 640 ms |
| 93 | un administrador registra presencias y pasa el mando aunque no esté a cargo | CU-15 | ✅ OK | 1.1 s |
| 94 | lo que registra un coordinador presente queda "en el puesto"; lo de uno ausente, "a distancia" | Línea de tiempo | ✅ OK | 2.4 s |
| 95 | si el que está a cargo se registra como agente, deja el puesto y el operativo queda sin coordinador a cargo | CU-15 | ✅ OK | 1.3 s |
| 96 | quien figura como agente no entra al puesto de comando → 409 es_agente | CU-15 | ✅ OK | 255 ms |
| 97 | sin nadie a cargo, un presente toma el mando | CU-15 | ✅ OK | 512 ms |
| 98 | el último a cargo se retira solo: el operativo queda sin coordinador a cargo | CU-15 | ✅ OK | 596 ms |
| 99 | sin nadie a cargo, el listado conserva quién estuvo a cargo por última vez | CU-11 | ✅ OK | 87 ms |
| 100 | cada movimiento del puesto de comando queda en la auditoría | CU-15 | ✅ OK | 48 ms |

## Acceso: límite de intentos de login y CORS (CU-01)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 101 | un correo que no existe y una clave incorrecta responden igual (no se enumera) | CU-01 | ✅ OK | 483 ms |
| 102 | tras 5 intentos fallidos el correo queda bloqueado → 429 con Retry-After | CU-01 | ✅ OK | 869 ms |
| 103 | mientras dura el bloqueo, ni la clave correcta entra | CU-01 | ✅ OK | 1.2 s |
| 104 | levantado el bloqueo, la clave correcta entra y borra el contador | CU-01 | ✅ OK | 312 ms |
| 105 | un login correcto no deja el contador de fallos anteriores | CU-01 | ✅ OK | 1.9 s |
| 106 | un sitio web ajeno no recibe permiso para leer la API (CORS) | Acceso | ✅ OK | 215 ms |
| 107 | la propia aplicación (localhost:5173 en desarrollo) sí recibe permiso | Acceso | ✅ OK | 217 ms |
| 108 | sin Origin (servidor a servidor) la API responde igual | Acceso | ✅ OK | 43 ms |

## Eliminar una cuenta la saca de los operativos (CU-07)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 109 | sin grupo: deja el operativo, con la baja en su línea de tiempo | CU-07 | ✅ OK | 1.9 s |
| 110 | en un grupo en la base: sale del grupo y del operativo; el grupo sigue | CU-07 | ✅ OK | 3.6 s |
| 111 | en el terreno con su grupo: no se puede eliminar (409) y no cambia nada | CU-07 | ✅ OK | 6.0 s |

## Módulo 5 · Polígonos y sus grupos (CU-29, 30, 37, 38, 39)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 112 | dibujar un polígono: la base calcula área y perímetro; nace sin grupos, con cobertura 0 y «Creado» en su historial | CU-29 | ✅ OK | 423 ms |
| 113 | nombre repetido en el operativo (sin importar mayúsculas) → 409 nombre_duplicado | CU-29 4.2 | ✅ OK | 233 ms |
| 114 | bordes cruzados → 400 geometria_invalida | CU-29 2.3 | ✅ OK | 232 ms |
| 115 | nombre de menos de 3 caracteres o menos de 3 vértices → 400 | CU-29 | ✅ OK | 98 ms |
| 116 | sólo se asigna un grupo Confirmado (uno En formación → 409) | CU-30 | ✅ OK | 233 ms |
| 117 | asignar un grupo Confirmado → Asignado; el grupo muestra su polígono | CU-30 | ✅ OK | 1.4 s |
| 118 | un segundo grupo de rastrillaje en el mismo polígono → 409 poligono_con_rastrillaje | CU-30 | ✅ OK | 557 ms |
| 119 | un grupo especial sí entra junto al de rastrillaje | CU-30 | ✅ OK | 650 ms |
| 120 | un grupo está en un solo polígono a la vez | CU-30 | ✅ OK | 650 ms |
| 121 | cambiar el grupo (el actual está Asignado): el anterior vuelve a Confirmado | CU-30 A1 | ✅ OK | 1.6 s |
| 122 | quitar un grupo Asignado: vuelve a Confirmado y queda libre | CU-30 A2.1 | ✅ OK | 840 ms |
| 123 | quitar un grupo en el terreno pide confirmación; confirmado, el grupo sigue en el terreno sin polígono | CU-30 A2.2 | ✅ OK | 2.6 s |
| 124 | al pasar a Replegado el grupo sale solo del polígono | CU-30 A3 | ✅ OK | 3.1 s |
| 125 | no se elimina un polígono con un grupo trabajando en él | CU-38 | ✅ OK | 1.2 s |
| 126 | eliminar con un grupo Asignado: el grupo vuelve a Confirmado y el polígono deja de verse | CU-38 | ✅ OK | 4.0 s |
| 127 | el nombre de un polígono eliminado se puede volver a usar | CU-38 | ✅ OK | 420 ms |
| 128 | cambiar nombre, notas y forma deja cada cambio en el historial | CU-37 | ✅ OK | 1.0 s |
| 129 | sin cambios → 400; nombre de otro polígono → 409 | CU-37 | ✅ OK | 465 ms |
| 130 | el detalle trae grupos que asistieron e historial, del más reciente al más viejo | CU-39 | ✅ OK | 188 ms |
| 131 | desde el tablero: asignar exige polígono y desasignar devuelve a Confirmado | CU-30 | ✅ OK | 1.4 s |
| 132 | disolver un grupo Asignado lo saca del polígono | CU-26 | ✅ OK | 1.7 s |

## Módulo 5 · Tracks GPX y cobertura (CU-31, 32, 38, 40)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 133 | analizar muestra puntos, horas, desnivel y el polígono detectado, sin guardar nada | CU-31 pasos 3-5 | ✅ OK | 306 ms |
| 134 | el coordinador carga en nombre de un agente: queda en el polígono detectado y la cobertura se calcula sola | CU-31 | ✅ OK | 1.9 s |
| 135 | el .gpx original queda guardado tal cual y se descarga con un enlace temporal | CU-31 | ✅ OK | 676 ms |
| 136 | el mismo recorrido dos veces (mismo agente, misma hora de inicio y fin) → 409 track_duplicado | CU-31 | ✅ OK | 372 ms |
| 137 | con menos del 30 % de los puntos adentro queda «Fuera de polígono» | CU-31 paso 4 | ✅ OK | 1.0 s |
| 138 | se corrige el polígono a mano: suma cobertura y queda en el historial de dónde vino | CU-32 | ✅ OK | 1.1 s |
| 139 | sólo se editan polígono y notas: horas o agente → 400 dato_no_editable; sin cambios → 400 | CU-32 | ✅ OK | 857 ms |
| 140 | eliminar un track es una baja con registro: deja de sumar cobertura | CU-38 | ✅ OK | 991 ms |
| 141 | el agente analiza y carga su propio recorrido desde el portal | CU-31 flujo principal | ✅ OK | 1.5 s |
| 142 | portal sin operativo en curso → 404 sin_operativo; un agente no usa la carga del coordinador → 403 | CU-31 | ✅ OK | 241 ms |
| 143 | archivo faltante, que no es .gpx, sin puntos, o de un agente ajeno → rechazos claros | CU-31 2.x | ✅ OK | 479 ms |
| 144 | al eliminar el polígono sus tracks quedan «Fuera de polígono» (no se borran) | CU-38 | ✅ OK | 700 ms |

## Módulo 5 · Marcadores, Punto Cero y radios (CU-34, 35, 36, 38)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 145 | marcar un punto de interés: queda con coordenadas, autor y hora | CU-34 | ✅ OK | 245 ms |
| 146 | una instalación toma el nombre de su tipo; lleva responsable y notas | CU-34 | ✅ OK | 235 ms |
| 147 | sin nombre, sin tipo de instalación, coordenadas inválidas o datos de otra clase → 400 | CU-34 3.1 / 4.1 | ✅ OK | 294 ms |
| 148 | un hallazgo con fotos; las fotos salen con enlace firmado | CU-34 | ✅ OK | 1.1 s |
| 149 | un hallazgo no se elimina, no pasa a punto de interés y sus fotos no se quitan | CU-38 | ✅ OK | 1.6 s |
| 150 | se corrigen los datos de un hallazgo (nombre vacío no) y un punto de interés puede pasar a hallazgo | CU-35 | ✅ OK | 1.9 s |
| 151 | sólo una instalación se reubica (y queda la ubicación anterior en la auditoría) | CU-35 2.x | ✅ OK | 1.7 s |
| 152 | fotos: hasta 8 por marcador, no en instalaciones, y las de un punto de interés se quitan | CU-34 | ✅ OK | 1.2 s |
| 153 | eliminar un punto de interés o una instalación: baja con registro, sale de la lista | CU-38 | ✅ OK | 1.0 s |
| 154 | agregar radios; la misma distancia dos veces → 409 «Ya existe un radio de 2 km» | CU-36 R1 | ✅ OK | 675 ms |
| 155 | valores fuera de rango o color inválido → 400; cambiar km y color; quitar | CU-36 R1-R2 | ✅ OK | 783 ms |
| 156 | con el operativo en curso, mover el Punto Cero pide motivo; queda en el historial con la distancia | CU-36 | ✅ OK | 1.2 s |
| 157 | el historial arranca al crear el operativo; en NUEVO se corrige sin motivo; en curso, «Editar operativo» también pide motivo | CU-08 / CU-09 | ✅ OK | 2.1 s |
| 158 | con el operativo finalizado el mapa es de sólo lectura | CU-36 / CU-38 | ✅ OK | 1.1 s |
| 159 | un agente no marca ni mueve nada del mapa (403) | Roles | ✅ OK | 137 ms |

## Fechas cargadas a mano: hora de Argentina

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 160 | "11:00" del formulario (sin zona) se guarda como 11:00 de Argentina = 14:00 UTC | CU-08 | ✅ OK | 1 ms |
| 161 | con segundos también se completa la zona | CU-08 | ✅ OK | 1 ms |
| 162 | un valor que ya trae zona (Z u offset) no se toca | CU-08 | ✅ OK | 0 ms |

## Lectura de archivos GPX (CU-31)

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 163 | lee puntos con elevación y hora, en cualquier orden de atributos, y descarta los inválidos | — | ✅ OK | 2 ms |
| 164 | resume inicio, fin, duración y desnivel (sube 10,5 m y baja 5,5 m) | — | ✅ OK | 0 ms |
| 165 | sin horas ni elevación: duración y desnivel quedan vacíos (no se inventan) | — | ✅ OK | 0 ms |
| 166 | arma la línea en 3D para la base (sin elevación, cero) | — | ✅ OK | 0 ms |

## Reglas puras del modelo de estados y de composición

| # | Caso | CU / regla | Resultado | Tiempo |
|---|---|---|---|---|
| 167 | Regla 1: cada estado del grupo define el de sus integrantes | Estados | ✅ OK | 1 ms |
| 168 | Regla 1: el conductor queda Desplegado mientras el grupo rastrilla | Estados | ✅ OK | 0 ms |
| 169 | ningún estado de grupo deja a un integrante en un estado "sin grupo" | Estados | ✅ OK | 0 ms |
| 170 | cada acción sale de estados válidos y llega a un estado del catálogo | Estados | ✅ OK | 0 ms |
| 171 | las acciones del terreno sólo avanzan: salir → llegar → volver → base | Estados | ✅ OK | 0 ms |
| 172 | sólo se disuelve un grupo que está en la base | CU-26 | ✅ OK | 0 ms |
| 173 | el Líder informa sólo hechos del terreno; confirmar, asignar y disolver son del coordinador | Estados | ✅ OK | 0 ms |
| 174 | a un grupo de rastrillaje entra un agente o un conductor, no un recurso especial | CU-22/25 | ✅ OK | 0 ms |
| 175 | Líder de rastrillaje: del DUAR, no recurso especial y no conductor | CU-22/25/27 | ✅ OK | 0 ms |
| 176 | un grupo especial lo lidera cualquiera, incluso un conductor de afuera | CU-22 | ✅ OK | 0 ms |
| 177 | binomio: rastrillan todos menos el conductor | CU-27 | ✅ OK | 0 ms |
