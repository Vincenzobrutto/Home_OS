import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Prisma, RoomType } from '@prisma/client';

export class CreateRoomDto {
  @IsEnum(RoomType)
  type: RoomType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  planGeometry?: Prisma.InputJsonValue;
}
