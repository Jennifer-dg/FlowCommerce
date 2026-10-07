import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { LeadsModule } from '../leads/leads.module';
import { CreateQuoteUseCase } from './application/use-cases/create-quote.use-case';
import { GetQuoteUseCase } from './application/use-cases/get-quote.use-case';
import { ListQuotesUseCase } from './application/use-cases/list-quotes.use-case';
import { UpdateQuoteStatusUseCase } from './application/use-cases/update-quote-status.use-case';
import { QUOTES_REPOSITORY } from './domain/repositories/quote.repository';
import { DrizzleQuoteRepository } from './infrastructure/drizzle/drizzle-quote.repository';
import { QuotesController } from './presentation/controllers/quotes.controller';

@Module({
  // LeadsModule se importa para reutilizar su LEADS_REPOSITORY: crear una
  // cotización exige comprobar que el lead pertenece al proyecto, y no tiene
  // sentido duplicar esa consulta ni abrir una segunda conexión a la base.
  imports: [AuthModule, AuthorizationModule, LeadsModule],
  controllers: [QuotesController],
  providers: [
    {
      provide: QUOTES_REPOSITORY,
      useClass: DrizzleQuoteRepository,
    },
    CreateQuoteUseCase,
    ListQuotesUseCase,
    GetQuoteUseCase,
    UpdateQuoteStatusUseCase,
  ],
  exports: [QUOTES_REPOSITORY],
})
export class QuotesModule {}
