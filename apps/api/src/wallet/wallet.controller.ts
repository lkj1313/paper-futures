import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { DepositDto } from './dto/deposit.dto.js';
import {
  LedgerEntryDto,
  LedgerPageDto,
  LedgerQueryDto,
} from './dto/ledger.dto.js';
import { WalletResponseDto } from './dto/wallet-response.dto.js';
import { WalletService } from './wallet.service.js';

@ApiTags('wallet')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '토큰 없음, 위조 (UNAUTHORIZED) 또는 만료 (TOKEN_EXPIRED)',
  type: ErrorResponseDto,
})
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: '내 지갑 잔고와 주문 가능 금액 조회' })
  @ApiOkResponse({ type: WalletResponseDto })
  async getWallet(@CurrentUser() user: AuthUser): Promise<WalletResponseDto> {
    return WalletResponseDto.from(await this.walletService.getSummary(user.id));
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '모의 USDT 충전',
    description: '원장에 충전(DEPOSIT) 한 줄을 남기고 잔고를 늘린다.',
  })
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiBadRequestResponse({
    description: '금액이 잘못됨 (VALIDATION_ERROR, INVALID_DEPOSIT_AMOUNT)',
    type: ErrorResponseDto,
  })
  async deposit(
    @CurrentUser() user: AuthUser,
    @Body() dto: DepositDto,
  ): Promise<WalletResponseDto> {
    return WalletResponseDto.from(
      await this.walletService.deposit(user.id, dto.amount),
    );
  }

  @Get('ledger')
  @ApiOperation({ summary: '원장(잔고 변동 내역) 조회, 최신순' })
  @ApiOkResponse({ type: LedgerPageDto })
  async listLedger(
    @CurrentUser() user: AuthUser,
    @Query() query: LedgerQueryDto,
  ): Promise<LedgerPageDto> {
    const { items, nextCursor } = await this.walletService.listLedger(
      user.id,
      query,
    );
    return {
      items: items.map((entry) => LedgerEntryDto.from(entry)),
      nextCursor,
    };
  }
}
