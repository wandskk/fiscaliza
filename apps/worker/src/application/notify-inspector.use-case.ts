import { InspectionDecision } from '@fiscaliza/shared';
import type { Clock } from '../domain/clock.js';
import type { InspectionReader } from './ports/inspection.reader.js';
import type { NotificationRepository } from './ports/notification.repository.js';
import type { Notifier } from './ports/notifier.js';

export interface NotifyInspectorCommand {
  eventId: string;
  inspectionId: string;
  decision: InspectionDecision;
  // Only filled when the inspection was returned
  reason: string | null;
}

// notified: the e-mail went out and was recorded. duplicate: this event was already notified.
// skipped: the inspection is gone
export type NotifyInspectorOutcome = 'notified' | 'duplicate' | 'skipped';

export interface NotifyInspectorDeps {
  notifications: NotificationRepository;
  inspections: InspectionReader;
  notifier: Notifier;
  clock: Clock;
}

export class NotifyInspectorUseCase {
  constructor(private readonly deps: NotifyInspectorDeps) {}

  async execute(command: NotifyInspectorCommand): Promise<NotifyInspectorOutcome> {
    const { notifications, inspections, notifier, clock } = this.deps;
    const { eventId, inspectionId } = command;

    if (await notifications.existsForEvent(eventId)) return 'duplicate';

    const inspection = await inspections.findForNotification(inspectionId);
    if (inspection === null) return 'skipped';

    const subject =
      command.decision === InspectionDecision.APPROVE ? 'Vistoria aprovada' : 'Vistoria devolvida';
    const text = buildText(command, inspection.inspectorName, inspection.constructionSiteName);

    // At-least-once delivery: if the process dies between sending and saving, the event comes
    // again and the e-mail goes out twice. Accepted: a repeated e-mail beats a lost one
    await notifier.send({ to: inspection.inspectorEmail, subject, text });
    await notifications.save({
      eventId,
      userId: inspection.inspectorId,
      inspectionId,
      channel: 'EMAIL',
      subject,
      sentAt: clock.now(),
    });
    return 'notified';
  }
}

function buildText(
  { decision, reason }: NotifyInspectorCommand,
  inspectorName: string,
  siteName: string,
): string {
  if (decision === InspectionDecision.APPROVE) {
    return `Olá, ${inspectorName}. Sua vistoria da obra "${siteName}" foi aprovada.`;
  }
  const why = reason === null ? '' : `\n\nMotivo: ${reason}`;
  return `Olá, ${inspectorName}. Sua vistoria da obra "${siteName}" foi devolvida para ajustes.${why}\n\nEdite a vistoria e envie novamente.`;
}
