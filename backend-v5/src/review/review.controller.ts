import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from '../documents/access';
import { ListDocumentsDto } from '../documents/dto';
import { ReviewService } from './review.service';
import { ConfirmDto, CreateAssetDto, RetryAnalysisDto, ManualDto, StartAnalysisDto } from './dto';
@Controller('homes/:homeId')
@UseGuards(DocumentAccessGuard)
export class ReviewController {
  constructor(private readonly review: ReviewService) {}
  @Get('analysis-capabilities') capabilities() { return this.review.capabilities(); }
  @Post('analysis-jobs') @HttpCode(202)
  start(@Req() req: DocumentRequest, @Param('homeId') h: string, @Body() body: StartAnalysisDto, @Headers('idempotency-key') key?: string) { return this.review.start(req.documentAccountId, h, body, key); }
  @Get('analysis-jobs') jobs(@Req() req: DocumentRequest, @Param('homeId') h: string, @Query() query: ListDocumentsDto) { return this.review.list(req.documentAccountId, h, 'jobs', query); }
  @Get('analysis-jobs/:jobId') job(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('jobId') id: string) { return this.review.getJob(req.documentAccountId, h, id); }
  @Post('analysis-jobs/:jobId/retry') @HttpCode(202)
  retry(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('jobId') id: string, @Body() body: RetryAnalysisDto, @Headers('idempotency-key') key?: string) { return this.review.retry(req.documentAccountId, h, id, body, key); }
  @Get('assets') assets(@Req() req: DocumentRequest, @Param('homeId') h: string, @Query() query: ListDocumentsDto) { return this.review.list(req.documentAccountId, h, 'assets', query); }
  @Post('assets') create(@Req() req: DocumentRequest, @Param('homeId') h: string, @Body() body: CreateAssetDto, @Headers('idempotency-key') key?: string) { return this.review.create(req.documentAccountId, h, body, key); }
  @Get('assets/:assetId') asset(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('assetId') id: string) { return this.review.getAsset(req.documentAccountId, h, id); }
  @Get('review') inbox(@Req() req: DocumentRequest, @Param('homeId') h: string, @Query() query: ListDocumentsDto) { return this.review.list(req.documentAccountId, h, 'review', query); }
  @Post('assets/:assetId/confirmations')
  confirm(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('assetId') id: string, @Body() body: ConfirmDto, @Headers('idempotency-key') key?: string) { return this.review.confirm(req.documentAccountId, h, id, body, key); }
  @Post('assets/:assetId/manual-confirmations')
  manual(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('assetId') id: string, @Body() body: ManualDto, @Headers('idempotency-key') key?: string) { return this.review.manual(req.documentAccountId, h, id, body, key); }
  @Get('assets/:assetId/history') history(@Req() req: DocumentRequest, @Param('homeId') h: string, @Param('assetId') id: string, @Query() query: ListDocumentsDto) { return this.review.list(req.documentAccountId, h, 'history', query, id); }
}
