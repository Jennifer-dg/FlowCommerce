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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Permission } from '@flowcommerce/types';
import { AuthenticatedGuard } from '../../../auth/presentation/guards/authenticated.guard';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user.decorator';
import { ProjectPermissionGuard } from '../../../authorization/presentation/guards/project-permission.guard';
import { RequirePermission } from '../../../authorization/presentation/decorators/require-permission.decorator';
import { buildPaginationMeta } from '../../../common/dto/pagination.dto';
import { CreateQuoteUseCase } from '../../application/use-cases/create-quote.use-case';
import { DeleteQuoteUseCase } from '../../application/use-cases/delete-quote.use-case';
import { GetQuoteUseCase } from '../../application/use-cases/get-quote.use-case';
import { ListQuotesUseCase } from '../../application/use-cases/list-quotes.use-case';
import { UpdateQuoteStatusUseCase } from '../../application/use-cases/update-quote-status.use-case';
import { UpdateQuoteUseCase } from '../../application/use-cases/update-quote.use-case';
import { CreateQuoteDto } from '../dto/create-quote.dto';
import { ListQuotesQueryDto } from '../dto/list-quotes-query.dto';
import { PaginatedQuotesDto } from '../dto/paginated-quotes.dto';
import { QuoteDetailDto } from '../dto/quote.dto';
import { UpdateQuoteStatusDto } from '../dto/update-quote-status.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';

const toDate = (value: string | null | undefined): Date | null | undefined =>
  value === undefined || value === null ? value : new Date(value);

// Cotizaciones del tenant. Los guards de clase fijan autenticación y acceso
// por proyecto; cada handler declara su permiso con @RequirePermission.
// El projectId se toma siempre de la ruta, nunca del body ni del query.
@ApiTags('quotes')
@Controller({ path: 'projects/:projectId/quotes', version: '1' })
@UseGuards(AuthenticatedGuard, ProjectPermissionGuard)
@ApiUnauthorizedResponse({ description: 'Sin sesión activa' })
@ApiForbiddenResponse({
  description: 'Sin el permiso requerido en el proyecto (o proyecto ajeno)',
})
export class QuotesController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly listQuotesUseCase: ListQuotesUseCase,
    private readonly getQuoteUseCase: GetQuoteUseCase,
    private readonly updateQuoteUseCase: UpdateQuoteUseCase,
    private readonly deleteQuoteUseCase: DeleteQuoteUseCase,
    private readonly updateQuoteStatusUseCase: UpdateQuoteStatusUseCase,
  ) {}

  @Post()
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiOperation({
    summary: 'Crear una cotización en borrador',
    description:
      'El folio es correlativo y los precios salen del catálogo: el body solo lleva producto, cantidad y descuento por partida.',
  })
  @ApiCreatedResponse({ type: QuoteDetailDto })
  @ApiBadRequestResponse({
    description: 'Body inválido o descuento por encima del máximo del producto',
  })
  @ApiNotFoundResponse({
    description: 'Lead, cliente o producto inexistente en este proyecto',
  })
  @ApiConflictResponse({ description: 'Producto inactivo' })
  createQuote(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateQuoteDto,
  ): Promise<QuoteDetailDto> {
    return this.createQuoteUseCase
      .execute({
        actorUserId: userId,
        projectId,
        leadId: dto.leadId,
        clientId: dto.clientId,
        validUntil: toDate(dto.validUntil),
        notes: dto.notes,
        terms: dto.terms,
        items: dto.items,
      })
      .then((quote) => quote.toDetail());
  }

  @Get()
  @RequirePermission(Permission.QUOTE_READ)
  @ApiOperation({
    summary: 'Listar cotizaciones',
    description:
      'Con resumen {id, name} del lead y del cliente. Busca por folio, filtra por estado, cliente, lead y fechas, y ordena por fecha, total o folio.',
  })
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
      clientId: query.clientId,
      leadId: query.leadId,
      search: query.search,
      from: query.createdFrom ? new Date(query.createdFrom) : undefined,
      to: query.createdTo ? new Date(query.createdTo) : undefined,
      sortBy: query.sortBy,
      order: query.order,
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
  @ApiOperation({ summary: 'Ver una cotización con sus partidas' })
  @ApiOkResponse({ type: QuoteDetailDto })
  @ApiNotFoundResponse({ description: 'No existe en este proyecto' })
  getQuote(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
  ): Promise<QuoteDetailDto> {
    return this.getQuoteUseCase
      .execute({ actorUserId: userId, projectId, quoteId })
      .then((quote) => quote.toDetail());
  }

  @Patch(':quoteId')
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiOperation({
    summary: 'Editar un borrador',
    description:
      'Solo en DRAFT. Si se envían `items` reemplazan a todas las partidas y se recalculan los importes.',
  })
  @ApiOkResponse({ type: QuoteDetailDto })
  @ApiNotFoundResponse({ description: 'No existe en este proyecto' })
  @ApiConflictResponse({ description: 'La cotización ya no está en DRAFT' })
  updateQuote(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() dto: UpdateQuoteDto,
  ): Promise<QuoteDetailDto> {
    return this.updateQuoteUseCase
      .execute({
        actorUserId: userId,
        projectId,
        quoteId,
        clientId: dto.clientId,
        validUntil: toDate(dto.validUntil),
        notes: dto.notes,
        terms: dto.terms,
        items: dto.items,
      })
      .then((quote) => quote.toDetail());
  }

  @Delete(':quoteId')
  @RequirePermission(Permission.QUOTE_CREATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar un borrador' })
  @ApiNoContentResponse({ description: 'Cotización borrada' })
  @ApiNotFoundResponse({ description: 'No existe en este proyecto' })
  @ApiConflictResponse({ description: 'La cotización ya no está en DRAFT' })
  async deleteQuote(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
  ): Promise<void> {
    await this.deleteQuoteUseCase.execute({
      actorUserId: userId,
      projectId,
      quoteId,
    });
  }

  // Cualquier cambio de estado es una escritura, así que el guard exige
  // QUOTE_CREATE. El use-case decide además si el estado destino necesita
  // QUOTE_APPROVE (aprobar y pagar): el permiso depende de a dónde se mueve la
  // cotización, no del endpoint.
  @Patch(':quoteId/status')
  @RequirePermission(Permission.QUOTE_CREATE)
  @ApiOperation({
    summary: 'Cambiar el estado de una cotización',
    description:
      'DRAFT → PENDING_APPROVAL → APPROVED → SENT → ACCEPTED → PAID; PENDING_APPROVAL → DRAFT; SENT → REJECTED. La transición es atómica.',
  })
  @ApiOkResponse({ type: QuoteDetailDto })
  @ApiNotFoundResponse({ description: 'No existe en este proyecto' })
  @ApiConflictResponse({
    description: 'Transición inválida o el estado cambió en paralelo',
  })
  updateQuoteStatus(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('quoteId', ParseUUIDPipe) quoteId: string,
    @Body() dto: UpdateQuoteStatusDto,
  ): Promise<QuoteDetailDto> {
    return this.updateQuoteStatusUseCase
      .execute({
        actorUserId: userId,
        projectId,
        quoteId,
        status: dto.status,
      })
      .then((quote) => quote.toDetail());
  }
}
