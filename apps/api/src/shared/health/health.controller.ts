import { Controller, Get, Res, ServiceUnavailableException } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../auth/decorators';
import { PrismaService } from '../database/prisma.service';

const DATABASE_TIMEOUT_MS = 1000;

// The compose healthcheck calls it every 10 s from the same IP
@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  // The 503 keeps the Terminus body instead of the error format: whoever reads it
  // (Docker, load balancer) wants to see which dependency is down
  @Get()
  @HealthCheck()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        () => this.database.pingCheck('database', this.prisma, { timeout: DATABASE_TIMEOUT_MS }),
      ]);
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
      res.status(error.getStatus());
      return error.getResponse() as HealthCheckResult;
    }
  }
}
