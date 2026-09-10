# San Lorenzo Antro

Crear una nueva aplicación web instalable llamada “Seguimiento Antropométrico – San Lorenzo Fútbol Femenino”. Debe ser LOCAL-FIRST y funcionar SIN INTERNET después de instalarse/cargarse inicialmente en la notebook. NO usar Supabase ni ninguna base remota para las funciones principales. Guardar toda la información en IndexedDB local (preferentemente Dexie o equivalente) y configurar PWA/service worker para que la interfaz y datos funcionen offline. La notebook será el dispositivo principal. Más adelante podremos agregar backup/sincronización opcional, pero el MVP debe funcionar 100% offline.

DISEÑO: mobile + desktop, profesional, limpio, inspirado en San Lorenzo (azul oscuro, rojo, blanco), similar a un panel deportivo. Sidebar en desktop y navegación compacta en móvil. Título “Seguimiento Antropométrico – Primera División Fútbol Femenino”. Debe sentirse como una app instalada, no como una página de marketing.

MVP Y PANTALLAS:
1) INICIO: accesos a Jugadoras, Nuevo control, Historial, Comparativas, Evolución, Informes, Plantel completo, Importar/Exportar, Backup/Estado offline.
2) JUGADORAS: listado con buscador. Cada ficha muestra último control (fecha, peso, Sum6P), historial y accesos a nuevo control/evolución/informe.
3) NUEVO CONTROL: selector de jugadora + fecha. Mostrar arriba la fecha del último control. Cada variable debe mostrar en la MISMA FILA: “Nuevo valor”, “Último control” y “Diferencia”, para poder comparar mientras se mide. Variables:
- Peso (kg)
- Pliegues (mm): Tríceps, Subescapular, Supraespinal, Abdominal, Muslo, Pierna
- Perímetros (cm): Brazo, Muslo, Pantorrilla
Calcular automáticamente en tiempo real:
- Sum6P = suma de los seis pliegues.
- Brazo corregido = Perímetro brazo - (Tríceps / 10) * 3.14
- Muslo corregido = Perímetro muslo - (Pliegue muslo / 10) * 3.14
- Pantorrilla corregida = Perímetro pantorrilla - (Pliegue pierna / 10) * 3.14
Mostrar también para Sum6P y los tres perímetros corregidos: valor actual, valor del control anterior y diferencia. Permitir observación opcional. Botón Guardar control. Permitir editar/eliminar luego.
4) HISTORIAL: tabla cronológica por jugadora con todos los controles. Filtros por jugadora/fecha. Editar, eliminar y comparar.
5) COMPARATIVA: comparar cualquier par de controles y también botón rápido “Comparar con control anterior”. Mostrar diferencias por variable.
6) EVOLUCIÓN: gráficos temporales seleccionables para Peso, Sum6P, pliegues, perímetros y perímetros corregidos.
7) INFORMES: generador configurable estilo “Mostrar/Ocultar” de Excel. Debe permitir tildar/destildar variables y controles/fechas que aparecen. Variables seleccionables: Peso, Sum6P, 6 pliegues, 3 perímetros, 3 perímetros corregidos. Atajos: “Solo Peso + Sum6P”, “Antropometría completa”, “Perímetros + corregidos”, “Seleccionar todo”, “Deseleccionar todo”. También seleccionar qué controles/meses/fechas aparecen. Generar una vista limpia con solo lo seleccionado. Preparar botones Exportar PDF y Exportar Excel (si alguna exportación avanzada requiere una segunda fase, dejar UI y arquitectura preparada, pero priorizar que el informe visual funcione bien).
8) PLANTEL COMPLETO: tabla de todas las jugadoras con último control y columnas configurables, especialmente Peso, Sum6P y fecha del último control.
9) IMPORTAR/EXPORTAR: arquitectura preparada para importar un Excel histórico posteriormente. Debe poder exportar toda la base local a JSON/CSV/Excel o al menos JSON como backup desde el MVP. Importar/restaurar backup local sin internet.
10) OFFLINE: mostrar indicador “Modo offline”/“Datos guardados localmente”. La aplicación debe abrir y permitir cargar/consultar datos sin conexión. No hacer llamadas obligatorias a APIs externas para el uso cotidiano.

DATOS: entidades locales `players` y `controls`. Cada control debe guardar playerId, date, weight, triceps, subscapular, supraespinal, abdominal, thighSkinfold, calfSkinfold, armPerimeter, thighPerimeter, calfPerimeter, notes, createdAt, updatedAt. Sum6P y perímetros corregidos pueden calcularse en UI o guardarse derivados, pero deben ser consistentes. Tratar campos vacíos como null, nunca como 0.

EXPERIENCIA: números con coma o punto deben poder ingresarse de forma cómoda para Argentina. No guardar un control si no hay jugadora y fecha. Confirmación antes de eliminar. Diferencias con signo +/− y colores claros, pero sin asumir que subir o bajar siempre es “bueno” o “malo”; usar visual neutral.

Construir una primera versión funcional completa del MVP con datos de ejemplo mínimos (2-3 jugadoras y algunos controles) solo para poder probar la experiencia. No agregar login en esta primera versión. Priorizar estabilidad offline y claridad de datos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1472a100-f7d3-42ee-ab3b-faf623c73fa7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
