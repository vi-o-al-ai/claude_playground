import { describe, it, expect } from "vitest";

import {
  planOutputs,
  hotkeyForIndex,
  isVirtualCableLabel,
  formatBytes,
  passthroughTarget,
} from "../audio.js";

describe("planOutputs", () => {
  it("plays only on the default output when no device is chosen", () => {
    expect(planOutputs({ deviceId: null, monitor: true })).toEqual([{ sinkId: "" }]);
    expect(planOutputs({ deviceId: "", monitor: false })).toEqual([{ sinkId: "" }]);
  });

  it("plays on the chosen device plus the default output when monitoring", () => {
    expect(planOutputs({ deviceId: "cable-1", monitor: true })).toEqual([
      { sinkId: "cable-1" },
      { sinkId: "" },
    ]);
  });

  it("plays only on the chosen device when monitoring is off", () => {
    expect(planOutputs({ deviceId: "cable-1", monitor: false })).toEqual([{ sinkId: "cable-1" }]);
  });

  it("does not double-play when the chosen device is the default device", () => {
    expect(planOutputs({ deviceId: "default", monitor: true })).toEqual([{ sinkId: "default" }]);
  });
});

describe("hotkeyForIndex", () => {
  it("maps the first nine sounds to keys 1-9", () => {
    expect(hotkeyForIndex(0)).toBe("1");
    expect(hotkeyForIndex(8)).toBe("9");
  });

  it("maps the tenth sound to key 0", () => {
    expect(hotkeyForIndex(9)).toBe("0");
  });

  it("returns null past the tenth sound", () => {
    expect(hotkeyForIndex(10)).toBeNull();
    expect(hotkeyForIndex(42)).toBeNull();
  });
});

describe("isVirtualCableLabel", () => {
  it("recognises common virtual audio devices", () => {
    expect(isVirtualCableLabel("CABLE Input (VB-Audio Virtual Cable)")).toBe(true);
    expect(isVirtualCableLabel("VoiceMeeter Input (VB-Audio VoiceMeeter VAIO)")).toBe(true);
    expect(isVirtualCableLabel("BlackHole 2ch")).toBe(true);
  });

  it("rejects ordinary outputs", () => {
    expect(isVirtualCableLabel("Speakers (Realtek High Definition Audio)")).toBe(false);
    expect(isVirtualCableLabel("AirPods Pro")).toBe(false);
    expect(isVirtualCableLabel("")).toBe(false);
  });
});

describe("passthroughTarget", () => {
  it("routes the mic to an explicitly chosen device", () => {
    expect(passthroughTarget({ deviceId: "cable-1" })).toBe("cable-1");
  });

  it("refuses when no device is chosen (would echo through speakers)", () => {
    expect(passthroughTarget({ deviceId: "" })).toBeNull();
    expect(passthroughTarget({ deviceId: null })).toBeNull();
  });

  it("refuses the default device (same echo problem)", () => {
    expect(passthroughTarget({ deviceId: "default" })).toBeNull();
  });
});

describe("formatBytes", () => {
  it("formats sizes into readable units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
