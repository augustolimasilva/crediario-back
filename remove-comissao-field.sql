-- Script para remover o campo comissao da tabela funcionarios
-- Execute este script no banco de dados PostgreSQL

-- Verificar se a coluna existe antes de removê-la
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'funcionarios' 
        AND column_name = 'comissao'
    ) THEN
        ALTER TABLE funcionarios DROP COLUMN comissao;
        RAISE NOTICE 'Coluna comissao removida da tabela funcionarios';
    ELSE
        RAISE NOTICE 'Coluna comissao não existe na tabela funcionarios';
    END IF;
END $$;
