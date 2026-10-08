import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ClientsModule } from '../clients/clients.module';
import { LeadsModule } from '../leads/leads.module';
import { ProductsModule } from '../products/products.module';
import { ProjectsModule } from '../projects/projects.module';
import { QuoteItemsBuilder } from './application/quote-items.builder';
import { QuoteSettingsReader } from './application/quote-settings.reader';
import { CreateQuoteUseCase } from './application/use-cases/create-quote.use-case';
import { DeleteQuoteUseCase } from './application/use-cases/delete-quote.use-case';
import { GetQuoteUseCase } from './application/use-cases/get-quote.use-case';
import { ListQuotesUseCase } from './application/use-cases/list-quotes.use-case';
import { UpdateQuoteStatusUseCase } from './application/use-cases/update-quote-status.use-case';
import { UpdateQuoteUseCase } from './application/use-cases/update-quote.use-case';
import { QUOTES_REPOSITORY } from './domain/repositories/quote.repository';
import { DrizzleQuoteRepository } from './infrastructure/drizzle/drizzle-quote.repository';
import { QuotesController } from './presentation/controllers/quotes.controller';

@Module({
  // LeadsModule, ClientsModule y ProductsModule se importan para reutilizar sus
  // repositorios: crear o editar una cotización exige comprobar que lead,
  // cliente y productos pertenecen al proyecto.
  imports: [
    AuthModule,
    AuthorizationModule,
    LeadsModule,
    ClientsModule,
    ProductsModule,
    ProjectsModule,
  ],
  controllers: [QuotesController],
  providers: [
    {
      provide: QUOTES_REPOSITORY,
      useClass: DrizzleQuoteRepository,
    },
    QuoteSettingsReader,
    QuoteItemsBuilder,
    CreateQuoteUseCase,
    ListQuotesUseCase,
    GetQuoteUseCase,
    UpdateQuoteUseCase,
    DeleteQuoteUseCase,
    UpdateQuoteStatusUseCase,
  ],
  exports: [QUOTES_REPOSITORY],
})
export class QuotesModule {}
