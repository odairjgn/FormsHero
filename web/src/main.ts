// Entry point. All screen flow lives in `app.ts` (Etapa 4) — this file just
// mounts it into the page's root element.

import "./style.css";
import { startApp } from "./app.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;
startApp(app);
