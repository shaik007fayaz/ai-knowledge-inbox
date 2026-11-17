import type { Logger } from '../logger';

type Job = () => Promise<void>;

/** Tiny in-memory FIFO queue with a concurrency limit. Jobs lost on crash are recovered from the DB on boot. */
export class JobRunner {
  private readonly queue: Array<{ name: string; job: Job }> = [];
  private active = 0;
  private idleWaiters: Array<() => void> = [];

  constructor(
    private readonly concurrency: number,
    private readonly logger: Logger,
  ) {}

  add(name: string, job: Job): void {
    this.queue.push({ name, job });
    this.pump();
  }

  /** Resolves once the queue is empty and nothing is running. */
  drain(): Promise<void> {
    if (this.isIdle()) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  private isIdle(): boolean {
    return this.active === 0 && this.queue.length === 0;
  }

  private pump(): void {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.active++;
      next
        .job()
        .catch((err) => this.logger.error({ err, job: next.name }, 'Job crashed'))
        .finally(() => {
          this.active--;
          this.pump();
          if (this.isIdle()) {
            this.idleWaiters.forEach((resolve) => resolve());
            this.idleWaiters = [];
          }
        });
    }
  }
}
