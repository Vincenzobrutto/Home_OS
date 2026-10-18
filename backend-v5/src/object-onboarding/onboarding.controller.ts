import { Body, Controller, Get, Headers, HttpCode, Optional, Param, Post, Query, Req, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from '../documents/access';
import { ObjectOnboardingService } from './onboarding.service';
import { OnboardingJobService } from './jobs.service';
import { onboardingCandidates, onboardingExpenseCandidates } from './candidates';
import { AutomaticIntakeService } from './automatic.service';
@Controller('homes/:homeId/object-onboarding')
@UseGuards(DocumentAccessGuard)
export class ObjectOnboardingController {
 constructor(private readonly service:ObjectOnboardingService,private readonly jobs:OnboardingJobService,@Optional() private readonly automatic?:AutomaticIntakeService){}
 @Post('automatic-runs') @HttpCode(202) autoStart(@Req() r:DocumentRequest,@Param('homeId') h:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){if(!this.automatic)throw new ServiceUnavailableException();return this.automatic.start(r.documentAccountId,h,b,k);}
 @Get('automatic-runs/batches/:batchId') autoStatus(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('batchId') id:string,@Query() q:unknown){if(!this.automatic)throw new ServiceUnavailableException();return this.automatic.latest(r.documentAccountId,h,id,q);}
 @Get('objects/:objectId/comparisons') comparisons(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('objectId') id:string,@Query() q:unknown){return this.service.comparisonsFor(r.documentAccountId,h,id,q);}
 @Post('comparisons/:id/keep') @HttpCode(200) keep(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.keepComparison(r.documentAccountId,h,id,b,k);}
 @Get('capabilities') capabilities(@Req() r:DocumentRequest,@Param('homeId') h:string,@Query() q:unknown){return this.jobs.capabilities(r.documentAccountId,h,q);}
 @Post('jobs') @HttpCode(202) start(@Req() r:DocumentRequest,@Param('homeId') h:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.jobs.start(r.documentAccountId,h,b,k);}
 @Get('jobs/:id') job(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Query() q:unknown){return this.jobs.get(r.documentAccountId,h,id,q);}
 @Get('job-requests/:key') jobReceipt(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('key') key:string,@Query() q:unknown){return this.jobs.recover(r.documentAccountId,h,key,q);}
 @Post('manual-drafts') manual(@Req() r:DocumentRequest,@Param('homeId') h:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.manualDraft(r.documentAccountId,h,b,k);}
 @Get('drafts/:id') draft(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Query() q:unknown){return this.service.getDraft(r.documentAccountId,h,id,q);}
 @Get('drafts/:id/candidates') candidates(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Query() q:unknown){return onboardingCandidates(this.service.access,r.documentAccountId,h,id,q);}
 @Get('drafts/:id/expense-candidates') expenses(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Query() q:unknown){return onboardingExpenseCandidates(this.service.access,r.documentAccountId,h,id,q);}
 @Post('drafts/:id/items') append(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.addItem(r.documentAccountId,h,id,b,k);}
 @Post('drafts/:id/items/:itemId/enrichment') @HttpCode(200) enrich(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Param('itemId') itemId:string,@Body() b:unknown){return this.service.enrich(r.documentAccountId,h,id,itemId,b);}
 @Post('drafts/:id/document-kind') @HttpCode(200) kind(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.changeManualKind(r.documentAccountId,h,id,b,k);}
 @Post('drafts/:id/review') review(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.saveReview(r.documentAccountId,h,id,b,k);}
 @Post('drafts/:id/confirmations') @HttpCode(200) confirm(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.confirm(r.documentAccountId,h,id,b,k);}
 @Get('drafts/:id/confirmations/:key') receipt(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Param('key') k:string,@Query() q:unknown){return this.service.recover(r.documentAccountId,h,id,k,q);}
}
