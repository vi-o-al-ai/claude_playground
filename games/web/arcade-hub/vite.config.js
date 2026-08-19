import { resolve } from "path";
import { createProjectConfig } from "../../../vite.shared.js";

export default createProjectConfig({
  root: resolve(import.meta.dirname, "."),
  siteRoot: true,
});
