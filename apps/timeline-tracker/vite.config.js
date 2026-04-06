import { resolve } from "path";
import { createGameConfig } from "../../vite.shared.js";

export default createGameConfig({
  root: resolve(import.meta.dirname, "."),
  port: 3009,
});
