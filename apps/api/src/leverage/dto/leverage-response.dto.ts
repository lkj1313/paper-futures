import { ApiProperty } from '@nestjs/swagger';
import {
  type LeverageSettings,
  type MarketSymbol,
  SYMBOLS,
  type UpdateLeverageResponse,
} from '@paper-futures/shared';

export class LeverageSettingsDto implements LeverageSettings {
  @ApiProperty({ example: 20 })
  BTCUSDT: number;

  @ApiProperty({ example: 10 })
  ETHUSDT: number;
}

export class LeverageSettingDto implements UpdateLeverageResponse {
  @ApiProperty({ enum: SYMBOLS, example: 'BTCUSDT' })
  symbol: MarketSymbol;

  @ApiProperty({ example: 20 })
  leverage: number;
}
