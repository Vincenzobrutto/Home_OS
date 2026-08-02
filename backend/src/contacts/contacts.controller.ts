import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('houses/:houseId/contacts')
  create(
    @Param('houseId', ParseUUIDPipe) houseId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(houseId, dto);
  }

  @Get('houses/:houseId/contacts')
  findAllForHouse(@Param('houseId', ParseUUIDPipe) houseId: string) {
    return this.contactsService.findAllForHouse(houseId);
  }

  @Get('contacts/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch('contacts/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(id, dto);
  }

  @Delete('contacts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactsService.remove(id);
  }
}
