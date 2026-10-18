import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, type DocumentRequest } from '../documents/access';
import { ContactsService } from './contacts.service';
@Controller('homes/:homeId') @UseGuards(DocumentAccessGuard)
export class ContactsController {
 constructor(private readonly service:ContactsService){}
 @Get('contacts') list(@Req()r:DocumentRequest,@Param('homeId')h:string,@Query()q:unknown){return this.service.list(r.documentAccountId,h,q);}
 @Get('contact-suggestion') suggestion(@Req()r:DocumentRequest,@Param('homeId')h:string,@Query()q:unknown){return this.service.suggestion(r.documentAccountId,h,q);}
 @Get('contacts/:id') get(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.get(r.documentAccountId,h,id,q);}
 @Get('contacts/:id/links') links(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.service.links(r.documentAccountId,h,id,q);}
 @Post('contacts') create(@Req()r:DocumentRequest,@Param('homeId')h:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutate(r.documentAccountId,h,'create','',b,k);}
 @Post('contacts/:id/updates') @HttpCode(200) update(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutate(r.documentAccountId,h,'update',id,b,k);}
 @Post('contacts/:id/archive') @HttpCode(200) archive(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutate(r.documentAccountId,h,'archive',id,b,k);}
 @Post('contacts/:id/restore') @HttpCode(200) restore(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutate(r.documentAccountId,h,'restore',id,b,k);}
 @Post('contacts/:id/links') @HttpCode(200) link(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutate(r.documentAccountId,h,'link',id,b,k);}
 @Post('contacts/:id/unlink') @HttpCode(200) unlink(@Req()r:DocumentRequest,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.service.mutate(r.documentAccountId,h,'unlink',id,b,k);}
}
