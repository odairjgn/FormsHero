import { describe, expect, it } from "vitest";
import { parseIni } from "./ini.ts";

describe("parseIni", () => {
  it("reads key=value pairs with lowercase, trimmed keys and trimmed values", () => {
    const ini = parseIni(["[song]", "Album = I Love Rock N' Roll", "  Year=1981  "].join("\n"));

    expect(ini["album"]).toBe("I Love Rock N' Roll");
    expect(ini["year"]).toBe("1981");
  });

  it("lowercases the key regardless of how it's cased in the file", () => {
    expect(parseIni("Artist = Joan Jett")["artist"]).toBe("Joan Jett");
    expect(parseIni("ARTIST = Joan Jett")["artist"]).toBe("Joan Jett");
    expect(parseIni("artist = Joan Jett")["artist"]).toBe("Joan Jett");
  });

  it("skips lines without '=' (e.g. the section header)", () => {
    const ini = parseIni(["[song]", "name = Test Song"].join("\n"));

    expect(Object.keys(ini)).toEqual(["name"]);
  });

  it("keeps an explicitly empty value as an empty string, not undefined", () => {
    const ini = parseIni("scores = ");

    expect(ini["scores"]).toBe("");
  });

  it("returns undefined for a key that was never present", () => {
    const ini = parseIni("name = Test Song");

    expect(ini["missing"]).toBeUndefined();
  });

  it("keeps everything after the first '=' as the value", () => {
    const ini = parseIni("name = a = b = c");

    expect(ini["name"]).toBe("a = b = c");
  });

  it("handles Windows (CRLF) and Unix (LF) line endings the same way", () => {
    const crlf = parseIni("album = A\r\nartist = B\r\n");
    const lf = parseIni("album = A\nartist = B\n");

    expect(crlf).toEqual(lf);
  });
});
