import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '@flowcommerce/types';
import { AuthenticatedGuard } from '../../../auth/presentation/guards/authenticated.guard';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user.decorator';
import { ProjectPermissionGuard } from '../../../authorization/presentation/guards/project-permission.guard';
import { RequirePermission } from '../../../authorization/presentation/decorators/require-permission.decorator';
import { SendMessageUseCase } from '../../application/use-cases/send-message.use-case';
import { MessageDto } from '../../presentation/dto/message.dto';
import { SendMessageDto } from '../../presentation/dto/send-message.dto';

// Conversación de WhatsApp de un lead concreto. Los guards de clase fijan
// autenticación y control de acceso por proyecto; cada handler exige su permiso
// con @RequirePermission. La ruta encadena projectId y leadId, y el guard
// resuelve el tenant desde params.projectId.
@ApiTags('messages')
@Controller({
  path: 'projects/:projectId/leads/:leadId/messages',
  version: '1',
})
@UseGuards(AuthenticatedGuard, ProjectPermissionGuard)
export class MessagesController {
  constructor(private readonly sendMessageUseCase: SendMessageUseCase) {}

  // Un lead de otro tenant responde 404, igual que uno inexistente, y en ese
  // caso ni siquiera se llega a invocar a WhatsApp.
  @Post()
  @RequirePermission(Permission.WHATSAPP_SEND_MESSAGE)
  @ApiCreatedResponse({ type: MessageDto })
  sendMessage(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageDto> {
    return this.sendMessageUseCase
      .execute({
        actorUserId: userId,
        projectId,
        leadId,
        content: dto.content,
      })
      .then((message) => message.toMessage());
  }
}
