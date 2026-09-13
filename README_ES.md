# Morse Practice · CW Studio

**Aprendé CW. Creá prácticas. Entrená Head Copy. Exportá el resultado.**

[![Prueba en vivo](https://img.shields.io/badge/EN%20VIVO-CW%20Studio-00c2b8?style=for-the-badge)](https://zp5dxs.github.io/CW-Studio/)
[![Morse Practice](https://img.shields.io/badge/MORSE%20PRACTICE-Abrir%20app-6c63ff?style=for-the-badge)](https://zp5dxs.github.io/morse-practice/)
[![GitHub](https://img.shields.io/badge/GITHUB-Repositorio-181717?style=for-the-badge&logo=github)](https://github.com/ZP5DXS/CW-Studio)

[English](README.md) · **Español**

> Estudio gratuito de aprendizaje y práctica de CW que funciona directamente en el navegador. Las funciones principales no requieren cuenta y el progreso del curso se guarda localmente.

## Probar ahora

**CW Studio:** https://zp5dxs.github.io/CW-Studio/  
**Ecosistema Morse Practice:** https://zp5dxs.github.io/morse-practice/  
**Código fuente:** https://github.com/ZP5DXS/CW-Studio

CW Studio está pensado para funcionar como una aplicación estática en GitHub Pages. Abrí la prueba en vivo, elegí idioma y voz y entrá por **Aprender CW**, **Crear** o **Head Copy**.

## ¿Qué es CW Studio?

CW Studio es el componente de aprendizaje guiado del ecosistema Morse Practice. Combina un curso fijo de 20 lecciones, un generador flexible de sesiones de práctica, desafíos de Head Copy posteriores al curso, narración humana reutilizable, síntesis CW sinusoidal, visuales 2D generativos, progreso local y exportación de audio/video desde el navegador.

La idea visual central es la **Living Line**: una única línea luminosa cambia de función durante la sesión. Con la narración se transforma en una onda de voz; en Familiarización representa el timing CW; durante los mnemonics se convierte en una asociación visual; y en Reconocimiento, Maratón, QSO y Head Copy vuelve a una línea fluida orientada a la escucha.

## Funciones principales

- **20 lecciones guiadas de Aprender CW** — todas pueden seleccionarse libremente.
- **Español e inglés** — interfaz, curso y ayudas.
- **Cuatro voces con nombre** — AURA / NEXO en español y NOVA / VECTOR en inglés.
- **Familiarización** — escuchás el carácter, aparece la asociación visual, oís la respuesta y luego el CW de referencia.
- **Reconocimiento** — elimina progresivamente la ayuda visual para entrenar la identificación auditiva.
- **Maratón** — escucha continua con menos interrupciones.
- **Crear** — constructor guiado de sesiones con modos, contenido, WPM, velocidad efectiva, tiempo de respuesta, orden aleatorio, variación de tono, tono de cortesía y duración.
- **Contenido operativo** — letras, números, alfanumérico, puntuación, prosigns, abreviaturas, prefijos DX, indicativos completos, RST, palabras de radio, fragmentos QSO y texto propio.
- **Head Copy** — 100 palabras comunes, 100 indicativos, 100 palabras de radio, 100 números, 100 abreviaturas CW, QSO Head Copy y Head Copy continuo.
- **Progreso local** — las lecciones completadas se guardan en el navegador.
- **Línea temporal navegable** — reproducir, pausar, detener, saltar a otro punto y pantalla completa.
- **Exportación WAV / MP3** — generada en el navegador.
- **Exportación rápida de video** — intenta render offline a MP4 mediante WebCodecs + Mediabunny; conserva un fallback WebM en tiempo real.
- **Sin anuncios y sin backend obligatorio** para la experiencia principal.

## Inicio rápido

1. Abrí la **Prueba en vivo**.
2. Elegí **ES / EN** y una voz.
3. Entrá en una de las tres áreas:
   - **Aprender CW** para realizar el curso completo.
   - **Crear** para generar una práctica personalizada.
   - **Head Copy** para los desafíos posteriores al curso.
4. Presioná **Reproducir**. Podés tocar la línea temporal para avanzar o retroceder y usar pantalla completa.
5. Cuando quieras conservar el material, exportalo como **WAV**, **MP3** o **VIDEO**.

## Aprender CW: cómo funciona el curso

El curso utiliza una **Morse Practice Character Sequence** original, diseñada buscando contraste acústico, utilidad lingüística y aplicación real en radio, sin copiar el orden de lecciones de otra escuela.

El ciclo típico al introducir un carácter nuevo es:

**CW → asociación mnemonic → nombre hablado → CW de referencia → transición → siguiente carácter**

La gráfica CW respeta el timing real:

| Elemento | Duración |
|---|---:|
| Dit | 1 unidad |
| Dah | 3 unidades |
| Espacio entre elementos del mismo carácter | 1 unidad |
| Espacio entre caracteres | 3 unidades |
| Espacio entre palabras | 7 unidades |

Después el curso progresa desde caracteres aislados hacia grupos, números, indicativos, abreviaturas operativas, RST, fragmentos QSO, intercambios completos y finalmente trabajo orientado a Head Copy.

La lógica completa está documentada en [`COURSE_LOGIC.md`](COURSE_LOGIC.md). Las asociaciones visuales están en [`MNEMONICS.md`](MNEMONICS.md).

## Crear: tutorial de sesiones personalizadas

**Crear** permite construir una práctica sin modificar la estructura fija del curso.

### 1. Elegí el modo

**Familiarización** mantiene el apoyo pedagógico y es ideal para material todavía nuevo. El tono de cortesía entre caracteres está disponible en Avanzado y viene desactivado por defecto.

**Reconocimiento** se concentra en identificar lo escuchado. En caracteres individuales puede dar la respuesta hablada y una transmisión final de referencia. El reconocimiento a velocidad variable puede presentar el mismo carácter a distintas velocidades antes de revelar la respuesta.

**Maratón** sirve para escucha continua con menos interrupciones. Podés seleccionar varios modos; CW Studio reparte el tiempo total solicitado entre las fases elegidas.

### 2. Elegí el material

Para entrenamiento básico usá letras y números. **Prefijos DX** entrena comienzos reconocibles de indicativos; **Indicativos completos** se acerca mucho más a la escucha real. También hay RST, prosigns, abreviaturas, palabras, fragmentos QSO y texto propio.

**El texto propio conserva el orden escrito.** El orden aleatorio está pensado principalmente para material generado de letras/números.

### 3. Ajustá el sonido

- **WPM:** velocidad de los caracteres.
- **Velocidad efectiva:** controla el espaciado cuando corresponde.
- **Tiempo de respuesta:** cuánto espera antes de revelar/decir la respuesta.
- **Reconocimiento variable:** introduce variaciones de velocidad.
- **Orden aleatorio:** activado por defecto para letras/números generados.
- **Tono de cortesía:** opcional en Familiarización personalizada.
- **Variación de tono:** agrega pequeñas diferencias de pitch para evitar una escucha excesivamente mecánica.

### 4. Elegí la duración

Podés crear desde una práctica corta hasta una sesión larga de escucha. La sesión generada incluye una apertura y un cierre hablados generales para no comenzar o terminar de forma abrupta.

## Head Copy

Head Copy es deliberadamente más auditivo y visualmente más limpio que Familiarización. No muestra el ECG CW para palabras o indicativos largos porque una sucesión densa de pulsos termina distrayendo.

Los desafíos normales tienen intros y cierres grabados específicos. Durante los retos de 100 elementos aparecen mensajes de coaching para favorecer la escucha de unidades completas en lugar del deletreo mental carácter por carácter.

**Head Copy continuo** está pensado como una sesión larga que el operador detiene manualmente. La exportación de video está desactivada allí para evitar renderizados accidentales de varias horas.

## Exportar audio y video

### WAV / MP3

El audio se sintetiza/renderiza en el navegador usando la misma timeline de la reproducción. Así se mantienen alineados el timing CW, las voces, los tonos de transición y la estructura de la sesión.

### VIDEO

CW Studio intenta primero un **render offline rápido**:

1. renderiza el audio completo;
2. genera directamente los frames 2D del canvas;
3. codifica video H.264 + audio AAC;
4. empaqueta el resultado como MP4.

Si el navegador no puede usar el camino rápido con WebCodecs, CW Studio vuelve automáticamente al exportador compatible que graba canvas + audio en tiempo real a WebM.

Para mejores resultados se recomienda un navegador Chromium actualizado, como Chrome o Edge.

## Living Line

CW Studio evita deliberadamente apilar varios visualizadores. Existe una sola línea continua:

- **Portada / espera:** línea base.
- **Narración:** onda de energía de voz.
- **CW de Familiarización:** traza temporal CW.
- **Mnemonic:** silueta de asociación.
- **Reconocimiento / Maratón / QSO / Head Copy:** línea de escucha fluida.

El objetivo no es enseñar Morse como puntos y rayas escritos. La traza sirve para visualizar el timing durante Familiarización; la escucha sigue siendo la habilidad principal.

## Paquetes de voz

CW Studio utiliza dos familias de voice packs estáticos generados para Morse Practice:

```text
assets/
└── voices/
    ├── core/
    │   ├── course_voice_index.json
    │   └── es|en/...
    └── course/
        ├── voice_index.json
        └── es|en/...
```

La aplicación lee los índices JSON generados y conserva la estructura actual de los audios. No conviene renombrar o mover los MP3 sin actualizar simultáneamente los índices y el loader.

## Ejecutar localmente

Como el proyecto utiliza módulos ES y carga JSON/audio, **no conviene abrir `index.html` directamente con `file://`**. Levantá un servidor HTTP local.

Con Python instalado:

```bash
cd CW-Studio
python -m http.server 8000
```

Luego abrí:

```text
http://localhost:8000
```

En Windows también podés usar `py -m http.server 8000` si `python` no está registrado como comando.

## Publicar en GitHub Pages

1. Subí el repositorio completo, incluyendo `assets/voices`.
2. En GitHub entrá en **Settings → Pages**.
3. En **Build and deployment**, elegí **Deploy from a branch**.
4. Seleccioná la rama de producción —normalmente `main`— y `/ (root)`.
5. Guardá y esperá el despliegue.
6. Abrí la web publicada. Si después de una actualización importante sigue apareciendo una versión anterior, hacé un hard refresh para descartar caché viejo.

URL de producción:

**https://zp5dxs.github.io/CW-Studio/**

## Estructura del proyecto

```text
CW-Studio/
├── index.html
├── css/
│   └── app.css
├── js/
│   ├── app.js
│   ├── audio-catalog.js
│   ├── course-engine.js
│   ├── export-engine.js
│   ├── headcopy-engine.js
│   ├── morse-engine.js
│   ├── playback.js
│   ├── session-builder.js
│   ├── timeline.js
│   ├── video-export.js
│   ├── visual-engine.js
│   └── voice-engine.js
├── data/
│   └── mnemonics.json
├── assets/
│   └── voices/...
├── COURSE_LOGIC.md
├── MNEMONICS.md
├── README.md
└── README_ES.md
```

## Privacidad

El funcionamiento principal de CW Studio no requiere cuenta ni perfil en servidor. El progreso del curso se almacena localmente en el navegador y los archivos exportados se generan en el dispositivo del usuario.

## Contribuir

Son bienvenidos los reportes de bugs, correcciones de contenido, mejoras de accesibilidad, compatibilidad entre navegadores e ideas relacionadas con entrenamiento CW.

Una regla importante al modificar el curso: **la narración y la acción deben coincidir**. Si una voz anuncia un repaso, nuevos caracteres, grupos o un desafío, la timeline debe realizar esa actividad inmediatamente después.

## Proyecto relacionado

**Morse Practice:** https://zp5dxs.github.io/morse-practice/

Morse Practice reúne el ecosistema general de práctica; CW Studio se concentra en aprendizaje guiado, sesiones personalizadas, Head Copy y generación reutilizable de audio/video.

## Autor

**ZP5DXS (Matt)**  
Radioafición / CW.

Facebook: https://www.facebook.com/ZP5DXS  
GitHub: https://github.com/ZP5DXS

## Licencia

Proyecto gratuito y open source. Si distribuís o modificás el proyecto, conservá el archivo de licencia del repositorio y la atribución correspondiente junto al código fuente.

**73 de ZP5DXS**


<!-- UI cleanup v2.7: runtime debug/status text hidden from the public interface; About rebuilt as the project footer. -->


<!-- v2.8: Continuous Head Copy now uses a bounded auto-loop instead of a giant prebuilt timeline; exports are disabled for the infinite mode. Offline audio export now reports render progress and guards unsafe durations. -->
