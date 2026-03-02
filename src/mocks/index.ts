
import { authHandlers } from "./handlers/auth";
import { dashboardHandlers } from "./handlers/dashboard";
import { eventosHandlers } from "./handlers/eventos";
import { participantesHandlers } from "./handlers/participantes";

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...eventosHandlers,
  ...participantesHandlers,
];