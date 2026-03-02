import { setupServer } from "msw/node";
import { handlers } from "./index";

// This server is used in Node.js environments:
// - Next.js SSR / server components (during dev)
// - Jest / Vitest unit tests
export const server = setupServer(...handlers);
