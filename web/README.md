# FormsHero Web

Port do FormsHero para um jogo web (browser) com gameplay real. Ver o plano completo em
[`../docs/web-port-plan.md`](../docs/web-port-plan.md).

Stack: Vite + TypeScript (strict) puro, Canvas 2D para o gameplay, Vitest para testes.
Sem backend — site 100% estático.

## Estrutura

- `src/core/parsing` — leitura de `song.ini`/`notes.mid` (port do parsing do `GHCore`).
- `src/core/audio` — motor de áudio sincronizado via Web Audio API (port do `NAudioPlayer`).
- `src/core/gameplay` — note highway, julgamento de acerto, combo/pontuação.
- `src/ui` — telas (seleção de música, seleção de instrumento/dificuldade, resultado).

## Scripts

```
npm install
npm run dev      # servidor de desenvolvimento
npm test         # roda os testes (Vitest)
npm run build    # build de produção
```
