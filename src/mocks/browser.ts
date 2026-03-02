import { setupWorker } from "msw/browser";
import { handlers } from "./index";

// This worker is only activated in the browser (client-side).
// The Service Worker file (mockServiceWorker.js) must be present in /public.
export const worker = setupWorker(...handlers);
