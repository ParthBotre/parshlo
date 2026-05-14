import { Module } from '@nestjs/common';

import { InquiryController } from './inquiry.controller.js';
import { InquiryService } from './inquiry.service.js';

@Module({
  controllers: [InquiryController],
  providers: [InquiryService],
})
export class InquiryModule {}
