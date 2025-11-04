import { IsEnum, IsNumber, IsDateString, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TipoLancamento, FormaPagamento } from '../../compra/lancamento-financeiro.entity';

export class UpdateLancamentoFinanceiroDto {
  @IsOptional()
  @IsEnum(TipoLancamento)
  tipoLancamento?: TipoLancamento;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valor?: number;

  @IsOptional()
  @IsDateString()
  dataLancamento?: string;

  @IsOptional()
  @IsDateString()
  dataVencimento?: string;

  @IsOptional()
  @IsDateString()
  dataPagamento?: string;

  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @IsOptional()
  @IsUUID()
  compraId?: string;

  @IsOptional()
  @IsUUID()
  vendaId?: string;

  @IsOptional()
  @IsUUID()
  funcionarioId?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
