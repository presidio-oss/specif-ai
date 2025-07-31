# Contributing to Specifai

We're excited you're interested in contributing to Specifai! This document outlines the process for contributing to our project. We welcome contributions from everyone, whether you're fixing a typo, improving documentation, or adding a new feature.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```
   git clone https://github.com/presidio-oss/specif-ai
   cd specif-ai
   ```
3. To set up and run the application locally, follow the guides provided for:
   - Electron: [Electron setup guide](./electron/README.md)
   
## Making Changes

1. Create a new branch for your changes:
   ```
   git checkout -b your-branch-name
   ```
2. Make your changes in the codebase:
   - UI Changes: Make your UI code file changes in the `ui/` and `electron/` folders respectively.
3. Write or update tests as necessary.
4. Format your code.
5. Run linting checks. ( Tip : Run ```npm run lint``` in the root directory )

## Submitting Changes

1. Commit your changes:
   ```
   git commit -m "Your detailed commit message"
   ```
2. Push to your fork:
   ```
   git push origin your-branch-name
   ```
3. Submit a pull request through the GitHub website to <github url>

## Pull Request Guidelines

- Provide a clear title and description of your changes.
- Include any relevant issue numbers in the PR description.
- Ensure all tests pass and there are no linting errors.
- Update documentation if you're changing functionality.

Before submitting a pull request, verify the changes in your local environment.

## Reporting Bugs

Use the GitHub issue tracker at <github url> to report bugs. When filing an issue, please include:

- A clear title and description.
- As much relevant information as possible.
- A code sample or an executable test case demonstrating the expected behavior that is not occurring.

## Feature Requests

Feature requests are welcome. Please provide a clear description of the feature and why it would be beneficial to the project. You can submit feature requests through the GitHub issue tracker.

## Questions?

If you have any questions, feel free to open an issue or reach out to the maintainers through the GitHub repository.

Thank you for contributing to Specifai!
