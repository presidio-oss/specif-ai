# 🚀 Specifai Backend Server

The backend service that powers Specifai's intelligent document generation and processing capabilities.

## Table of Contents
- [Setup Options](#setup-options)
- [Standalone Setup](#standalone-setup)
- [Docker Setup](#docker-setup)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## 🛠 Setup Options

You can set up the backend in two ways:
- [Standalone Setup](#standalone-setup).
- [Docker Setup](#docker-setup).

## ⚡ Standalone Setup

### Prerequisites
- Python >= 3.11
- pip package manager
- Virtual environment tool

### Step-by-Step Guide

#### 1️⃣ Create Virtual Environment

```bash
# MacOS/Linux
python3 -m venv .venv 

# Windows
py -m venv .venv
```

#### 2️⃣ Activate Virtual Environment

```bash
# MacOS/Linux
source .venv/bin/activate

# Windows
.\.venv\Scripts\activate
```

> 💡 **Tip**: Verify activation by checking Python interpreter location:
> ```bash
> # MacOS/Linux
> which python
> 
> # Windows
> where python
> ```

#### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4️⃣ Setup Environment
Ensure that an `env.sh` file is present in the root of the backend directory. Update the `env.sh` file with the appropriate values, then source it using the following command:

```bash
source env.sh
```

Available environment variables:
```
APP_PASSCODE_KEY="7654321"           # Electron app passcode (For local development only)
HOST="0.0.0.0"                       # Backend server host
PORT=5001                            # Backend server port
DEBUG=false                          # Log level
ENABLE_SENTRY=false                  # Enable sentry monitoring
SENTRY_DSN=                          # Sentry DNS
SENTRY_ENVIRONMENT=                  # Sentry environment
SENTRY_RELEASE=                      # Sentry release name

# Default LLM provider and model
DEFAULT_API_PROVIDER="openai"        # Default API provider
DEFAULT_MODEL="gpt-4o"               # Default model

# OpenAI
AZURE_OPENAI_API_KEY=""              # Azure OpenAI API key
OPENAI_API_VERSION=""                # OpenAI API version
OPENAI_API_KEY=""                    # OpenAI API key
OPENAI_BASE_URL=""                   # OpenAI Base URL

# Anthropic
ANTHROPIC_BASE_URL=""                # Anthropic base URL
ANTHROPIC_API_KEY=""                 # Anthropic API Key

# AWS Bedrock
ANTHROPIC_BEDROCK_BASE_URL=""        # AWS Bedrock base URL
AWS_BEDROCK_ACCESS_KEY=""            # AWS access key
AWS_BEDROCK_SECRET_KEY=""            # AWS secret access key
AWS_BEDROCK_SESSION_TOKEN=""         # AWS session token
AWS_REGION=""                        # AWS Region
```

#### 5️⃣ Launch Application

```bash
python init.py
```

## 🐳 Docker Setup

For containerized deployment, use Docker:

```bash
# Update the env.sh file with the appropriate values, then source it using the following command
source env.sh

# Build the image
docker build . --tag hai-build-requirement-backend

# Run the container
docker run -p 5001:5001 \
-e APP_PASSCODE_KEY=$APP_PASSCODE_KEY \
-e DEFAULT_API_PROVIDER=$DEFAULT_API_PROVIDER \
-e DEFAULT_MODEL=$DEFAULT_MODEL \
-e AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY \
-e OPENAI_API_VERSION=$OPENAI_API_VERSION \
-e OPENAI_API_KEY=$OPENAI_API_KEY \
-e OPENAI_BASE_URL=$OPENAI_BASE_URL \
-e ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL \
-e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
-e ANTHROPIC_BEDROCK_BASE_URL=$ANTHROPIC_BEDROCK_BASE_URL \
-e AWS_BEDROCK_ACCESS_KEY=$AWS_BEDROCK_ACCESS_KEY \
-e AWS_BEDROCK_SECRET_KEY=$AWS_BEDROCK_SECRET_KEY \
-e AWS_BEDROCK_SESSION_TOKEN=$AWS_BEDROCK_SESSION_TOKEN \
-e AWS_REGION=$AWS_REGION \
-e HOST=$HOST \
-e PORT=$PORT \
-e DEBUG=$DEBUG \
-e ENABLE_SENTRY=$ENABLE_SENTRY \
-e SENTRY_DSN=$SENTRY_DSN \
-e SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT \
-e SENTRY_RELEASE=$SENTRY_RELEASE \
-it hai-build-requirement-backend
```

## 🤝 Contributing

Please read our [Contributing Guidelines](../CONTRIBUTING.md) for details on submitting patches and the contribution workflow.

## 🛠️ Troubleshooting

- **Issue**: Backend server not starting.
  - **Solution**: Ensure the virtual environment is activated and all dependencies are installed.

- **Issue**: Docker container fails to run.
  - **Solution**: Verify that the Docker daemon is running and the `env.sh` file is correctly configured.
