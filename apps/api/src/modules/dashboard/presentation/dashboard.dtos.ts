import { dashboardSchema } from '@fiscaliza/shared';
import { createZodDto } from 'nestjs-zod';

export class DashboardDto extends createZodDto(dashboardSchema) {}
