/**
 * YouTube authorization via Google Identity Services.
 *
 * A static site cannot keep a client secret, so this uses the GIS token
 * client: the user consents in a popup and we get a ~1 hour access token with
 * no refresh token. Long conversions therefore have to handle re-auth.
 */

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";
export const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";

// Expire a minute early so a token cannot die mid-request.
const EXPIRY_MARGIN_MS = 60_000;

export function validateClientId(clientId) {
  return (
    typeof clientId === "string" &&
    /^[\w-]+(?:[.\w-]*)\.apps\.googleusercontent\.com$/.test(clientId.trim())
  );
}

export function tokenFromResponse(response, now) {
  if (!response?.access_token) return null;
  const lifetimeMs = (Number(response.expires_in) || 3600) * 1000;
  return { accessToken: response.access_token, expiresAt: now + lifetimeMs - EXPIRY_MARGIN_MS };
}

export function isTokenValid(token, now) {
  return Boolean(token?.accessToken) && Number(token.expiresAt) > now;
}

export function createAuthorizer({ clientId, google, now = () => Date.now() } = {}) {
  if (!validateClientId(clientId)) {
    throw new Error("A Google OAuth client id ending in .apps.googleusercontent.com is required");
  }
  if (!google?.accounts?.oauth2) {
    throw new Error(
      "Google Identity Services has not loaded yet — check your connection and reload",
    );
  }

  return {
    /** Opens the consent popup and resolves with {accessToken, expiresAt}. */
    requestToken({ prompt = "" } = {}) {
      return new Promise((resolve, reject) => {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId.trim(),
          scope: YOUTUBE_SCOPE,
          prompt,
          callback: (response) => {
            if (response?.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            const token = tokenFromResponse(response, now());
            if (!token) {
              reject(new Error("Google did not return an access token"));
              return;
            }
            resolve(token);
          },
          error_callback: (error) => {
            reject(
              new Error(
                error?.type === "popup_closed"
                  ? "popup_closed: sign-in was cancelled"
                  : error?.type || "sign-in failed",
              ),
            );
          },
        });
        tokenClient.requestAccessToken();
      });
    },
  };
}

/** Loads the GIS script, resolving with `window.google`. */
export function loadGoogleIdentity(doc = document, win = window) {
  if (win.google?.accounts?.oauth2) return Promise.resolve(win.google);

  return new Promise((resolve, reject) => {
    // A failed attempt leaves a dead tag behind. Its load/error event has
    // already fired and will never fire again, so reusing it would leave this
    // promise unsettled forever — always start from a fresh tag.
    doc.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)?.remove();

    const script = doc.createElement("script");
    script.addEventListener("load", () => resolve(win.google));
    script.addEventListener("error", () =>
      reject(new Error("Could not load Google Identity Services")),
    );
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    doc.head.appendChild(script);
  });
}
