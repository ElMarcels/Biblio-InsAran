import "server-only";

import { translate } from "./translate";

export type { Translator } from "./translate";

/** Traductor para componentes de servidor. La interfaz es solo en castellano. */
export async function getT() {
  return translate;
}
