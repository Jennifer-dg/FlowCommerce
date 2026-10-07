import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { LeadsModule } from '../leads/leads.module';
import { HandleWhatsAppWebhookUseCase } from './application/use-cases/handle-whatsapp-webhook.use-case';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { MESSAGES_REPOSITORY } from './domain/ports/messages.repository';
import { WHATSAPP_GATEWAY } from './domain/ports/whatsapp.gateway';
import { DrizzleMessagesRepository } from './infrastructure/drizzle/drizzle-messages.repository';
import { CloudWhatsAppGateway } from './infrastructure/whatsapp/cloud-whatsapp.gateway';
import { MessagesController } from './presentation/controllers/messages.controller';
import { WhatsAppWebhookController } from './presentation/controllers/whatsapp-webhook.controller';

@Module({
  // LeadsModule se importa para reutilizar su LEADS_REPOSITORY: enviar un
  // mensaje exige comprobar que el lead pertenece al proyecto y resolver su
  // teléfono, y el webhook casa el `from` con un lead del tenant.
  imports: [AuthModule, AuthorizationModule, LeadsModule],
  controllers: [MessagesController, WhatsAppWebhookController],
  providers: [
    {
      provide: MESSAGES_REPOSITORY,
      useClass: DrizzleMessagesRepository,
    },
    {
      provide: WHATSAPP_GATEWAY,
      useClass: CloudWhatsAppGateway,
    },
    SendMessageUseCase,
    HandleWhatsAppWebhookUseCase,
  ],
  exports: [MESSAGES_REPOSITORY],
})
export class MessagesModule {}
