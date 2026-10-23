import { InspectionDecision } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { NotifyInspectorUseCase } from '../src/application/notify-inspector.use-case.js';
import { FakeNotifier } from './support/fake-notifier.js';
import { InMemoryInspectionReader } from './support/in-memory-inspection.reader.js';
import { InMemoryNotificationRepository } from './support/in-memory-notification.repository.js';

describe('NotifyInspectorUseCase', () => {
  const inspectionId = randomUUID();
  const inspectorId = randomUUID();
  const now = new Date('2026-10-23T12:00:00.000Z');
  let notifications: InMemoryNotificationRepository;
  let notifier: FakeNotifier;
  let useCase: NotifyInspectorUseCase;

  beforeEach(() => {
    notifications = new InMemoryNotificationRepository();
    notifier = new FakeNotifier();
    const inspections = new InMemoryInspectionReader();
    inspections.forNotification.set(inspectionId, {
      id: inspectionId,
      inspectorId,
      inspectorName: 'Marina Souza',
      inspectorEmail: 'marina@example.com',
      constructionSiteName: 'Escola Municipal Aurora',
    });
    useCase = new NotifyInspectorUseCase({
      notifications,
      inspections,
      notifier,
      clock: { now: () => now },
    });
  });

  it('tells the inspector that the inspection was approved and records the notification', async () => {
    const eventId = randomUUID();

    const outcome = await useCase.execute({
      eventId,
      inspectionId,
      decision: InspectionDecision.APPROVE,
      reason: null,
    });

    expect(outcome).toBe('notified');
    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0]).toMatchObject({
      to: 'marina@example.com',
      subject: 'Vistoria aprovada',
    });
    expect(notifier.sent[0]?.text).toContain('Escola Municipal Aurora');
    expect(notifications.notifications.get(eventId)).toEqual({
      eventId,
      userId: inspectorId,
      inspectionId,
      channel: 'EMAIL',
      subject: 'Vistoria aprovada',
      sentAt: now,
    });
  });

  it('tells the inspector that the inspection was returned, with the reason', async () => {
    await useCase.execute({
      eventId: randomUUID(),
      inspectionId,
      decision: InspectionDecision.RETURN,
      reason: 'Faltam fotos do escoramento.',
    });

    expect(notifier.sent[0]?.subject).toBe('Vistoria devolvida');
    expect(notifier.sent[0]?.text).toContain('Escola Municipal Aurora');
    expect(notifier.sent[0]?.text).toContain('Motivo: Faltam fotos do escoramento.');
  });

  it('does not send again for an event that was already notified', async () => {
    const command = {
      eventId: randomUUID(),
      inspectionId,
      decision: InspectionDecision.APPROVE,
      reason: null,
    };
    await useCase.execute(command);

    const outcome = await useCase.execute(command);

    expect(outcome).toBe('duplicate');
    expect(notifier.sent).toHaveLength(1);
  });

  it('ends without error and without sending when the inspection does not exist', async () => {
    const eventId = randomUUID();

    const outcome = await useCase.execute({
      eventId,
      inspectionId: randomUUID(),
      decision: InspectionDecision.APPROVE,
      reason: null,
    });

    expect(outcome).toBe('skipped');
    expect(notifier.sent).toHaveLength(0);
    expect(notifications.notifications.has(eventId)).toBe(false);
  });

  it('records nothing when the delivery fails, so the retry sends it', async () => {
    notifier.error = new Error('SES refused');
    const eventId = randomUUID();

    await expect(
      useCase.execute({
        eventId,
        inspectionId,
        decision: InspectionDecision.APPROVE,
        reason: null,
      }),
    ).rejects.toThrow('SES refused');

    expect(notifications.notifications.has(eventId)).toBe(false);
  });
});
