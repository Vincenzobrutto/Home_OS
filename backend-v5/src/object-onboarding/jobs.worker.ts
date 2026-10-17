import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OnboardingJobService, ONBOARDING_JOB_LIMITS } from './jobs.service';

@Injectable()
export class OnboardingJobWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private tasks = new Set<Promise<void>>();
  private stopping = false;
  constructor(private readonly jobs: OnboardingJobService) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      if (this.stopping || this.tasks.size >= ONBOARDING_JOB_LIMITS.workerConcurrency) return;
      const task = this.tick().catch(() => console.warn('Analisi articoli rinviata.')).finally(() => this.tasks.delete(task));
      this.tasks.add(task);
    }, 500);
    this.timer.unref();
  }
  async onModuleDestroy() { this.stopping = true; if (this.timer) clearInterval(this.timer); await Promise.allSettled(this.tasks); }
  async tick(id?: string) { const job = await this.jobs.claim(id); if (job) await this.jobs.run(job); }
}
