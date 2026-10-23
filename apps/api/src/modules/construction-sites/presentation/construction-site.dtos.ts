import {
  assignInspectorsSchema,
  constructionSiteDetailSchema,
  constructionSiteFilterSchema,
  constructionSiteSchema,
  createConstructionSiteSchema,
  paginatedSchema,
  updateConstructionSiteSchema,
} from '@fiscaliza/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateConstructionSiteDto extends createZodDto(createConstructionSiteSchema) {}
export class UpdateConstructionSiteDto extends createZodDto(updateConstructionSiteSchema) {}
export class AssignInspectorsDto extends createZodDto(assignInspectorsSchema) {}
export class ConstructionSiteFilterDto extends createZodDto(constructionSiteFilterSchema) {}
export class ConstructionSiteDto extends createZodDto(constructionSiteSchema) {}
export class ConstructionSiteDetailDto extends createZodDto(constructionSiteDetailSchema) {}
export class ConstructionSitePageDto extends createZodDto(
  paginatedSchema(constructionSiteSchema),
) {}
