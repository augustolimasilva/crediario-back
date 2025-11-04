-- Criar tabela de histórico de produtos
CREATE TABLE IF NOT EXISTS produto_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "produtoId" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tipoAlteracao" VARCHAR(20) NOT NULL CHECK ("tipoAlteracao" IN ('CRIADO', 'ATUALIZADO', 'EXCLUIDO', 'ATIVADO', 'DESATIVADO')),
    descricao TEXT,
    "dadosAnteriores" JSONB,
    "dadosNovos" JSONB,
    observacao TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_produto_historico_produto 
        FOREIGN KEY ("produtoId") REFERENCES produtos(id) ON DELETE CASCADE,
    CONSTRAINT fk_produto_historico_usuario 
        FOREIGN KEY ("usuarioId") REFERENCES users(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_produto_historico_produto_id ON produto_historico("produtoId");
CREATE INDEX IF NOT EXISTS idx_produto_historico_usuario_id ON produto_historico("usuarioId");
CREATE INDEX IF NOT EXISTS idx_produto_historico_tipo_alteracao ON produto_historico("tipoAlteracao");
CREATE INDEX IF NOT EXISTS idx_produto_historico_created_at ON produto_historico("createdAt");

-- Comentários na tabela
COMMENT ON TABLE produto_historico IS 'Tabela para armazenar o histórico de alterações dos produtos';
COMMENT ON COLUMN produto_historico."produtoId" IS 'ID do produto que foi alterado';
COMMENT ON COLUMN produto_historico."usuarioId" IS 'ID do usuário que fez a alteração';
COMMENT ON COLUMN produto_historico."tipoAlteracao" IS 'Tipo de alteração: CRIADO, ATUALIZADO, EXCLUIDO, ATIVADO, DESATIVADO';
COMMENT ON COLUMN produto_historico.descricao IS 'Descrição da alteração realizada';
COMMENT ON COLUMN produto_historico."dadosAnteriores" IS 'Dados do produto antes da alteração (JSON)';
COMMENT ON COLUMN produto_historico."dadosNovos" IS 'Dados do produto após a alteração (JSON)';
COMMENT ON COLUMN produto_historico.observacao IS 'Observação adicional sobre a alteração';
