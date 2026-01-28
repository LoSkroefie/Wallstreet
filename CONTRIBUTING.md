# Contributing to Wallstreet Platform

Thank you for considering contributing to the Wallstreet Platform! This document provides guidelines for contributing to this project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professional communication

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Wallstreet.git
   cd Wallstreet
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Before Making Changes

1. Read `MasterContext.md` for project guidelines
2. Check `BuildPlan.md` for planned features
3. Review `SETUP.md` for development setup
4. Ensure all tests pass: `npm test`

### Making Changes

1. **Follow the coding standards**
   - Run `npm run lint` before committing
   - Use `npm run format` to format code
   - Write meaningful commit messages

2. **Write tests**
   - Add unit tests for new functions
   - Add integration tests for new endpoints
   - Maintain >80% code coverage

3. **Update documentation**
   - Update API docs if adding/changing endpoints
   - Update README if changing functionality
   - Add JSDoc comments to functions

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add password reset functionality
fix(transactions): resolve balance calculation error
docs(api): update Swagger documentation for accounts endpoint
```

## Pull Request Process

1. **Update your branch with main**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run all checks**
   ```bash
   npm run lint
   npm test
   npm run test:integration
   ```

3. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changed and why
   - Include screenshots if UI changes

5. **PR Checklist**
   - [ ] Tests pass locally
   - [ ] Code follows project style guidelines
   - [ ] Documentation updated
   - [ ] No console.log or debug code
   - [ ] No merge conflicts
   - [ ] PR description is clear

## Testing

### Run Tests Locally

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage report
npm test -- --coverage
```

### Writing Tests

- Place unit tests in `tests/unit/`
- Place integration tests in `tests/integration/`
- Use descriptive test names
- Test edge cases and error scenarios

## Code Review

All submissions require review. We use GitHub pull requests for this purpose.

**Review criteria:**
- Code quality and readability
- Test coverage
- Documentation completeness
- Security considerations
- Performance impact

## Reporting Bugs

When reporting bugs, include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: OS, Node version, etc.
6. **Logs**: Relevant error logs or screenshots

## Feature Requests

When requesting features, include:

1. **Use Case**: Why is this needed?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other solutions considered
4. **Additional Context**: Any other relevant info

## Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead, email security concerns to: security@wallstreet.com

## Project Structure

```
/Wallstreet
├── /api                    # API integration services
├── /backend-integration    # Backend connectors
├── /platform-core          # Core utilities
├── /docs                   # Documentation
├── /tests                  # Test suites
├── /configs                # Configuration files
├── /scripts                # Utility scripts
└── /monitoring             # Monitoring setup
```

## Questions?

- Check existing issues and discussions
- Review documentation in `/docs`
- Ask in pull request comments

Thank you for contributing! 🚀
