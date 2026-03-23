#!/bin/bash

# ============================================
# Quick Apply Script for Timeout Fixes
# ============================================

echo "🚨 URGENT DATABASE FIX - Statement Timeout Issues"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable not set${NC}"
    echo "Please set it with: export DATABASE_URL='your-database-url'"
    exit 1
fi

echo -e "${YELLOW}⚠️  This script will:${NC}"
echo "  1. Increase database timeout settings"
echo "  2. Create performance indexes"
echo "  3. Update table statistics"
echo "  4. Setup monitoring"
echo ""
read -p "Do you want to continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${GREEN}▶ Connecting to database...${NC}"

# Execute the SQL script
psql "$DATABASE_URL" -f fix_timeout_urgent.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ SUCCESS! Database optimizations applied.${NC}"
    echo ""
    echo "📊 Quick verification:"

    # Run a quick test query
    psql "$DATABASE_URL" -c "
    SELECT
        'Timeout Setting' as check,
        current_setting('statement_timeout') as value
    UNION ALL
    SELECT
        'Users Table Indexes',
        COUNT(*)::text || ' indexes'
    FROM pg_indexes
    WHERE tablename = 'users'
    UNION ALL
    SELECT
        'Users Count',
        COUNT(*)::text || ' records'
    FROM users;"

    echo ""
    echo -e "${GREEN}🎯 Next steps:${NC}"
    echo "  1. Test the application - it should load faster now"
    echo "  2. Monitor for any remaining timeout errors"
    echo "  3. Check slow queries with: SELECT * FROM slow_queries;"

else
    echo ""
    echo -e "${RED}❌ ERROR: Failed to apply database fixes${NC}"
    echo "Please check the error messages above and try again."
    exit 1
fi