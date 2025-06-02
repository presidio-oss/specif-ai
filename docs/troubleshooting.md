# Troubleshooting & FAQs for Specifai

This guide helps you resolve common issues you might encounter while using Specifai, an intelligent platform that turns project ideas into structured requirements and actionable tasks.

## Common Issues

### Installation & Launch Issues

1.  **Specifai Won't Install**
    * **Verify System Requirements:** Ensure your system meets the minimum requirements for running an Electron application (e.g., sufficient RAM, CPU).
    * **Check Disk Space:** Confirm you have enough free disk space for the installation.
    * **Run as Administrator:** Try running the installer with administrator privileges.
    * **Antivirus/Firewall Interference:** Temporarily disable your antivirus or firewall to see if it's blocking the installation (remember to re-enable it afterward).

2.  **Specifai Won't Launch or Behaves Unexpectedly**
    * **Verify Installation Completion:** Ensure the installation process completed without errors.
    * **Restart Your System:** A system restart can sometimes resolve unexpected launch issues.
    * **Clear Electron Store/User Data:**
        * The Electron store saves application settings and user data. Corrupted data here can cause launch failures or strange behavior.
        * **Location:**
            * **Windows:** `%APPDATA%\Specif AI` (or `C:\Users\<Your Username>\AppData\Roaming\Specif AI`)
            * **macOS:** `/Users/Username/Library/Application Support/Specif AI`
        * **Action:** Navigate to the appropriate folder for your operating system and delete the contents of the `Specif AI` folder (or the entire folder if you want a complete reset). **Note:** This will clear all application settings, preferences, and potentially local project data (if stored within this directory). Back up any important files before proceeding.
    * **Reinstall Specifai:** If logs don't provide clues and clearing the store doesn't help, a clean reinstall might be necessary.

### UI-Specific Issues

#### Interface Rendering Problems

- **Window Refresh:** If the UI becomes unresponsive or displays incorrectly, try closing and reopening the application window.
- **Display Scaling:** Check your system's display scaling settings if UI elements appear too large or small.
- **Graphics Issues:** Update your graphics driver if you experience visual glitches or rendering problems.


### Workspace & Configuration Issues

1.  **Workspace Configuration Errors**
    * **Problem:** "Unable to create workspace directory" or issues saving project files.
    * **Solution:**
        * **Ensure Write Permissions:** Verify that Specifai has write permissions to the selected workspace location.
        * **Choose a Different Location:** Try setting your workspace to a different directory, ideally one within your user profile (e.g., "Documents" folder).
        * **Run Application as Administrator (Windows):** If permissions are consistently an issue, try running Specifai with administrator privileges (right-click the shortcut and select "Run as administrator").

2.  **AI Model Configuration Issues**
    * **Problem:** "Unable to connect to AI model" or AI features are not working.
    * **Solution:**
        * **Verify API Credentials:** If Specifai uses external AI models (e.g., OpenAI, AWS Bedrock, Google Gemini) via API keys, ensure your API credentials are correct and haven't expired.
        * **Check Internet Connection:** A stable internet connection is required to communicate with external AI models.
        * **Confirm Model Availability:** Verify that the chosen AI model service is operational (check the provider's status page).
        * **Review Rate Limits:** AI models usually have rate limits. If you're making many requests, you might be temporarily throttled.

### Integration Problems

1.  **Jira Integration**
    * **Verify OAuth Credentials:** Ensure your Jira OAuth credentials are correctly configured in Specifai.
    * **Check Callback URL Configuration:** The callback URL in Jira's application link setup must match what Specifai expects.
    * **Ensure Proper Permissions:** The Jira user account used for integration needs sufficient permissions to create/update issues and projects.
    * **Validate Project Key:** Ensure the Jira project key you're trying to integrate with is correct and accessible.

2.  **AWS Bedrock KB**
    * **Confirm AWS Credentials:** Verify your AWS access key ID and secret access key are correctly configured and have the necessary permissions for Bedrock KB access.
    * **Verify Region Configuration:** Ensure the AWS region configured in Specifai matches your Bedrock Knowledge Base region.
    * **Check Tag Key Setup:** If Specifai uses specific tags to identify Bedrock KBs, ensure they are correctly set up.
    * **Test AWS CLI Access:** As a diagnostic step, try accessing your Bedrock KB using the AWS CLI from your system to rule out credential or network issues.

## Observability - Telemetry Data
    * Specifai collects user usage data to improve the application
    * Disable telemetry in settings if desired

## Performance Optimization

### Slow Response Times

1.  **Document/Requirements Generation**
    * **Optimize Input Size:** While Specifai aims to handle complex ideas, extremely large or unstructured initial inputs might take longer to process.
    * **Check Network Speed:** If using cloud-based AI models, a slow internet connection can impact generation speed.
    * **Monitor System Resources:** Ensure your computer has sufficient RAM and CPU available. Close other resource-intensive applications.

2.  **AI Model Responses**
    * **Select Appropriate Model:** More complex or "intelligent" AI models can be slower. If speed is critical for certain tasks, consider if a less complex model would suffice.
    * **Optimize Prompt Length:** Very long or ambiguous user content (during solution generation, task creation, etc.) might lead to slower AI responses.
    * **Consider Local Models:** If Specifai supports local AI models (e.g., via Ollama), using them can be faster as it eliminates network latency.

## Frequently Asked Questions

### General Usage

1.  **Q: How do I update Specifai?**
    * **A:** Download the latest version from the [official GitHub releases page](https://github.com/presidio-oss/specif-ai/releases). Back up your workspace before installing a new version.

2.  **Q: Can I use multiple AI models?**
    * **A:** Yes, Specifai allows you to configure different AI models in its settings, enabling you to switch between them based on your needs. Each model may have specific strengths.

3.  **Q: How do I backup my requirements/project data?**
    * **A:** Your requirements and project data are stored in your Specifai workspace directory. You should regularly back up this directory. Consider using version control systems (like OneDrive) for your project files, or utilize regular file system backups.

## Getting Additional Help

### Support Channels

1.  **Documentation:**
    * Refer to the official Specifai documentation. Check the GitHub repository's `README.md` and `CONTRIBUTING.md` files.

2.  **Community Support:**
    * **GitHub Issues:** For reporting bugs or specific technical problems, use the [Specifai GitHub Issues](https://github.com/presidio-oss/specif-ai/issues) page.
    * **Discussion Forums:** For general questions, feature requests, or community discussions, check the [Specifai Discussions](https://github.com/presidio-oss/specif-ai/discussions) section on GitHub.

### Contact Information

For additional support, you can reach out via:
* **Email:** hai-feedback@presidio.com
* **GitHub Issues:** [Specifai Issues](https://github.com/presidio-oss/specif-ai/issues)
* **Feature Requests:** [Discussions](https://github.com/presidio-oss/specif-ai/discussions)

## Updates and Maintenance

Stay informed about:
* New releases
* Security updates
* Feature additions
* Bug fixes

Check the [Specifai GitHub repository](https://github.com/presidio-oss/specif-ai) regularly for the latest updates and announcements.
