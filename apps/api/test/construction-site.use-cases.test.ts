import { Role, type ConstructionSiteFilter } from '@fiscaliza/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { AssignInspectorsUseCase } from '../src/modules/construction-sites/application/assign-inspectors.use-case';
import { CreateConstructionSiteUseCase } from '../src/modules/construction-sites/application/create-construction-site.use-case';
import { GetConstructionSiteUseCase } from '../src/modules/construction-sites/application/get-construction-site.use-case';
import { ListConstructionSitesUseCase } from '../src/modules/construction-sites/application/list-construction-sites.use-case';
import { UpdateConstructionSiteUseCase } from '../src/modules/construction-sites/application/update-construction-site.use-case';
import {
  ConstructionSiteClosedError,
  ConstructionSiteNotFoundError,
  DuplicateContractError,
  InvalidInspectorError,
} from '../src/modules/construction-sites/domain/construction-site.errors';
import {
  InMemoryConstructionSiteRepository,
  InMemoryInspectorDirectory,
} from './support/in-memory-construction-site.repository';

const manager = { id: 'manager-1', role: Role.MANAGER };
const ana = { id: 'inspector-ana', role: Role.INSPECTOR };
const beto = { id: 'inspector-beto', role: Role.INSPECTOR };
const school = {
  name: 'Escola Municipal',
  contract: 'CT-2026/014',
  address: 'Rua das Flores, 120',
};
const clinic = { name: 'UBS Jardim Norte', contract: 'CT-2026/021', address: 'Av. Brasil, 500' };
const firstPage: ConstructionSiteFilter = { page: 1, limit: 20 };

describe('construction site use cases', () => {
  let sites: InMemoryConstructionSiteRepository;
  let create: CreateConstructionSiteUseCase;
  let update: UpdateConstructionSiteUseCase;
  let get: GetConstructionSiteUseCase;
  let list: ListConstructionSitesUseCase;
  let assign: AssignInspectorsUseCase;

  beforeEach(() => {
    sites = new InMemoryConstructionSiteRepository();
    create = new CreateConstructionSiteUseCase(sites);
    update = new UpdateConstructionSiteUseCase(sites);
    get = new GetConstructionSiteUseCase(sites);
    list = new ListConstructionSitesUseCase(sites);
    assign = new AssignInspectorsUseCase(sites, new InMemoryInspectorDirectory([ana.id, beto.id]));
  });

  describe('CreateConstructionSiteUseCase', () => {
    it('saves an open site', async () => {
      const site = await create.execute(school);

      expect((await sites.findById(site.id))?.toProps()).toMatchObject({
        ...school,
        closed: false,
      });
    });

    it('refuses a contract that already exists with DuplicateContractError', async () => {
      await create.execute(school);

      await expect(create.execute({ ...clinic, contract: school.contract })).rejects.toBeInstanceOf(
        DuplicateContractError,
      );
    });
  });

  describe('UpdateConstructionSiteUseCase', () => {
    it('updates and closes a site', async () => {
      const { id } = await create.execute(school);

      const site = await update.execute(id, { name: 'Escola Nova', closed: true });

      expect(site.toProps()).toMatchObject({ name: 'Escola Nova', closed: true });
      expect((await sites.findById(id))?.closed).toBe(true);
    });

    it('checks the contract only when it changed', async () => {
      const { id } = await create.execute(school);
      await create.execute(clinic);

      await expect(update.execute(id, { contract: school.contract })).resolves.toBeDefined();
      await expect(update.execute(id, { contract: clinic.contract })).rejects.toBeInstanceOf(
        DuplicateContractError,
      );
      expect((await sites.findById(id))?.contract).toBe(school.contract);
    });

    it('refuses to change a closed site and to reopen it', async () => {
      const { id } = await create.execute(school);
      await update.execute(id, { closed: true });

      await expect(update.execute(id, { closed: false })).rejects.toBeInstanceOf(
        ConstructionSiteClosedError,
      );
    });

    it('answers ConstructionSiteNotFoundError for an unknown id', async () => {
      await expect(update.execute('missing', { name: 'Outra' })).rejects.toBeInstanceOf(
        ConstructionSiteNotFoundError,
      );
    });
  });

  describe('AssignInspectorsUseCase', () => {
    it('replaces the inspectors of the site, and accepts an empty list', async () => {
      const { id } = await create.execute(school);

      await assign.execute(id, [ana.id, beto.id]);
      expect((await sites.findById(id))?.inspectorIds).toEqual([ana.id, beto.id]);

      await assign.execute(id, []);
      expect((await sites.findById(id))?.inspectorIds).toEqual([]);
    });

    it('refuses an id that does not exist or is not an inspector, naming it', async () => {
      const { id } = await create.execute(school);

      const error = await assign.execute(id, [ana.id, manager.id]).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(InvalidInspectorError);
      expect(JSON.stringify((error as InvalidInspectorError).details)).toContain(manager.id);
      expect((await sites.findById(id))?.inspectorIds).toEqual([]);
    });
  });

  describe('visibility', () => {
    let schoolId: string;

    beforeEach(async () => {
      schoolId = (await create.execute(school)).id;
      const clinicId = (await create.execute(clinic)).id;
      await assign.execute(schoolId, [ana.id]);
      await assign.execute(clinicId, [beto.id]);
    });

    it('lists every site for the manager and only the assigned ones for an inspector', async () => {
      expect((await list.execute(firstPage, manager)).total).toBe(2);

      const forAna = await list.execute(firstPage, ana);
      expect(forAna.items.map((site) => site.id)).toEqual([schoolId]);
    });

    it('answers not found when an inspector opens a site assigned to someone else', async () => {
      await expect(get.execute(schoolId, ana)).resolves.toBeDefined();
      await expect(get.execute(schoolId, beto)).rejects.toBeInstanceOf(
        ConstructionSiteNotFoundError,
      );
      await expect(get.execute(schoolId, manager)).resolves.toBeDefined();
    });

    it('searches by name or contract, ignoring case, and filters closed sites', async () => {
      expect((await list.execute({ ...firstPage, search: 'ESCOLA' }, manager)).total).toBe(1);
      expect((await list.execute({ ...firstPage, search: '2026/021' }, manager)).total).toBe(1);

      await update.execute(schoolId, { closed: true });
      const open = await list.execute({ ...firstPage, closed: false }, manager);
      expect(open.items.map((site) => site.contract)).toEqual([clinic.contract]);
    });
  });
});
