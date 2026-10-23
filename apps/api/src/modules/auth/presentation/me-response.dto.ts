import { meResponseSchema } from '@fiscaliza/shared';
import { createZodDto } from 'nestjs-zod';

export class MeResponseDto extends createZodDto(meResponseSchema) {}
