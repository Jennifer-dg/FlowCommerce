import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '@flowcommerce/types';
import { AuthenticatedGuard } from '../../../auth/presentation/guards/authenticated.guard';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user.decorator';
import { ProjectPermissionGuard } from '../../../authorization/presentation/guards/project-permission.guard';
import { RequirePermission } from '../../../authorization/presentation/decorators/require-permission.decorator';
import { buildPaginationMeta } from '../../../common/dto/pagination.dto';
import { CreateQuoteUseCase } from '../../application/use-cases/create-quote.use-case';
import { GetQuoteUseCase } from '../../application/use-cases/get-quote.use-case';
import { ListQuotesUseCase } from '../../application/use-cases/list-quotes.use-case';
import { UpdateQuoteStatusUseCase } from '../../application/use-cases/update-quote-status.use-case';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { ListQuotesQueryDto } from '../dto/list-quotes-query.dto';
import { PaginatedQuotesDto } from '../dto/paginated-quotes.dto';
import { QuoteDto } from '../dto/quote.dto';
import { UpdateQuoteStatusDto } from '../dto/update-quote-status.dto';

// Cotizaciones del tenant. Los guards de clase fijan autenticación y acceso
// por proyecto; cada handler declara su permiso con @RequirePermission.
// El projectId se toma siempre de la ruta, nunca del body ni del query.
@ApiTags('quotes')
@Controller({ path: 'projects/:projectId/quotes', version: '1' })
@UseGuards(AuthenticatedGuard, ProjectPermissionGuard)
export class QuotesController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly listQuotesUseCase: ListQuotesUseCase,
    private readonly getQuoteUseCase: GetQuoteUseCase,
    private readonly updateQuoteStatusUseCase: UpdateQuoteStatusUseCase,
  ) {}

  // El status inicial lo fuerza el use-case a DRAFT y el total se recalcula,
  // así que el body solo lleva leadId, folio, subtotal y tax.
  @Post()
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiCreatedResponse({ type: QuoteDto })
  createQuote(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateQuoteDto,
  ): Promise<QuoteDto> {
    return this.createQuoteUseCase
      .execute({
        actorUserId: userId,
        projectId,
        leadId: dto.leadId,
        folio: dto.folio,
        subtotal: dto.subtotal,
        tax: dto.tax,
      })
      .then((quote) => quote.toQuote());
  }

  @Get()
  @RequirePermission(Permission.QUOTE_READ)
  @ApiOkResponse({ type: PaginatedQuotesDto })
  async listQuotes(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListQuotesQueryDto,
  ): Promise<PaginatedQuotesDto> {
    const result = await this.listQuotesUseCase.execute({
      actorUserId: userId,
      projectId,
      status: query.status,
      leadId: query.leadId,
      page: query.page,
      limit: query.limit,
    });

    return {
      data: result.quotes.map((quote) => quote.toQuote()),
      meta: buildPaginationMeta(query.page, query.limit, result.total),
    };
  }

  // Una cotización de otro tenant responde 404, igual que una inexistente.
  @Get(':quoteId')
  @RequirePermission(Permission.QUOTE_READ)
  @ApiOkResponse({ type: QuoteDto })
  getQuote(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
  ): Promise<QuoteDto> {
    return this.getQuoteUseCase
      .execute({ actorUserId: userId, projectId, quoteId })
      .then((quote) => quote.toQuote());
  }

  // Exige QUOTE_READ en el guard, pero el use-case es quien decide si el estado
  // destino necesita QUOTE_APPROVE: el permiso depende de a dónde se mueve la
  // cotización, no del endpoint.
  @Patch(':quoteId/status')
  @RequirePermission(Permission.QUOTE_READ)
  @ApiOkResponse({ type: QuoteDto })
  updateQuoteStatus(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() dto: UpdateQuoteStatusDto,
  ): Promise<QuoteDto> {
    return this.updateQuoteStatusUseCase
      .execute({
        actorUserId: userId,
        projectId,
        quoteId,
        status: dto.status,
      })
      .then((quote) => quote.toQuote());
  }
}
