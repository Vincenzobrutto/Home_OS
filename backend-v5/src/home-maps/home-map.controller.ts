import {Body,Controller,Get,Headers,HttpCode,Param,Post,Query,Req,UseGuards} from '@nestjs/common';
import {DocumentAccessGuard,type DocumentRequest} from '../documents/access';
import {HomeMapService} from './home-map.service';
@Controller('homes/:homeId/digital-plans')
@UseGuards(DocumentAccessGuard)
export class HomeMapController{
 constructor(private readonly service:HomeMapService){}
 @Get() list(@Req() r:DocumentRequest,@Param('homeId') h:string,@Query() q:unknown){return this.service.list(r.documentAccountId,h,q);}
 @Get(':id') get(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Query() q:unknown){return this.service.get(r.documentAccountId,h,id,q);}
 @Post(':id/pins') @HttpCode(200) pin(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.mutate(r.documentAccountId,h,id,b,k,false);}
 @Post(':id/geometry') @HttpCode(200) geometry(@Req() r:DocumentRequest,@Param('homeId') h:string,@Param('id') id:string,@Body() b:unknown,@Headers('idempotency-key') k?:string){return this.service.mutate(r.documentAccountId,h,id,b,k,true);}
}
