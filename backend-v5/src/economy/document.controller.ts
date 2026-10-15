import {Body,Controller,Get,Headers,HttpCode,Param,Post,Query,Req,UseGuards} from '@nestjs/common';
import {DocumentAccessGuard,DocumentRequest} from '../documents/access';
import {EconomicDocumentsService} from './document.service';
@Controller('homes/:homeId/economy') @UseGuards(DocumentAccessGuard)
export class EconomicDocumentsController {
  constructor(private readonly service:EconomicDocumentsService){}
  @Post('document-analysis-jobs') @HttpCode(202) start(@Req()r:DocumentRequest,@Param('homeId')h:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.start(r.documentAccountId,h,b,k);}
  @Get('document-analysis-jobs/:id') job(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.getJob(r.documentAccountId,h,id,q);}
  @Post('document-analysis-jobs/:id/retries') @HttpCode(202) retry(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.retry(r.documentAccountId,h,id,b,k);}
  @Get('drafts') list(@Req()r:DocumentRequest,@Param('homeId')h:string,@Query()q:unknown){return this.service.list(r.documentAccountId,h,q);}
  @Get('drafts/:id') draft(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.getDraft(r.documentAccountId,h,id,q);}
  @Get('drafts/:id/candidates') candidates(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.candidates(r.documentAccountId,h,id,q);}
  @Post('drafts/:id/park') @HttpCode(200) park(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.action(r.documentAccountId,h,id,'park',b,k);}
  @Post('drafts/:id/reopen') @HttpCode(200) reopen(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.action(r.documentAccountId,h,id,'reopen',b,k);}
  @Post('drafts/:id/confirm') @HttpCode(200) confirm(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.confirm(r.documentAccountId,h,id,b,k);}
}
