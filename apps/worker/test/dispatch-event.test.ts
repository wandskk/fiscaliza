import { Compliance, InspectionDecision, InspectionStatus } from '@fiscaliza/shared';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { GenerateReportUseCase } from '../src/application/generate-report.use-case.js';
import { NotifyInspectorUseCase } from '../src/application/notify-inspector.use-case.js';
import { dispatchEvent } from '../src/dispatch-event.js';
import { captureLogger } from './support/capture-logger.js';
import { decidedEvent, submittedEvent } from './support/events.js';
import { FakeLlm } from './support/fake-llm.js';
import { FakeNotifier } from './support/fake-notifier.js';
import { InMemoryInspectionReader } from './support/in-memory-inspection.reader.js';
import { InMemoryNotificationRepository } from './support/in-memory-notification.repository.js';
import { InMemoryReportRepository } from './support/in-memory-report.repository.js';

describe('dispatchEvent', () => {
  const inspectionId = randomUUID();
  let reports: InMemoryReportRepository;
  let notifier: FakeNotifier;
  let llm: FakeLlm;
  let log: ReturnType<typeof captureLogger>;
  let deps: Parameters<typeof dispatchEvent>[1];

  beforeEach(() => {
    reports = new InMemoryReportRepository();
    const inspections = new InMemoryInspectionReader();
    inspections.inspections.set(inspectionId, {
      id: inspectionId,
      status: InspectionStatus.SUBMITTED,
      notes: 'Escoramento sem travamento lateral na laje.',
      compliance: Compliance.NON_COMPLIANT,
      constructionSiteName: 'Escola Municipal Aurora',
      photoCount: 1,
    });
    inspections.forNotification.set(inspectionId, {
      id: inspectionId,
      inspectorId: randomUUID(),
      inspectorName: 'Marina Souza',
      inspectorEmail: 'marina@example.com',
      constructionSiteName: 'Escola Municipal Aurora',
    });
    notifier = new FakeNotifier();
    llm = new FakeLlm();
    log = captureLogger();
    deps = {
      generateReport: new GenerateReportUseCase({
        reports,
        inspections,
        llm,
        buildPrompt: (inspection) => inspection.notes,
        clock: { now: () => new Date() },
      }),
      notifyInspector: new NotifyInspectorUseCase({
        notifications: new InMemoryNotificationRepository(),
        inspections,
        notifier,
        clock: { now: () => new Date() },
      }),
      logger: log.logger,
    };
  });

  it('runs GenerateReportUseCase for an InspectionSubmitted event and logs the correlationId', async () => {
    const event = submittedEvent(inspectionId);

    const outcome = await dispatchEvent(JSON.stringify(event), deps);

    expect(outcome).toBe('generated');
    expect(reports.reports.get(inspectionId)?.eventId).toBe(event.id);
    expect(log.entries()).toContainEqual(
      expect.objectContaining({
        message: 'InspectionSubmitted processed',
        correlationId: event.correlationId,
        eventId: event.id,
        outcome: 'generated',
      }),
    );
  });

  it('logs and discards an event type it does not know, without touching the use case', async () => {
    const event = submittedEvent(inspectionId, { type: 'SomethingNew' as never });

    const outcome = await dispatchEvent(JSON.stringify(event), deps);

    expect(outcome).toBe('ignored');
    expect(llm.prompts).toHaveLength(0);
    expect(log.entries()).toContainEqual(
      expect.objectContaining({ level: 'warn', eventType: 'SomethingNew' }),
    );
  });

  it('runs NotifyInspectorUseCase for an InspectionDecided event and logs the correlationId', async () => {
    const event = decidedEvent(inspectionId, InspectionDecision.RETURN, 'Faltam fotos.');

    const outcome = await dispatchEvent(JSON.stringify(event), deps);

    expect(outcome).toBe('notified');
    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0]?.text).toContain('Faltam fotos.');
    expect(llm.prompts).toHaveLength(0);
    expect(log.entries()).toContainEqual(
      expect.objectContaining({
        message: 'InspectionDecided processed',
        correlationId: event.correlationId,
        eventId: event.id,
        outcome: 'notified',
      }),
    );
  });

  it('throws on an InspectionDecided whose data does not fit the contract', async () => {
    const event = decidedEvent(inspectionId, InspectionDecision.APPROVE, null, {
      data: { inspectionId, decision: 'MAYBE', reason: null, decidedBy: 'x' },
    });

    await expect(dispatchEvent(JSON.stringify(event), deps)).rejects.toThrow();
    expect(notifier.sent).toHaveLength(0);
  });

  it('throws on a body that is not JSON, so the message goes back to the queue', async () => {
    await expect(dispatchEvent('not json', deps)).rejects.toThrow();
  });

  it('throws on an envelope that does not fit the contract', async () => {
    const body = JSON.stringify({ id: 'x', type: 'InspectionSubmitted' });

    await expect(dispatchEvent(body, deps)).rejects.toThrow();
  });

  it('throws on an InspectionSubmitted whose data has no inspectionId', async () => {
    const event = submittedEvent(inspectionId, { data: { other: 1 } });

    await expect(dispatchEvent(JSON.stringify(event), deps)).rejects.toThrow();
  });

  it('lets the failure of the use case through', async () => {
    llm.error = new Error('all providers failed');
    const body = JSON.stringify(submittedEvent(inspectionId));

    await expect(dispatchEvent(body, deps)).rejects.toThrow('all providers failed');
  });
});
