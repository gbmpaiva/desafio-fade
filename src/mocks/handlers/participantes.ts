import { http, HttpResponse, delay } from "msw";
import { participant, event, nextParticipanteId } from "../data/store";
import { ParticipantFormData } from "@/src/models/Participant";

export const participantesHandlers = [
  // GET /api/participantes
  http.get("/api/participantes", async ({ request }) => {
    await delay(400);

    const url = new URL(request.url);
    const eventoId = url.searchParams.get("eventoId");

    const result = eventoId
      ? participant.filter((p) => p.eventId === eventoId)
      : [...participant];

    return HttpResponse.json(result);
  }),

  // GET /api/participantes/:id
  http.get("/api/participantes/:id", async ({ params }) => {
    await delay(300);

    const participante = participant.find((p) => p.id === params.id);
    if (!participante) {
      return HttpResponse.json({ message: "Participante não encontrado." }, { status: 404 });
    }

    return HttpResponse.json(participante);
  }),

  // POST /api/participantes
  http.post("/api/participantes", async ({ request }) => {
    await delay(500);

    const body = (await request.json()) as ParticipantFormData;
    const evento = event.find((e) => e.id === body.eventId);

    const novo = {
      ...body,
      id: nextParticipanteId(),
      eventName: evento?.name ?? "",
      checkedIn: false,
      participantCount: 0,
      createdAt: new Date().toISOString(),
    };

    participant.push(novo);

    return HttpResponse.json(novo, { status: 201 });
  }),

  // PUT /api/participantes/:id
  http.put("/api/participantes/:id", async ({ params, request }) => {
    await delay(400);

    const index = participant.findIndex((p) => p.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: "Participante não encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as Partial<ParticipantFormData & { checkin: boolean }>;

    // If eventoId changed, validate new event and update eventName
    if (body.eventId && body.eventId !== participant[index].eventId) {
      const evento = event.find((e) => e.id === body.eventId);

      if (!evento) {
        return HttpResponse.json({ message: "Evento não encontrado." }, { status: 404 });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventDate = new Date(evento.date);
      eventDate.setHours(0, 0, 0, 0);

      if (evento.status === "cancelled") {
        return HttpResponse.json(
          { message: "Não é possível mover participante para um evento cancelado." },
          { status: 422 }
        );
      }

      if (evento.status === "closed") {
        return HttpResponse.json(
          { message: "Não é possível mover participante para um evento encerrado." },
          { status: 422 }
        );
      }

      if (eventDate < today) {
        return HttpResponse.json(
          { message: "Não é possível mover participante para um evento com data passada." },
          { status: 422 }
        );
      }

      body.name = evento.name;
    }

    participant[index] = { ...participant[index], ...body };

    return HttpResponse.json(participant[index]);
  }),

  // DELETE /api/participantes/:id
  http.delete("/api/participantes/:id", async ({ params }) => {
    await delay(400);

    const index = participant.findIndex((p) => p.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: "Participante não encontrado." }, { status: 404 });
    }

    participant.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];