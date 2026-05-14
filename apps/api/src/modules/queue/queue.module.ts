import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobProducer } from '@parshlo/queue';

@Module({
  providers: [
    {
      provide: JobProducer,
      inject: [ConfigService],
      useFactory: (config: ConfigService): JobProducer => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        return new JobProducer(url);
      },
    },
  ],
  exports: [JobProducer],
})
export class QueueModule {}
