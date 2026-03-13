#!/bin/bash
# ==============================================================================
# CRM Premium - Script de Instalação Automática
# ==============================================================================

echo "========================================================="
echo "🚀 Bem-vindo à instalação do CRM Premium"
echo "========================================================="

# Perguntar o domínio
read -p "🌐 Qual será o domínio do sistema? (ex: crm.seudominio.com.br ou IP da VPS): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "❌ O domínio não pode ficar vazio. Cancelando instalação."
    exit 1
fi

# Perguntar sobre o Banco de Dados
echo ""
read -p "🐘 Você já possui um servidor PostgreSQL externo que deseja usar? (s/N): " USE_EXTERNAL_DB
USE_EXTERNAL_DB=${USE_EXTERNAL_DB,,} # To lowercase

if [[ "$USE_EXTERNAL_DB" == "s" || "$USE_EXTERNAL_DB" == "sim" || "$USE_EXTERNAL_DB" == "y" || "$USE_EXTERNAL_DB" == "yes" ]]; then
    read -p "🔗 Digite a URL de conexão do seu PostgreSQL (ex: postgresql://user:pass@ip:5432/crm?schema=public): " EXTERNAL_DB_URL
    if [ -z "$EXTERNAL_DB_URL" ]; then
        echo "❌ URL inválida. Cancelando instalação."
        exit 1
    fi
    DATABASE_URL=$EXTERNAL_DB_URL
    DB_MODE="external"
    echo "✅ Usando banco de dados externo!"
else
    # Gerar senhas aleatórias seguras se não existirem
    DB_PASSWORD=$(LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 24)
    DATABASE_URL="postgresql://crm_user:${DB_PASSWORD}@postgres:5432/crm?schema=public"
    DB_MODE="internal"
    echo "✅ Usando banco de dados local via Docker!"
fi

JWT_SECRET=$(LC_ALL=C tr -dc 'a-zA-Z0-9_+-' < /dev/urandom | head -c 64)

echo ""
echo "⚙️ Configurando variáveis de ambiente (.env)..."

# Criar arquivo .env
cat <<EOF > .env
# Configurações do Banco de Dados
POSTGRES_DB=crm
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=${DB_PASSWORD:-crm_external}

# Configurações do Backend
PORT=3001
NODE_ENV=production
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}

# Configurações do Frontend
VITE_API_URL=http://${DOMAIN}
EOF

# Ajustar o docker-compose.yml caso use banco externo
if [ "$DB_MODE" = "external" ]; then
    echo "🔧 Ajustando docker-compose.yml para ignorar o banco nativo..."
    # Cria uma cópia backup e depois remove a dependência do postgres usando um utilitário simples
    cp docker-compose.yml docker-compose.yml.bak
    # Remove as linhas de depends_on do backend para evitar falhas se o postgres local não subir
    sed -i.bak '/depends_on:/,/condition: service_healthy/d' docker-compose.yml || sed -i '/depends_on:/,/condition: service_healthy/d' docker-compose.yml
fi

echo "✅ Arquivo .env criado com senhas geradas automaticamente!"

echo ""
echo "🐳 Iniciando subida dos containers com Docker Compose..."
echo "Isso pode demorar alguns minutos dependendo da sua internet e processamento."

if [ "$DB_MODE" = "external" ]; then
    docker-compose up -d --build backend frontend
else
    docker-compose up -d --build
fi

echo "========================================================="
echo "🎉 INSTALAÇÃO CONCLUÍDA!"
echo "========================================================="
echo "Abra no seu navegador: http://${DOMAIN}"
echo ""
echo "🔐 Seu usuário padrão: admin@crm.com"
echo "🔑 Sua senha padrão: admin123"
echo "⚠️ Recomendamos trocar a senha padrão assim que logar."
echo "========================================================="
