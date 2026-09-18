import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_SETTINGS,
  DEFAULT_KEY_BINDINGS,
  findDuplicateKeyCodes,
  loadGameSettings,
  saveGameSettings,
} from "./gameSettings.ts";
import type { KeyBindingsSettings, StorageLike } from "./types.ts";

class FakeStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("loadGameSettings", () => {
  it("returns the defaults when nothing is stored", () => {
    expect(loadGameSettings(new FakeStorage())).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it("returns the defaults for a corrupted stored value instead of throwing", () => {
    const storage = new FakeStorage();
    storage.setItem("formshero:settings", "{not json");
    expect(loadGameSettings(storage)).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it("round-trips a saved settings object", () => {
    const storage = new FakeStorage();
    const settings = {
      calibrationOffsetMs: 25,
      hitWindowsMs: { perfect: 20, good: 60, ok: 120 },
      scrollPxPerMs: 0.6,
      keyBindings: DEFAULT_KEY_BINDINGS,
    };

    saveGameSettings(storage, settings);

    expect(loadGameSettings(storage)).toEqual(settings);
  });

  it("clamps an out-of-range stored value rather than accepting it as-is", () => {
    const storage = new FakeStorage();
    saveGameSettings(storage, {
      calibrationOffsetMs: 10_000,
      hitWindowsMs: { perfect: -50, good: 90, ok: 999_999 },
      scrollPxPerMs: 50,
      keyBindings: DEFAULT_KEY_BINDINGS,
    });

    const loaded = loadGameSettings(storage);

    expect(loaded.calibrationOffsetMs).toBe(300); // clamped to SETTINGS_LIMITS max
    expect(loaded.hitWindowsMs.perfect).toBe(10);
    expect(loaded.hitWindowsMs.good).toBe(90);
    expect(loaded.hitWindowsMs.ok).toBe(400);
    expect(loaded.scrollPxPerMs).toBe(1.2);
  });

  it("falls back per-field to defaults when a field is missing or non-numeric", () => {
    const storage = new FakeStorage();
    storage.setItem("formshero:settings", JSON.stringify({ calibrationOffsetMs: "oops" }));

    const loaded = loadGameSettings(storage);

    expect(loaded.calibrationOffsetMs).toBe(DEFAULT_GAME_SETTINGS.calibrationOffsetMs);
    expect(loaded.hitWindowsMs).toEqual(DEFAULT_GAME_SETTINGS.hitWindowsMs);
    expect(loaded.scrollPxPerMs).toBe(DEFAULT_GAME_SETTINGS.scrollPxPerMs);
    expect(loaded.keyBindings).toEqual(DEFAULT_KEY_BINDINGS);
  });

  it("falls back per-player to defaults when a player's bindings are malformed", () => {
    const storage = new FakeStorage();
    storage.setItem(
      "formshero:settings",
      JSON.stringify({
        keyBindings: {
          player1: { fretKeyCodes: ["KeyQ", "KeyW", "KeyE"], starPowerKeyCode: "" }, // wrong length + empty
          player2: { fretKeyCodes: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"], starPowerKeyCode: "Backquote" },
        },
      }),
    );

    const loaded = loadGameSettings(storage);

    expect(loaded.keyBindings.player1).toEqual(DEFAULT_KEY_BINDINGS.player1);
    expect(loaded.keyBindings.player2).toEqual({
      fretKeyCodes: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"],
      starPowerKeyCode: "Backquote",
    });
  });
});

describe("findDuplicateKeyCodes", () => {
  it("returns nothing when every slot across both players is distinct", () => {
    expect(findDuplicateKeyCodes(DEFAULT_KEY_BINDINGS)).toEqual([]);
  });

  it("flags a code reused within the same player's own bindings", () => {
    const bindings: KeyBindingsSettings = {
      player1: { fretKeyCodes: ["KeyD", "KeyF", "KeyJ", "KeyK", "KeyD"], starPowerKeyCode: "ShiftLeft" },
      player2: DEFAULT_KEY_BINDINGS.player2,
    };

    expect(findDuplicateKeyCodes(bindings)).toEqual(["KeyD"]);
  });

  it("flags a code shared across the two players", () => {
    const bindings: KeyBindingsSettings = {
      player1: DEFAULT_KEY_BINDINGS.player1,
      player2: { ...DEFAULT_KEY_BINDINGS.player2, starPowerKeyCode: "KeyL" }, // collides with player1's orange fret
    };

    expect(findDuplicateKeyCodes(bindings)).toEqual(["KeyL"]);
  });
});
