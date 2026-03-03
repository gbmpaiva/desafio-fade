/* eslint-disable @typescript-eslint/no-explicit-any */
import { http, HttpResponse, delay } from 'msw';
import { CheckinRule } from '@/src/models/CheckinRule';

// ── In-Memory Store ──
const checkinRulesDB: Record<string, CheckinRule[]> = {
  'evt-1': [
    {
      id: 'rule-evt1-1',
      eventId: 'evt-1',
      name: 'QR Code de Acesso',
      type: 'qr_code',
      description: 'Escaneie o QR Code recebido por email',
      isActive: true,
      isRequired: true,
      timeWindow: { before: 15, after: 30 },
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'rule-evt1-2',
      eventId: 'evt-1',
      name: 'Verificação de Documento',
      type: 'document',
      description: 'Apresente um documento com foto',
      isActive: true,
      isRequired: false,
      timeWindow: { before: 15, after: 30 },
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};


export const checkinHandlers = [
  // ── GET /api/checkin/rules/:eventId ──
  // Listar regras de check-in de um evento
  http.get('/api/checkin/rules/:eventId', async ({ params }) => {
    await delay(300);

    const eventId = params.eventId as string;
    const rules = checkinRulesDB[eventId] || [];

    return HttpResponse.json(rules);
  }),

  // ── POST /api/checkin/rules/:eventId ──
  // Criar nova regra
  http.post('/api/checkin/rules/:eventId', async ({ params, request }) => {
    await delay(400);

    const eventId = params.eventId as string;
    const body = (await request.json()) as Omit<
      CheckinRule,
      'id' | 'createdAt' | 'updatedAt'
    >;

    if (!body.name || !body.type) {
      return HttpResponse.json(
        { error: 'Nome e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    const newRule: CheckinRule = {
      ...body,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!checkinRulesDB[eventId]) {
      checkinRulesDB[eventId] = [];
    }

    checkinRulesDB[eventId].push(newRule);

    return HttpResponse.json(newRule, { status: 201 });
  }),

  // ── PUT /api/checkin/rules/:eventId/:ruleId ──
  // Editar regra
  http.put(
    '/api/checkin/rules/:eventId/:ruleId',
    async ({ params, request }) => {
      await delay(400);

      const eventId = params.eventId as string;
      const ruleId = params.ruleId as string;

      const rules = checkinRulesDB[eventId];
      if (!rules) {
        return HttpResponse.json(
          { error: 'Evento não encontrado' },
          { status: 404 }
        );
      }

      const ruleIndex = rules.findIndex((r) => r.id === ruleId);
      if (ruleIndex === -1) {
        return HttpResponse.json(
          { error: 'Regra não encontrada' },
          { status: 404 }
        );
      }

      const body = (await request.json()) as Partial<
        Omit<CheckinRule, 'id' | 'eventId' | 'createdAt'>
      >;

      rules[ruleIndex] = {
        ...rules[ruleIndex],
        ...body,
        updatedAt: new Date().toISOString(),
      };

      return HttpResponse.json(rules[ruleIndex]);
    }
  ),

  // ── DELETE /api/checkin/rules/:eventId/:ruleId ──
  // Deletar regra
  http.delete(
    '/api/checkin/rules/:eventId/:ruleId',
    async ({ params }) => {
      await delay(300);

      const eventId = params.eventId as string;
      const ruleId = params.ruleId as string;

      const rules = checkinRulesDB[eventId];
      if (!rules) {
        return HttpResponse.json(
          { error: 'Evento não encontrado' },
          { status: 404 }
        );
      }

      const ruleIndex = rules.findIndex((r) => r.id === ruleId);
      if (ruleIndex === -1) {
        return HttpResponse.json(
          { error: 'Regra não encontrada' },
          { status: 404 }
        );
      }

      rules.splice(ruleIndex, 1);

      return new HttpResponse(null, { status: 204 });
    }
  ),

  // ── PUT /api/checkin/rules/:eventId/order ──
  // Reordenar regras (drag & drop)
  http.put('/api/checkin/rules/:eventId/order', async ({ params, request }) => {
    await delay(300);

    const eventId = params.eventId as string;
    const body = (await request.json()) as CheckinRule[];

    if (!Array.isArray(body)) {
      return HttpResponse.json(
        { error: 'Formato inválido' },
        { status: 400 }
      );
    }

    checkinRulesDB[eventId] = body;

    return HttpResponse.json(body);
  }),

  // ── POST /api/checkin/rules/:eventId/validate ──
  // Validar regras (detectar conflitos)
  http.post(
    '/api/checkin/rules/:eventId/validate',
    async ({ params, request }) => {
      await delay(300);

      const eventId = params.eventId as string;
      const body = (await request.json()) as CheckinRule[];

      // Validação básica (delegada ao frontend)
      const errors: string[] = [];
      const warnings: string[] = [];
      const conflicts: any[] = [];

      // 1. Verificar se há pelo menos 1 regra ativa
      const activeRules = body.filter((r) => r.isActive);
      if (activeRules.length === 0) {
        errors.push('Deve existir pelo menos uma regra de check-in ativa.');
      }

      // 2. Verificar regras obrigatórias ativas
      const activeRequired = body.filter((r) => r.isActive && r.isRequired);
      if (activeRequired.length === 0 && activeRules.length > 0) {
        warnings.push('Recomenda-se ter pelo menos uma regra obrigatória ativa.');
      }

      // 3. Detectar conflitos de janela
      for (let i = 0; i < activeRequired.length; i++) {
        for (let j = i + 1; j < activeRequired.length; j++) {
          const rule1 = activeRequired[i];
          const rule2 = activeRequired[j];

          const start1 = -rule1.timeWindow.before;
          const end1 = rule1.timeWindow.after;
          const start2 = -rule2.timeWindow.before;
          const end2 = rule2.timeWindow.after;

          const hasConflict = !(end1 < start2 || end2 < start1);

          if (hasConflict) {
            conflicts.push({
              ruleId1: rule1.id,
              ruleId2: rule2.id,
              ruleName1: rule1.name,
              ruleName2: rule2.name,
              reason: `Janelas incompatíveis entre "${rule1.name}" e "${rule2.name}"`,
              severity: 'error',
            });
          }
        }
      }

      return HttpResponse.json({
        isValid: errors.length === 0 && conflicts.length === 0,
        errors,
        warnings,
        conflicts,
      });
    }
  ),

  // ── POST /api/checkin/participant/identify ──
  // Identificar participante
  http.post('/api/checkin/participant/identify', async ({ request }) => {
    await delay(500);

    const body = (await request.json()) as {
      method: 'token' | 'name' | 'document';
      value: string;
      eventId: string;
    };

    // Mock: aceitar qualquer valor
    if (!body.value) {
      return HttpResponse.json(
        { error: 'Valor obrigatório' },
        { status: 400 }
      );
    }

    // Mock data
    return HttpResponse.json(
      {
        participantId: `p-${Date.now()}`,
        participantName: 'João Silva',
        eventId: body.eventId,
        email: 'joao@example.com',
      },
      { status: 200 }
    );
  }),

  // ── POST /api/checkin/participant/complete-rule ──
  // Marcar regra como completa
  http.post(
    '/api/checkin/participant/complete-rule',
    async ({ request }) => {
      await delay(300);

      const body = (await request.json()) as {
        participantId: string;
        eventId: string;
        ruleId: string;
      };

      // Mock: aceitar sempre
      return HttpResponse.json(
        {
          success: true,
          message: 'Regra completada com sucesso',
          completedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
  ),

  // ── POST /api/checkin/participant/finalize ──
  // Finalizar check-in do participante
  http.post('/api/checkin/participant/finalize', async ({ request }) => {
    await delay(400);

    const body = (await request.json()) as {
      participantId: string;
      eventId: string;
    };

    // Mock: aceitar sempre
    return HttpResponse.json(
      {
        success: true,
        message: 'Check-in realizado com sucesso',
        checkedInAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }),
];