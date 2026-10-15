# JOEASSIST Custom HTML CV Templates Integration Guide

This directory (`src/templates/custom/`) is the designated integration point for the 7 original HTML CV templates to be provided by the founder (Joseph Chiemezie).

## Architecture & Security Principles
1. **Isolated Components**: Each custom template lives in its own file (e.g. `TemplateOriginal1.tsx`, `TemplateOriginal2.tsx`, etc.).
2. **Standardized Data Mapping**: Use `adaptCVData(cv)` from `./adapter.ts` to map the standard `CVDocument` model to the template markup cleanly.
3. **No Unsafe iframes / Scripts**: Raw `<script>` tags are avoided. All formatting, responsive styles, and print-ready A4 dimensions are declared cleanly using scoped Tailwind classes or dedicated style modules.
4. **Registration**: Each template is registered into `customTemplateRegistry` in `registry.ts`.
5. **Zero Data Loss**: Users can switch freely between the built-in 30+ templates and the 7 original custom templates without losing any field data or section order.

## How to add one of the 7 original HTML templates:
1. Create a file `src/templates/custom/TemplateOriginal1.tsx`.
2. Extract the HTML/CSS from the source template file.
3. Import `adaptCVData` and `registerCustomTemplate`.
4. Call `registerCustomTemplate({ id: 'original-1', name: 'Original Template 1', ... })`.
5. Run `compile_applet` to verify compilation.
