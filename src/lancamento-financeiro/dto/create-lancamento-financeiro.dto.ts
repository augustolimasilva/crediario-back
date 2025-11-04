import { IsEnum, IsNumber, IsDateString, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TipoLancamento, FormaPagamento } from '../../compra/lancamento-financeiro.entity';

export class CreateLancamentoFinanceiroDto {
  @IsEnum(TipoLancamento)
  tipoLancamento: TipoLancamento;

  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsDateString()
  dataLancamento: string;

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
