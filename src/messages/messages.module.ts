import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { LeadsModule } from '../leads/leads.module';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { MESSAGES_REPOSITORY } from './domain/ports/messages.repository';
import { WHATSAPP_GATEWAY } from './domain/ports/whatsapp.gateway';
import { DrizzleMessagesRepository } from './infrastructure/drizzle/drizzle-messages.repository';
import { StubWhatsAppGateway } from './infrastructure/whatsapp/stub-whatsapp.gateway';
import { MessagesController } from './presentation/controllers/messages.controller';

@Module({
  // LeadsModule se importa para reutilizar su LEADS_REPOSITORY: enviar un
  // mensaje exige comprobar que el lead pertenece al proyecto y resolver su
  // teléfono, y no tiene sentido duplicar esa consulta.
  //
  // WHATSAPP_GATEWAY está enlazado hoy con StubWhatsAppGateway. Sustituirlo por
  // un cliente real de la Graph API es cambiar esta clase de `useClass`; no se
  // toca ni el use-case ni el controller ni los tests.
  imports: [AuthModule, AuthorizationModule, LeadsModule],
  controllers: [MessagesController],
  providers: [
    {
      provide: MESSAGES_REPOSITORY,
      useClass: DrizzleMessagesRepository,
    },
    {
      provide: WHATSAPP_GATEWAY,
      useClass: StubWhatsAppGateway,
    },
    SendMessageUseCase,
  ],
  exports: [MESSAGES_REPOSITORY],
})
export class MessagesModule {}
