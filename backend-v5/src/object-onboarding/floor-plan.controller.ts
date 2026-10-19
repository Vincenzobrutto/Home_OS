import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, type DocumentRequest } from '../documents/access';
import { FloorPlanService } from './floor-plan.service';
@Controller('homes/:homeId/floor-plan-layouts')
@UseGuards(DocumentAccessGuard)
export class FloorPlanController {
 constructor(private readonly service:FloorPlanService){}
 @Get(':documentId') get(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('documentId') d:string,@Query() q:unknown){return this.service.get(r.documentAccountId,h,d,q);}
 @Post(':documentId/analysis') @HttpCode(202) analyze(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('documentId') d:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.analyze(r.documentAccountId,h,d,b,k);}
 @Post(':documentId/draft') @HttpCode(200) save(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('documentId') d:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.mutate(r.documentAccountId,h,d,b,k,false);}
 @Post(':documentId/confirmations') @HttpCode(200) confirm(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('documentId') d:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.mutate(r.documentAccountId,h,d,b,k,true);}
}
