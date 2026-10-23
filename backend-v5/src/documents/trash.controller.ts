import { Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentAccessGuard, DocumentRequest } from './access';
import { TrashService } from './trash.service';
@Controller('homes/:homeId')
@UseGuards(DocumentAccessGuard)
export class TrashController {
  constructor(private readonly trash: TrashService) {}
  @Get('documents/:documentId/trash') preview(@Req() req:DocumentRequest,@Param('homeId') h:string,@Param('documentId',new ParseUUIDPipe()) id:string){return this.trash.preview(req.documentAccountId,h,id);}
  @Post('documents/:documentId/trash') @HttpCode(200) move(@Req() req:DocumentRequest,@Param('homeId') h:string,@Param('documentId',new ParseUUIDPipe()) id:string,@Body() body:unknown,@Headers('idempotency-key') key?:string){return this.trash.trash(req.documentAccountId,h,id,body,key);}
  @Get('trash') list(@Req() req:DocumentRequest,@Param('homeId') h:string,@Query() query:unknown){return this.trash.list(req.documentAccountId,h,query);}
  @Post('trash/documents/:documentId/restore') @HttpCode(200) restore(@Req() req:DocumentRequest,@Param('homeId') h:string,@Param('documentId',new ParseUUIDPipe()) id:string,@Body() body:unknown,@Headers('idempotency-key') key?:string){return this.trash.restore(req.documentAccountId,h,id,body,key);}
  @Post('trash/documents/:documentId/purge') @HttpCode(200) purge(@Req() req:DocumentRequest,@Param('homeId') h:string,@Param('documentId',new ParseUUIDPipe()) id:string,@Body() body:unknown,@Headers('idempotency-key') key?:string){return this.trash.purgeNow(req.documentAccountId,h,id,body,key);}
  @Post('trash/empty') @HttpCode(200) empty(@Req() req:DocumentRequest,@Param('homeId') h:string,@Body() body:unknown,@Headers('idempotency-key') key?:string){return this.trash.empty(req.documentAccountId,h,body,key);}
}
