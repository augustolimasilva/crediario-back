import { IsEnum, IsOptional, IsDateString, IsUUID, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { TipoLancamento, FormaPagamento } from '../../compra/lancamento-financeiro.entity';

export class LancamentoFinanceiroFilterDto {
  @IsOptional()
  @IsEnum(TipoLancamento)
  tipoLancamento?: TipoLancamento;

  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsUUID()
  funcionarioId?: string;

  @IsOptional()
  @IsUUID()
  compraId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  take?: number;
}
