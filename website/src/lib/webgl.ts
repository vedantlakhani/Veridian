/**
 * Feature-detection for WebGL support.
 *
 * Used to decide whether it's safe to mount a react-three-fiber / three.js
 * scene (e.g. the hero canvas) or whether to fall back to a static/CSS
 * alternative. Must never throw — some browsers/environments (older
 * Safari, locked-down WebViews, SSR, disabled GPU) raise instead of
 * returning null from `getContext`.
 */
export function supportsWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    // Not running in a browser (e.g. SSR/build time).
    return false;
  }

  try {
    const canvas = document.createElement("canvas");

    const contextNames = ["webgl2", "webgl", "experimental-webgl"] as const;

    for (const name of contextNames) {
      try {
        const context = canvas.getContext(name);
        if (context) {
          return true;
        }
      } catch {
        // Some browsers throw on unsupported context names instead of
        // returning null — keep trying the rest.
        continue;
      }
    }

    return false;
  } catch {
    // Creating a canvas or querying it failed entirely.
    return false;
  }
}
