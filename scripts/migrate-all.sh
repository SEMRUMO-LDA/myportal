#!/bin/bash
# Migrate all users in batches of 20

echo "🚀 Starting full migration..."
echo ""

BATCH_SIZE=20
REMAINING=121

while [ $REMAINING -gt 0 ]; do
    echo "📊 Migrating next batch ($REMAINING remaining)..."
    echo ""

    node scripts/migrate-batch.js $BATCH_SIZE

    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Migration failed! Stopping."
        exit 1
    fi

    # Get new count
    REMAINING=$(node scripts/test-connection.js 2>/dev/null | grep "Found" | awk '{print $2}')

    if [ -z "$REMAINING" ]; then
        echo "✅ Migration complete!"
        break
    fi

    echo ""
    echo "⏸️  Waiting 2 seconds before next batch..."
    sleep 2
done

echo ""
echo "🎉 ALL USERS MIGRATED!"
