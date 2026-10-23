import { Compliance, ErrorCode, InspectionStatus, MAX_PHOTOS } from '@fiscaliza/shared';
import { describe, expect, it } from 'vitest';
import { Inspection } from '../src/modules/inspections/domain/inspection.entity';
import { Photo } from '../src/modules/inspections/domain/photo.value-object';
import {
  IncompleteInspectionError,
  InvalidTransitionError,
  InspectionOwnerError,
  InvalidPhotoError,
  ApprovedInspectionError,
} from '../src/modules/inspections/domain/inspection.errors';
import type { Clock } from '../src/modules/inspections/domain/clock';

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
      { from: null, to: InspectionStatus.DRAFT, userId: 'inspector', at },
    ]);
    expect(inspection.createdAt).toEqual(at);
    expect(inspection.toProps().statusChanges).toEqual(inspection.statusChanges);
  });

  it('RN-01: only its inspector can change the inspection', () => {
    const inspection = make();
    expect(() => inspection.ensureOwner('other')).toThrow(InspectionOwnerError);
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
      InvalidPhotoError,
    );
    inspection.removePhoto('0', 'inspector', clock);
    expect(inspection.photos).toHaveLength(MAX_PHOTOS - 1);
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
});
