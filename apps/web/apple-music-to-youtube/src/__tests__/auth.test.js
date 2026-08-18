import { describe, it, expect, vi } from "vitest";
import {
  YOUTUBE_SCOPE,
  GIS_SCRIPT_URL,
  validateClientId,
  tokenFromResponse,
  isTokenValid,
  createAuthorizer,
  loadGoogleIdentity,
} from "../auth.js";

describe("YOUTUBE_SCOPE", () => {
  it("requests the scope needed to create playlists", () => {
    expect(YOUTUBE_SCOPE).toBe("https://www.googleapis.com/auth/youtube");
  });
});

describe("validateClientId", () => {
  it("accepts a google oauth web client id", () => {
    expect(validateClientId("1234-abc.apps.googleusercontent.com")).toBe(true);
  });

  it("rejects empty or obviously wrong values", () => {
    expect(validateClientId("")).toBe(false);
    expect(validateClientId("my-client-id")).toBe(false);
    expect(validateClientId(null)).toBe(false);
  });
});

describe("tokenFromResponse", () => {
  it("converts expires_in into an absolute expiry with a safety margin", () => {
    const token = tokenFromResponse({ access_token: "abc", expires_in: 3600 }, 1_000_000);
    expect(token.accessToken).toBe("abc");
    expect(token.expiresAt).toBe(1_000_000 + 3600 * 1000 - 60_000);
  });

  it("returns null when the response carries no token", () => {
    expect(tokenFromResponse({ error: "access_denied" }, 0)).toBeNull();
  });
});

describe("isTokenValid", () => {
  it("is true before expiry and false after", () => {
    expect(isTokenValid({ accessToken: "a", expiresAt: 2000 }, 1000)).toBe(true);
    expect(isTokenValid({ accessToken: "a", expiresAt: 500 }, 1000)).toBe(false);
  });

  it("is false for a missing token", () => {
    expect(isTokenValid(null, 0)).toBe(false);
    expect(isTokenValid({ accessToken: "", expiresAt: 9e9 }, 0)).toBe(false);
  });
});

describe("createAuthorizer", () => {
  function fakeGoogle(behaviour) {
    return {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((config) => ({
            requestAccessToken: vi.fn(() => behaviour(config)),
          })),
        },
      },
    };
  }

  it("resolves with a token when the user consents", async () => {
    const google = fakeGoogle((config) =>
      config.callback({ access_token: "abc", expires_in: 3600 }),
    );
    const authorizer = createAuthorizer({
      clientId: "x.apps.googleusercontent.com",
      google,
      now: () => 0,
    });

    await expect(authorizer.requestToken()).resolves.toMatchObject({ accessToken: "abc" });
    expect(google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: "x.apps.googleusercontent.com", scope: YOUTUBE_SCOPE }),
    );
  });

  it("rejects when the user dismisses the consent screen", async () => {
    const google = fakeGoogle((config) => config.error_callback({ type: "popup_closed" }));
    const authorizer = createAuthorizer({ clientId: "x.apps.googleusercontent.com", google });

    await expect(authorizer.requestToken()).rejects.toThrow(/popup_closed|cancel/i);
  });

  it("rejects when the token response carries an error", async () => {
    const google = fakeGoogle((config) => config.callback({ error: "access_denied" }));
    const authorizer = createAuthorizer({ clientId: "x.apps.googleusercontent.com", google });

    await expect(authorizer.requestToken()).rejects.toThrow(/access_denied/);
  });

  it("refuses to build an authorizer without a valid client id", () => {
    expect(() => createAuthorizer({ clientId: "nope", google: fakeGoogle(() => {}) })).toThrow(
      /client id/i,
    );
  });

  it("fails clearly when the google identity script has not loaded", () => {
    expect(() =>
      createAuthorizer({ clientId: "x.apps.googleusercontent.com", google: undefined }),
    ).toThrow(/google identity/i);
  });
});

describe("loadGoogleIdentity", () => {
  function fakeDom() {
    const scripts = [];
    const doc = {
      head: { appendChild: (script) => scripts.push(script) },
      createElement: () => {
        const listeners = {};
        return {
          src: "",
          async: false,
          removed: false,
          addEventListener(type, fn) {
            (listeners[type] ||= []).push(fn);
          },
          remove() {
            this.removed = true;
          },
          fire(type) {
            for (const fn of listeners[type] || []) fn();
          },
        };
      },
      querySelector: (selector) =>
        scripts.find((script) => !script.removed && selector === `script[src="${script.src}"]`) ||
        null,
    };
    return { doc, scripts };
  }

  it("resolves immediately when the library is already present", async () => {
    const win = { google: { accounts: { oauth2: {} } } };
    const { doc, scripts } = fakeDom();
    await expect(loadGoogleIdentity(doc, win)).resolves.toBe(win.google);
    expect(scripts).toHaveLength(0);
  });

  it("injects the script and resolves on load", async () => {
    const win = {};
    const { doc, scripts } = fakeDom();
    const loading = loadGoogleIdentity(doc, win);

    expect(scripts[0].src).toBe(GIS_SCRIPT_URL);
    expect(scripts[0].async).toBe(true);
    win.google = { accounts: { oauth2: {} } };
    scripts[0].fire("load");

    await expect(loading).resolves.toBe(win.google);
  });

  it("rejects when the script fails to load", async () => {
    const { doc, scripts } = fakeDom();
    const loading = loadGoogleIdentity(doc, {});
    scripts[0].fire("error");
    await expect(loading).rejects.toThrow(/Could not load/i);
  });

  // A dead tag's load/error event has already fired and will never fire again,
  // so reusing it would leave the retry hanging forever.
  it("replaces a dead script tag on retry instead of hanging", async () => {
    const win = {};
    const { doc, scripts } = fakeDom();

    const first = loadGoogleIdentity(doc, win);
    scripts[0].fire("error");
    await expect(first).rejects.toThrow(/Could not load/i);

    const retry = loadGoogleIdentity(doc, win);
    expect(scripts).toHaveLength(2);
    expect(scripts[0].removed).toBe(true);

    win.google = { accounts: { oauth2: {} } };
    scripts[1].fire("load");
    await expect(retry).resolves.toBe(win.google);
  });
});
