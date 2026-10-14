import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from '../documents/access';
import { EconomyService } from './economy.service';
@Controller('homes/:homeId/economy') @UseGuards(DocumentAccessGuard)
export class EconomyController {
  constructor(private readonly service:EconomyService){}
  @Get('capabilities') capabilities(@Req()r:DocumentRequest,@Param('homeId')h:string,@Query()q:unknown){return this.service.capabilities(r.documentAccountId,h,q);}
  @Get('expenses') list(@Req()r:DocumentRequest,@Param('homeId')h:string,@Query()q:unknown){return this.service.list(r.documentAccountId,h,q);}
  @Get('summary') summary(@Req()r:DocumentRequest,@Param('homeId')h:string,@Query()q:unknown){return this.service.summary(r.documentAccountId,h,q);}
  @Get('expenses/:id') get(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.get(r.documentAccountId,h,id,q);}
  @Get('expenses/:id/history') history(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.history(r.documentAccountId,h,id,q);}
  @Post('expenses') create(@Req()r:DocumentRequest,@Param('homeId')h:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.create(r.documentAccountId,h,b,k);}
  @Post('expenses/:id/updates') @HttpCode(200) update(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.update(r.documentAccountId,h,id,b,k);}
  @Post('expenses/:id/archive') @HttpCode(200) archive(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.action(r.documentAccountId,h,id,'archive',b,k);}
  @Post('expenses/:id/restore') @HttpCode(200) restore(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.action(r.documentAccountId,h,id,'restore',b,k);}
  @Get('works') works(@Req()r:DocumentRequest,@Param('homeId')h:string,@Query()q:unknown){return this.service.works(r.documentAccountId,h,q);}
  @Get('works/:id') work(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.getWork(r.documentAccountId,h,id,q);}
  @Get('works/:id/history') workHistory(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.workHistory(r.documentAccountId,h,id,q);}
  @Post('works') createWork(@Req()r:DocumentRequest,@Param('homeId')h:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutateWork(r.documentAccountId,h,'create','',b,k);}
  @Post('works/:id/updates') @HttpCode(200) updateWork(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutateWork(r.documentAccountId,h,'update',id,b,k);}
  @Post('works/:id/archive') @HttpCode(200) archiveWork(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutateWork(r.documentAccountId,h,'archive',id,b,k);}
  @Post('works/:id/restore') @HttpCode(200) restoreWork(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutateWork(r.documentAccountId,h,'restore',id,b,k);}
}
