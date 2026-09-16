// Port of `GHCore.Services.Utils.ReadIni`.

/**
 * Parsed `song.ini` contents: lowercase, trimmed key -> trimmed value.
 * Looking up a key that wasn't present in the file yields `undefined` —
 * the same "missing key reads as empty" contract the C# original gets for
 * free from `SafeDictionary<TKey, TValue>`.
 */
export type IniData = Record<string, string | undefined>;

/**
 * Port of `Utils.ReadIni`: a minimal `key=value` reader. Same contract as
 * the original — keys are trimmed and lowercased, values are trimmed, and
 * lines without a `=` (e.g. the `[song]` section header) are skipped.
 *
 * One deliberate improvement over the original: `Utils.ReadIni` splits each
 * line on every `=` and only keeps the first two pieces (`l[0]`/`l[1]`),
 * silently truncating a value that itself contains a later `=`. Here only
 * the *first* `=` splits key from value, so the rest of the line is kept as
 * part of the value — real `song.ini` files never hit this case, but it's
 * a strictly more correct reading of `key=value`.
 */
export function parseIni(text: string): IniData {
  const result: IniData = {};

  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim().toLowerCase();
    if (key === "") continue;

    result[key] = line.slice(separator + 1).trim();
  }

  return result;
}
