import { http, HttpResponse, delay } from "msw";
import { event, participant } from "../data/store";

export const dashboardHandlers = [
  // GET /api/dashboard
  http.get("/api/dashboard", async () => {
    await delay(300);

const stats = {
  totalEvents: event.length,                              // era totalEventos
  activeEvents: event.filter((e) => e.status === "active").length,  // era eventosAtivos
  totalParticipants: participant.length,                  // era totalParticipantes
  checkinToday: participant.filter((p) => p.checkedIn).length,      // era checkinsHoje
};

    return HttpResponse.json(stats);
  }),
];
