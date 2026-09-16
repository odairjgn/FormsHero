// Test-only fixture paths — not imported by any app code (main.ts). Lets
// the parsing tests run against the real songs in `FormsHero/musica/`, per
// docs/web-port-plan.md, Etapa 1: "Testes: validar o parsing contra as 8
// músicas reais de musica/ (... sem alterar os arquivos-fonte)". Nothing
// here reads or writes those files — it only resolves paths for tests to
// read from.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the repo's real song library (`FormsHero/musica/`). */
export const MUSICA_DIR = join(here, "../../../../FormsHero/musica");

/** The 8 bundled song folder names, exactly as they are on disk. */
export const SONG_DIRS = {
  joanJett: "1.1 Joan Jett and the Blackhearts - I Love Rock and Roll",
  kiss: "1.2 Kiss - Rock and Roll All Night",
  motleyCrue: "1.4 Motley Crue - Shout at the Devil",
  boston: "2.2 Boston - More than a Feeling",
  incubus: "2.7 Incubus - Stellar",
  kansas: "4.1 Kansas - Carry On Wayward Son",
  afi: "4.2 AFI - Miss Murder",
  dragonForce: "8.1 DragonForce - Through the Fire and Flames",
} as const;
