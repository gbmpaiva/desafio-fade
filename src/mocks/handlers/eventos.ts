import { http, HttpResponse, delay } from "msw";
import { event, participant, nextEventoId } from "../data/store";

import { EventFormData } from "@/src/models/Event";
import { CheckinRule } from "@/src/models/CheckinRule";

export const eventosHandlers = [
  // GET /api/eventos
  http.get("/api/eventos", async () => {
    await delay(400);
    return HttpResponse.json([...event]);
  }),

  // GET /api/eventos/:id
  http.get("/api/eventos/:id", async ({ params }) => {
    await delay(300);

    const evento = event.find((e) => e.id === params.id);
    if (!evento) {
      return HttpResponse.json({ message: "Evento não encontrado." }, { status: 404 });
    }

    return HttpResponse.json(evento);
  }),

  // POST /api/eventos
  http.post("/api/eventos", async ({ request }) => {
    await delay(500);

    const body = (await request.json()) as EventFormData;

    const novo = {
      ...body,
      id: nextEventoId(),
      participantCount: 0,
      createdAt: new Date().toISOString(),           
      updatedAt: new Date().toISOString(),           
    };

    event.push(novo);

    return HttpResponse.json(novo, { status: 201 });
  }),

  // PUT /api/eventos/:id
  http.put("/api/eventos/:id", async ({ params, request }) => {
    await delay(500);

    const index = event.findIndex((e) => e.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: "Evento não encontrado." }, { status: 404 });
    }

const body = (await request.json()) as Partial<EventFormData>;
    event[index] = { ...event[index], ...body };

    return HttpResponse.json(event[index]);
  }),

  // DELETE /api/eventos/:id
  http.delete("/api/eventos/:id", async ({ params }) => {
    await delay(400);

    const index = event.findIndex((e) => e.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: "Evento não encontrado." }, { status: 404 });
    }

    event.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/eventos", async () => {
    await delay(400);
    const synced = event.map((e) => ({
      ...e,
      participantCount: participant.filter((p) => p.eventId === e.id).length,
    }));
    return HttpResponse.json(synced);
  }),
// GET /api/eventos/:id/regras-checkin
http.get("/api/eventos/:id/regras-checkin", async ({ params }) => {
  await delay(300);

  const evento = event.find((e) => e.id === params.id);
  if (!evento) {
    return HttpResponse.json({ message: "Evento não encontrado." }, { status: 404 });
  }

  const regras: CheckinRule[] = evento.checkinrules ?? [];
  return HttpResponse.json(regras);
}),

// PUT /api/eventos/:id/regras-checkin
http.put("/api/eventos/:id/regras-checkin", async ({ params, request }) => {
  await delay(500);

  const index = event.findIndex((e) => e.id === params.id);
  if (index === -1) {
    return HttpResponse.json({ message: "Evento não encontrado." }, { status: 404 });
  }

  const evento = event[index];

  // ── Validação 1: status impede edição ──────────────────────
  if (evento.status === "closed" || evento.status === "cancelled") {
    return HttpResponse.json(
      { message: `Não é possível alterar regras de um evento ${evento.status === "closed" ? "encerrado" : "cancelado"}.` },
      { status: 422 }
    );
  }

  // ── Validação 2: data/hora do evento já passou ──────────────
  const eventDate = new Date(evento.date);
  const now = new Date();
  if (eventDate < now) {
    return HttpResponse.json(
      { message: "Não é possível alterar regras de um evento que já ocorreu." },
      { status: 422 }
    );
  }

  // ── Salva as regras (body real, não hardcoded) ──────────────
  const body = (await request.json()) as CheckinRule[];
  event[index] = {
    ...evento,
    checkinrules: body,
    updatedAt: new Date().toISOString(),
  };

  return HttpResponse.json(body);
}),

];


  