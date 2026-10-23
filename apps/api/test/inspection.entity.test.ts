import { Compliance, ErrorCode, InspectionStatus, MAX_PHOTOS } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { Inspection } from '../src/modules/inspections/domain/inspection.entity';
import { Photo } from '../src/modules/inspections/domain/photo.value-object';
import {
  IncompleteInspectionError,
  InvalidTransitionError,
  InspectionOwnerError,
  PhotoNotFoundError,
  PhotoRejectedError,
  ApprovedInspectionError,
  MissingReturnReasonError,
} from '../src/modules/inspections/domain/inspection.errors';
import type { Clock } from '../src/shared/time/clock';
import { ForbiddenError } from '../src/shared/errors/domain-error';

const at = new Date('2026-10-23T12:00:00.000Z');
const clock: Clock = { now: () => new Date(at) };
const make = (notes = 'An observation with at least thirty characters') =>
  Inspection.create(
    {
      id: 'inspection',
      constructionSiteId: 'site',
      inspectorId: 'inspector',
      notes,
      compliance: Compliance.COMPLIANT,
    },
    clock,
  );
const photo = (id: string) =>
  Photo.create({ id, key: `key-${id}`, contentType: 'image/jpeg', size: 1 });

describe('Inspection', () => {
  it('RN-02 and RN-09: creates a draft with initial history and clock time', () => {
    const inspection = make();
    expect(inspection.status).toBe(InspectionStatus.DRAFT);
    expect(inspection.statusChanges).toEqual([
      { from: null, to: InspectionStatus.DRAFT, userId: 'inspector', at, reason: null },
    ]);
    expect(inspection.createdAt).toEqual(at);
    expect(inspection.toProps().statusChanges).toEqual(inspection.statusChanges);
  });

  it('RN-01: only its inspector can change the inspection', () => {
    const inspection = make();
    expect(() => inspection.ensureOwner('other')).toThrow(InspectionOwnerError);
    // 403, not 422: someone else's inspection is a permission problem
    expect(() => inspection.ensureOwner('other')).toThrow(ForbiddenError);
    try {
      inspection.ensureOwner('other');
    } catch (error) {
      expect((error as InspectionOwnerError).code).toBe(ErrorCode.RN_01);
    }
    inspection.ensureOwner('inspector');
  });

  it('RN-04: requires 30 characters of notes and at least one photo to submit', () => {
    const short = make('short');
    short.addPhoto(photo('one'), 'inspector', clock);
    expect(() => short.submit('inspector', clock)).toThrow(IncompleteInspectionError);
    const empty = make();
    expect(() => empty.submit('inspector', clock)).toThrow(IncompleteInspectionError);
    expect(empty.statusChanges).toHaveLength(1);
  });

  it('RN-05: accepts ten photos, rejects an eleventh and removes by id', () => {
    const inspection = make();
    for (let index = 0; index < MAX_PHOTOS; index++)
      inspection.addPhoto(photo(`${index}`), 'inspector', clock);
    expect(inspection.photos).toHaveLength(MAX_PHOTOS);
    expect(() => inspection.addPhoto(photo('extra'), 'inspector', clock)).toThrow(
      PhotoRejectedError,
    );
    inspection.removePhoto('0', 'inspector', clock);
    expect(inspection.photos).toHaveLength(MAX_PHOTOS - 1);
    expect(() => inspection.removePhoto('missing', 'inspector', clock)).toThrow(PhotoNotFoundError);
  });

  it('RN-03, RN-07 and RN-09: submits draft or returned, records each change, and blocks submitted or approved edits', () => {
    const inspection = make();
    inspection.addPhoto(photo('one'), 'inspector', clock);
    inspection.update(
      { notes: 'Updated observation with sufficient length', compliance: Compliance.NON_COMPLIANT },
      'inspector',
      clock,
    );
    expect(inspection.compliance).toBe(Compliance.NON_COMPLIANT);
    inspection.submit('inspector', clock);
    expect(inspection.statusChanges[1]).toEqual({
      from: InspectionStatus.DRAFT,
      to: InspectionStatus.SUBMITTED,
      userId: 'inspector',
      at,
      reason: null,
    });
    expect(() => inspection.update({ notes: 'no' }, 'inspector', clock)).toThrow(
      InvalidTransitionError,
    );
    expect(() => inspection.submit('inspector', clock)).toThrow(InvalidTransitionError);
    const returned = Inspection.restore({
      ...inspection.toProps(),
      status: InspectionStatus.RETURNED,
    });
    returned.update({ notes: 'Corrected observation with sufficient length' }, 'inspector', clock);
    returned.submit('inspector', clock);
    expect(returned.statusChanges.at(-1)?.from).toBe(InspectionStatus.RETURNED);
    const approved = Inspection.restore({
      ...inspection.toProps(),
      status: InspectionStatus.APPROVED,
    });
    expect(() => approved.ensureEditable()).toThrow(ApprovedInspectionError);
    expect(() => approved.addPhoto(photo('two'), 'inspector', clock)).toThrow(
      ApprovedInspectionError,
    );
    expect(() => approved.removePhoto('one', 'inspector', clock)).toThrow(ApprovedInspectionError);
    expect(() => approved.submit('inspector', clock)).toThrow(ApprovedInspectionError);
  });

  describe('manager decision', () => {
    const manager = 'manager';
    const reason = 'Fotos sem foco e sem a armação.';
    const decidedAt = new Date('2026-10-24T09:00:00.000Z');
    const decisionClock: Clock = { now: () => new Date(decidedAt) };
    const inStatus = (status: InspectionStatus) => {
      const draft = make();
      draft.addPhoto(photo('one'), 'inspector', clock);
      return Inspection.restore({ ...draft.toProps(), status });
    };

    it('RN-08 and RN-09: approves a submitted inspection and records who decided and when', () => {
      const inspection = inStatus(InspectionStatus.SUBMITTED);
      inspection.approve(manager, decisionClock);
      expect(inspection.status).toBe(InspectionStatus.APPROVED);
      expect(inspection.statusChanges.at(-1)).toEqual({
        from: InspectionStatus.SUBMITTED,
        to: InspectionStatus.APPROVED,
        userId: manager,
        at: decidedAt,
        reason: null,
      });
      expect(inspection.updatedAt).toEqual(decidedAt);
    });

    it('RN-06, RN-08 and RN-09: returns with the reason in the field and in the history', () => {
      const inspection = inStatus(InspectionStatus.SUBMITTED);
      inspection.returnToInspector(manager, `  ${reason}  `, decisionClock);
      expect(inspection.status).toBe(InspectionStatus.RETURNED);
      expect(inspection.returnReason).toBe(reason);
      expect(inspection.statusChanges.at(-1)).toEqual({
        from: InspectionStatus.SUBMITTED,
        to: InspectionStatus.RETURNED,
        userId: manager,
        at: decidedAt,
        reason,
      });
    });

    it('RN-06: refuses a missing, blank or short reason and changes nothing', () => {
      for (const bad of ['', '   ', 'curto', '  123456789  ']) {
        const inspection = inStatus(InspectionStatus.SUBMITTED);
        expect(() => inspection.returnToInspector(manager, bad, decisionClock)).toThrow(
          MissingReturnReasonError,
        );
        expect(inspection.status).toBe(InspectionStatus.SUBMITTED);
        expect(inspection.returnReason).toBeNull();
        expect(inspection.statusChanges).toHaveLength(1);
      }
      const ok = inStatus(InspectionStatus.SUBMITTED);
      ok.returnToInspector(manager, '1234567890', decisionClock);
      expect(ok.status).toBe(InspectionStatus.RETURNED);
      try {
        inStatus(InspectionStatus.SUBMITTED).returnToInspector(manager, 'x', decisionClock);
      } catch (error) {
        expect((error as MissingReturnReasonError).code).toBe(ErrorCode.RN_06);
      }
    });

    it('RN-03: decides only a submitted inspection, whatever the decision', () => {
      for (const status of [InspectionStatus.DRAFT, InspectionStatus.RETURNED]) {
        const inspection = inStatus(status);
        expect(() => inspection.approve(manager, decisionClock)).toThrow(InvalidTransitionError);
        expect(() => inspection.returnToInspector(manager, reason, decisionClock)).toThrow(
          InvalidTransitionError,
        );
        expect(inspection.status).toBe(status);
      }
    });

    it('RN-07: an approved inspection cannot be decided again', () => {
      const inspection = inStatus(InspectionStatus.APPROVED);
      expect(() => inspection.approve(manager, decisionClock)).toThrow(ApprovedInspectionError);
      expect(() => inspection.returnToInspector(manager, reason, decisionClock)).toThrow(
        ApprovedInspectionError,
      );
    });

    it('RN-09: resubmitting clears returnReason but the reason stays in the history', () => {
      const inspection = inStatus(InspectionStatus.SUBMITTED);
      inspection.returnToInspector(manager, reason, decisionClock);
      inspection.submit('inspector', decisionClock);
      expect(inspection.status).toBe(InspectionStatus.SUBMITTED);
      expect(inspection.returnReason).toBeNull();
      expect(inspection.statusChanges.map((change) => change.reason)).toEqual([null, reason, null]);
      expect(inspection.statusChanges.at(-1)?.userId).toBe('inspector');
    });
  });
});
