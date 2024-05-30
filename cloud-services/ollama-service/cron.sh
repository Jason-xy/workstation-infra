#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 12 hours
CRON_JOB="0 */12 * * * cd $SCRIPT_DIR && docker-compose restart"
CRON_FILE="$SCRIPT_DIR/cron"

# Get current cron jobs
crontab -l > $CRON_FILE

# Add new cron job if not exists
if ! grep -qF "$CRON_JOB" $CRON_FILE; then
    echo "$CRON_JOB" >> $CRON_FILE
fi

# Install new cron jobs
crontab $CRON_FILE
rm $CRON_FILE

echo "Cron job added: $CRON_JOB"