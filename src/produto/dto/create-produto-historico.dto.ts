import { IsEnum, IsString, IsOptional, IsObject, IsUUID } from 'class-validator';
import { TipoAlteracao } from '../produto-historico.entity';

export class CreateProdutoHistoricoDto {
  @IsUUID()
  produtoId: string;

  @IsUUID()
  usuarioId: string;

  @IsEnum(TipoAlteracao)
  tipoAlteracao: TipoAlteracao;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsObject()
  dadosAnteriores?: Record<string, any>;

  @IsOptional()
  @IsObject()
  dadosNovos?: Record<string, any>;

  @IsOptional()
  @IsString()
  observacao?: string;
}
