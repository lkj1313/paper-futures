import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
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
  @ApiOperation({ summary: '내 지갑 잔고 조회' })
  @ApiOkResponse({ type: WalletResponseDto })
  async getWallet(@CurrentUser() user: AuthUser): Promise<WalletResponseDto> {
    const wallet = await this.walletService.getByUserId(user.id);
    return WalletResponseDto.from(wallet);
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
