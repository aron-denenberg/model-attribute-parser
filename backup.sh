#!/bin/bash

# ----------------------------------------------------------------------
# This script performs a PostgreSQL database dump using the `pg_dump` command
# with parameters loaded from a `.env.<NODE_ENV>` file. It supports command-line
# arguments to set variables like `NODE_ENV` and the dump file location. It is designed 
# for environments where `.env` files are common, such as JavaScript/Node.js projects.
#
# Features:
# - The script loads environment variables from a `.env.<NODE_ENV>` file.
# - If the specified `.env.<NODE_ENV>` file is not found, it falls back to the default `.env` file.
# - Supports named command-line arguments for `NODE_ENV` and `DUMP_FILE`.
# - Handles spaces and quotes in the `.env` file format.
# - Ensures the dump file is stored in the directory where the script is executed.
#
# Usage:
# 1. Ensure you have one or more `.env` files in your project directory.
#    These can be `.env`, `.env.production`, `.env.development`, etc.
#    Example `.env` file format:
#       DB_DATABASE='operator_local_undefined_1'
#       DB_HOST=localhost
#       DB_PORT=5432
#       DB_USERNAME='operator'
#       DB_PASSWORD='secret'
#
# 2. Command-line arguments:
#    - `--node-env=<environment>`: Specify which `.env.<NODE_ENV>` file to load (default: development).
#    - `--dump-file=<file_name>`: Specify the name of the dump file to create (default: auto-generated).
#    Example: `./your_script.sh --node-env=production --dump-file=my_dump.sql`
#
# 3. Make the script executable:
#    Run `chmod +x your_script.sh` to make the script executable.
#
# 4. Execute the script:
#    Run `./your_script.sh` with optional parameters as needed.
#
# Requirements:
# - PostgreSQL `pg_dump` must be installed and accessible via the command line.
# - The environment variables must contain values for `DB_DATABASE`, `DB_HOST`, `DB_PORT`, 
#   `DB_USERNAME`, and `DB_PASSWORD` for the script to function correctly.
#
# ----------------------------------------------------------------------

# Default values for variables
NODE_ENV="development"  # Default to development if not provided
DUMP_FILE=""

# Parse command-line arguments
while [ "$1" != "" ]; do
    case $1 in
        --node-env=* )
            NODE_ENV="${1#*=}"
            ;;
        --dump-file=* )
            DUMP_FILE="${1#*=}"
            ;;
        * )
            echo "Invalid argument: $1"
            echo "Usage: $0 [--node-env=<environment>] [--dump-file=<file_name>]"
            exit 1
    esac
    shift
done

# Determine the environment file to load based on NODE_ENV
ENV_FILE=".env.$NODE_ENV"

# If the file does not exist, fall back to the default .env file
if [ ! -f "$ENV_FILE" ]; then
  echo "$ENV_FILE not found! Falling back to default .env file."
  ENV_FILE=".env"
fi

# Load environment variables from the determined .env file with handling for quotes and spaces
if [ -f "$ENV_FILE" ]; then
  # This handles spaces around `=` and removes surrounding quotes
  export $(grep -v '^#' "$ENV_FILE" | sed 's/ *= */=/' | sed 's/^ *//g' | sed 's/ *$//g' | sed 's/^export //g' | sed 's/["'\'']//g' | xargs)
    # export DB_DATABASE="postgres" DB_DIALECT="postgres" DB_HOST="localhost" DB_PORT="9001" DB_USERNAME="db_admin" DB_PASSWORD="LxhesNY5SC9yB1k1p6uywirU"
else
  echo ".env file not found!"
  exit 1
fi

# Ensure all required environment variables are set
if [ -z "$DB_DATABASE" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
  echo "Required environment variables are missing."
  echo "Ensure DB_DATABASE, DB_HOST, DB_PORT, DB_USERNAME, and DB_PASSWORD are set in the .env file."
  exit 1
fi

# Define the dump file name and location
# If the user passes a --dump-file argument, use that as the dump file name
# Otherwise, generate a default name based on the database name and current timestamp
if [ -n "$DUMP_FILE" ]; then
  DUMP_FILE="$(pwd)/$DUMP_FILE"
else
  DUMP_FILE="$(pwd)/dump-${DB_DATABASE}_$(date +'%Y%m%d%H%M').sql"
fi

echo "Dump file will be saved to: $DUMP_FILE"

# Find the path to pg_dump
# Check multiple potential locations for pg_dump
PG_DUMP_PATH=""

find_pg_dump() {
  if [ -x "/usr/pgsql-13/bin/pg_dump" ]; then
      PG_DUMP_PATH="/usr/pgsql-13/bin/pg_dump"
  elif [ -x "/usr/pgsql-12/bin/pg_dump" ]; then
      PG_DUMP_PATH="/usr/pgsql-12/bin/pg_dump"
  elif [ -x "/usr/pgsql-11/bin/pg_dump" ]; then
      PG_DUMP_PATH="/usr/pgsql-11/bin/pg_dump"
  elif [ -x "/usr/pgsql-10/bin/pg_dump" ]; then
      PG_DUMP_PATH="/usr/pgsql-10/bin/pg_dump"
  elif [ -x "/usr/pgsql-9.6/bin/pg_dump" ]; then
      PG_DUMP_PATH="/usr/pgsql-9.6/bin/pg_dump"
  elif [ -x "/opt/homebrew/bin/pg_dump" ]; then
      PG_DUMP_PATH="/opt/homebrew/bin/pg_dump"
  elif [ -x "/opt/homebrew/opt/libpq/bin" ]; then
      PG_DUMP_PATH="/opt/homebrew/opt/libpq/bin/pg_dump"
  elif [ -x "/usr/bin/pg_dump" ]; then
      PG_DUMP_PATH="/usr/bin/pg_dump"
  elif [ -x "/usr/local/bin/pg_dump" ]; then
      PG_DUMP_PATH="/usr/local/bin/pg_dump"
  else
      PG_DUMP_PATH=$(command -v pg_dump)
  fi
}

echo "$PG_DUMP_PATH"
echo "$DUMP_FILE"

# Function to check if pg_dump is available and meets the version requirement
check_pg_dump_version() {
    find_pg_dump
    if [ -n "$PG_DUMP_PATH" ]; then
    CURRENT_VERSION=$(pg_dump --version | awk '{print $3}')
        echo "Found pg_dump version $CURRENT_VERSION"
    else
        echo "pg_dump not found. Installing the desired version..."
        confirm
        install_pg_dump
    fi
}


# Function to prompt the user for confirmation
confirm() {
    while true; do
        read -p "this step will libpq (which allows you to dump a database using pg_dump. Do you want to continue? (y/n): " yn
        case $yn in
            [Yy]* ) 
                echo "Continuing..."
                break
                ;;
            [Nn]* ) 
                echo "Aborting..."
                exit 1
                ;;
            * ) 
                echo "Please answer yes (y) or no (n)."
                ;;
        esac
    done
}

# Function to install or upgrade pg_dump using Homebrew
install_pg_dump() {
    echo "Installing..."

    # Install the desired version of PostgreSQL client (which includes pg_dump)
    brew install libpq

    echo "pg_dump installed."

    find_pg_dump
}

# Call the function to check pg_dump version
check_pg_dump_version

# Check if pg_dump was found
if [ -z "$PG_DUMP_PATH" ]; then
    echo "pg_dump not found. Please ensure it is installed."
    exit 1
fi

# Optional: Export the password for pg_dump to use
export PGPASSWORD="$DB_PASSWORD"

# Run the pg_dump command
$PG_DUMP_PATH --verbose \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USERNAME" \
        --format=c \
        --no-privileges \
        --no-owner \
        --clean \
        --file="$DUMP_FILE" \
        --schema="public" \
        "$DB_DATABASE"

# Unset the password after the dump
unset PGPASSWORD
