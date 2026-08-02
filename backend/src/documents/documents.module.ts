import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ClaudeExtractionService } from './claude-extraction.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, ClaudeExtractionService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
