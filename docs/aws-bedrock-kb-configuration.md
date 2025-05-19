# Quick Start Guide: AWS Bedrock KB Configuration

## 1. Install Required Tools

### macOS
```bash
brew install awscli
brew install uv
```

### Windows
```bash
# AWS CLI
# Download from: https://aws.amazon.com/cli/
winget install uv
```

Verify installation: `aws --version`

## 2. Configure AWS Profile
```bash
aws configure --profile <name>
```

You'll be prompted for:
- AWS Access Key ID
- AWS Secret Access Key
- Region (e.g., us-east-1)
- Output format (json/yaml/text/table)

## 3. Configure Bedrock KB

1. Open configuration interface
2. Enter:
   - Profile name (from step 2)
   - Region (e.g., us-east-1)
   - Tag key: `specif-mcp-rag-kb`
3. Click Validate, then Submit

![AWS Bedrock KB Configuration Interface](../assets/img/mcp/aws-bedrock-kb-config.png)

## Common Issues

- Invalid profile: Verify credentials in `.aws/credentials`
- Connection failed: Check internet and AWS service status
- Region error: Ensure region supports AWS Bedrock
