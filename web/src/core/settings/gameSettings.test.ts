import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_SETTINGS, loadGameSettings, saveGameSettings } from "./gameSettings.ts";
import type { StorageLike } from "./types.ts";

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
    const settings = { calibrationOffsetMs: 25, hitWindowsMs: { perfect: 20, good: 60, ok: 120 }, scrollPxPerMs: 0.6 };

    saveGameSettings(storage, settings);

    expect(loadGameSettings(storage)).toEqual(settings);
  });

  it("clamps an out-of-range stored value rather than accepting it as-is", () => {
    const storage = new FakeStorage();
    saveGameSettings(storage, {
      calibrationOffsetMs: 10_000,
      hitWindowsMs: { perfect: -50, good: 90, ok: 999_999 },
      scrollPxPerMs: 50,
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
  });
});
