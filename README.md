# Statistiklabbet

Statistiklabbet är en frontend-app byggd med Vite, React och TypeScript.
Appen är på svenska och riktad till matematik i årskurs 7.

Syftet är att göra statistik tydligt och praktiskt genom att låta elever mata in egna värden och direkt se hur lägesmåtten och diagrammen förändras.

## Innehåll i appen

Appen har tre vyer:

1. Lägesmått
2. Diagram
3. Kombinatorik

Vyerna kan nås via menyn i toppen och via hash-länkar i URL:

- `#lagesmatt`
- `#diagram`
- `#kombinatorik`

## 1. Lägesmått

I Lägesmått-vyn arbetar du med listan av värden.

Det går att:

- lägga till ett värde i taget (heltal eller decimaltal med komma eller punkt)
- se alla inmatade värden som klickbara chips
- ta bort ett enskilt värde genom att klicka på dess chip
- rensa hela listan med knappen Rensa

Under listan visas fyra statistikrutor:

- Medelvärde
- Median
- Typvärde
- Värdespridning

Varje ruta visar både:

- en förformaterad beräkning till vänster
- resultatet till höger

## 2. Diagram

Diagram-vyn använder samma värdelista som Lägesmått.

Stöd finns för:

- Stapeldiagram
- Cirkeldiagram

Stapeldiagram har två lägen:

- Stående
- Liggande

Skalan visar frekvens, alltså hur många gånger varje värde förekommer.

## 3. Kombinatorik

Kombinatorik-vyn är en förberedd yta för kommande övningar om val, ordning och kombinationer.

## Sparad data

Appen sparar data i webbläsarens localStorage:

- värdelistan sparas automatiskt
- valt stapelläge (stående/liggande) sparas automatiskt

Det betyder att dina senaste ändringar finns kvar efter omladdning i samma webbläsare.

## Kom igång lokalt

Installera beroenden:

```bash
npm install
```

Starta utvecklingsserver:

```bash
npm run dev
```

Bygg för produktion:

```bash
npm run build
```

Förhandsgranska produktionsbygge:

```bash
npm run preview
```

## Teknik

- Vite
- React
- TypeScript

## Målgrupp

Appen är utformad för undervisning i statistik i årskurs 7, med tydligt språk och direkt visuell återkoppling.
