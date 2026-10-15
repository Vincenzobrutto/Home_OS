import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request,Response } from 'express';
import { SessionsService } from '../security';
import { SharingService } from './sharing.service';
@Controller('homes/:homeId')
export class SharingHomeController {
  constructor(private readonly shares:SharingService,private readonly sessions:SessionsService){}
  @Get('sharing-capabilities') async capabilities(@Req()r:Request,@Param('homeId')h:string,@Query()q:unknown){return this.shares.capabilities((await this.sessions.require(r)).accountId,h,q);}
  @Get('sharing-recipients') async recipients(@Req()r:Request,@Param('homeId')h:string,@Query()q:unknown){return this.shares.recipients((await this.sessions.require(r)).accountId,h,q);}
  @Get('sharing-documents') async documents(@Req()r:Request,@Param('homeId')h:string,@Query()q:unknown){return this.shares.documents((await this.sessions.require(r)).accountId,h,q);}
  @Post('share-previews') async preview(@Req()r:Request,@Param('homeId')h:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.shares.preview((await this.sessions.require(r,true)).accountId,h,b,k);}
  @Post('shares') async create(@Req()r:Request,@Param('homeId')h:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.shares.create((await this.sessions.require(r,true)).accountId,h,b,k);}
  @Get('shares') async list(@Req()r:Request,@Param('homeId')h:string,@Query()q:unknown){return this.shares.list((await this.sessions.require(r)).accountId,q,h);}
  @Get('shares/:id') async detail(@Req()r:Request,@Param('homeId')h:string,@Param('id')id:string,@Query()q:unknown){return this.shares.get((await this.sessions.require(r)).accountId,id,q,h);}
  @Post('shares/:id/revoke') @HttpCode(200) async revoke(@Req()r:Request,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.shares.ownerAction((await this.sessions.require(r,true)).accountId,h,id,'revoke',b,k);}
  @Post('shares/:id/rotate-code') @HttpCode(200) async rotate(@Req()r:Request,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.shares.ownerAction((await this.sessions.require(r,true)).accountId,h,id,'rotate-code',b,k);}
  @Post('shares/:id/confirm-pairing') @HttpCode(200) async confirm(@Req()r:Request,@Param('homeId')h:string,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.shares.ownerAction((await this.sessions.require(r,true)).accountId,h,id,'confirm-pairing',b,k);}
}
@Controller('received-shares')
export class ReceivedSharesController {
  constructor(private readonly shares:SharingService,private readonly sessions:SessionsService){}
  @Get() async list(@Req()r:Request,@Query()q:unknown){return this.shares.list((await this.sessions.require(r)).accountId,q);}
  @Get(':id') async detail(@Req()r:Request,@Param('id')id:string,@Query()q:unknown){return this.shares.get((await this.sessions.require(r)).accountId,id,q);}
  @Post(':id/accept') @HttpCode(200) async accept(@Req()r:Request,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.shares.recipientAction((await this.sessions.require(r,true)).accountId,id,'accept',b,k);}
  @Post(':id/decline') @HttpCode(200) async decline(@Req()r:Request,@Param('id')id:string,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.shares.recipientAction((await this.sessions.require(r,true)).accountId,id,'decline',b,k);}
  @Get(':id/documents/:documentId/file') async file(@Req()r:Request,@Param('id')id:string,@Param('documentId')doc:string,@Query()q:unknown,@Res()res:Response){
    const file=await this.shares.file((await this.sessions.require(r)).accountId,id,doc,q);await this.sessions.require(r);
    res.setHeader('Content-Type',file.mimeType);res.setHeader('Content-Disposition',`attachment; filename="documento"; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/'/g,'%27')}`);res.send(file.bytes);
  }
}
@Controller('sharing/code-claims')
export class ShareClaimsController {
  constructor(private readonly shares:SharingService,private readonly sessions:SessionsService){}
  @Post() async claim(@Req()r:Request,@Body()b:unknown,@Headers('idempotency-key')k?:string){return this.shares.claim((await this.sessions.require(r,true)).accountId,b,k,r.socket.remoteAddress??'unknown');}
}
