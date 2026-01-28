# Contributing to Wallstreet Platform

Thank you for your interest in contributing! This guide will help you get started.

## Quick Links

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior

- ✅ Be respectful and inclusive
- ✅ Provide constructive feedback
- ✅ Focus on what is best for the community
- ✅ Show empathy towards others

### Unacceptable Behavior

- ❌ Harassment or discrimination
- ❌ Trolling or insulting comments
- ❌ Publishing others' private information
- ❌ Any unprofessional conduct

---

## Getting Started

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/Wallstreet.git
cd Wallstreet
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/Wallstreet.git
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Setup Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 6. Start Services

```bash
docker compose up -d postgres redis
npm run dev
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch Naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 2. Make Changes

Follow our [Coding Standards](#coding-standards).

### 3. Test Your Changes

```bash
npm run lint
npm test
npm run test:integration
```

### 4. Commit Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add user profile avatar upload"
git commit -m "fix: resolve transaction processing race condition"
git commit -m "docs: update API authentication guide"
```

**Commit Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Test changes
- `chore` - Build/tool changes

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

Go to GitHub and create a PR from your branch to `main`.

---

## Coding Standards

### JavaScript/Node.js

**Use ES6+ Features:**
```javascript
// ✅ Good
const getUserById = async (id) => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

// ❌ Bad
function getUserById(id, callback) {
  query('SELECT * FROM users WHERE id = $1', [id], function(err, result) {
    callback(err, result.rows[0]);
  });
}
```

**Async/Await over Callbacks:**
```javascript
// ✅ Good
try {
  const user = await getUserById(id);
  const accounts = await getAccountsByUser(user.id);
} catch (error) {
  logger.error('Error:', error);
}

// ❌ Bad
getUserById(id, (err, user) => {
  if (err) return callback(err);
  getAccountsByUser(user.id, (err, accounts) => {
    // Callback hell
  });
});
```

**Destructuring:**
```javascript
// ✅ Good
const { email, firstName, lastName } = req.body;

// ❌ Bad
const email = req.body.email;
const firstName = req.body.firstName;
const lastName = req.body.lastName;
```

### Code Style

**Indentation:** 2 spaces  
**Quotes:** Single quotes  
**Semicolons:** Yes  
**Line Length:** Max 100 characters

**Run linter:**
```bash
npm run lint
npm run lint:fix  # Auto-fix
```

**Run formatter:**
```bash
npm run format
```

### File Organization

```
api/
├── services/          # Business logic
│   ├── authService.js
│   └── accountService.js
├── middleware/        # Express middleware
│   ├── auth.js
│   └── validator.js
└── gateway/          # HTTP layer
    ├── routes/
    └── server.js
```

### Naming Conventions

**Variables & Functions:** camelCase
```javascript
const userId = '123';
const getUserAccounts = () => {};
```

**Classes:** PascalCase
```javascript
class TransactionProcessor {}
```

**Constants:** UPPER_SNAKE_CASE
```javascript
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
```

**Files:** camelCase
```javascript
authService.js
transactionProcessor.js
```

### Error Handling

**Always use try/catch:**
```javascript
router.get('/accounts/:id', async (req, res) => {
  try {
    const account = await accountService.getById(req.params.id);
    return successResponse(res, account);
  } catch (error) {
    logger.error('Get account error:', error);
    return errorResponse(res, error.message, 500);
  }
});
```

**Throw meaningful errors:**
```javascript
if (!account) {
  throw new Error('Account not found');
}

if (balance < amount) {
  throw new Error('Insufficient funds');
}
```

### Logging

**Use the logger:**
```javascript
const logger = require('../config/logger');

logger.info('User logged in:', { userId, email });
logger.warn('Rate limit exceeded:', { userId, endpoint });
logger.error('Database error:', error);
```

**Don't use console.log:**
```javascript
// ❌ Bad
console.log('User logged in');

// ✅ Good
logger.info('User logged in:', { userId });
```

---

## Testing Requirements

### Minimum Coverage

**80% code coverage required**

Check coverage:
```bash
npm test -- --coverage
```

### Unit Tests

Test individual functions in isolation.

**Location:** `tests/unit/`

**Example:**
```javascript
// tests/unit/authService.test.js
describe('Auth Service', () => {
  describe('register', () => {
    it('should successfully register a new user', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });
    
    it('should throw error for duplicate email', async () => {
      await expect(
        authService.register({ email: 'existing@example.com', ... })
      ).rejects.toThrow('Email already registered');
    });
  });
});
```

### Integration Tests

Test API endpoints end-to-end.

**Location:** `tests/integration/`

**Example:**
```javascript
// tests/integration/auth.test.js
describe('Authentication API', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
  });
});
```

### Load Tests

Test performance under load.

**Location:** `tests/load/`

Run with Artillery:
```bash
npm run test:load
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Coverage >= 80%
- [ ] Documentation updated
- [ ] No console.log or debug code
- [ ] Commit messages follow convention

### PR Checklist

**Title Format:**
```
feat: add two-factor authentication
fix: resolve transaction race condition
docs: update deployment guide
```

**Description Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

## Related Issues
Fixes #123
Closes #456
```

### Review Process

1. **Automated Checks** - CI must pass
2. **Code Review** - At least 1 approval required
3. **Testing** - Reviewer tests locally
4. **Approval** - PR is approved
5. **Merge** - Squash and merge to main

### After Merge

- Delete your feature branch
- Pull latest main
- Start new feature branch

---

## Documentation

### Update Documentation

If you change:
- **API endpoints** → Update [API Documentation](API-Documentation)
- **Database schema** → Update [Database Schema](Database-Schema)
- **Configuration** → Update [Configuration](Configuration)
- **Setup process** → Update [Installation](Installation)

### Writing Style

- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Test all commands/instructions

---

## Project Specific Guidelines

### Database Migrations

Always create migration + rollback:

```sql
-- migrations/002_add_2fa.sql
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN;

-- migrations/002_add_2fa_rollback.sql
ALTER TABLE users DROP COLUMN two_factor_enabled;
```

### API Endpoints

Follow REST conventions:

```
GET    /api/v1/resource      - List all
POST   /api/v1/resource      - Create
GET    /api/v1/resource/:id  - Get one
PUT    /api/v1/resource/:id  - Update
DELETE /api/v1/resource/:id  - Delete
```

### Security

- Never commit secrets
- Always use parameterized queries
- Validate all user input
- Log security-relevant events

---

## Getting Help

### Resources

- [Installation Guide](Installation)
- [API Documentation](API-Documentation)
- [Database Schema](Database-Schema)
- [Quick Start Tutorial](Quick-Start)

### Support Channels

- 💬 [GitHub Discussions](https://github.com/YOUR_USERNAME/Wallstreet/discussions)
- 🐛 [Report a Bug](https://github.com/YOUR_USERNAME/Wallstreet/issues/new?template=bug_report.md)
- ✨ [Request a Feature](https://github.com/YOUR_USERNAME/Wallstreet/issues/new?template=feature_request.md)

### Code Review Tips

**For Contributors:**
- Respond to feedback promptly
- Be open to suggestions
- Keep PRs focused and small
- Update PR based on feedback

**For Reviewers:**
- Be constructive and kind
- Explain reasoning
- Suggest improvements
- Approve when ready

---

## Recognition

All contributors are recognized in:
- GitHub contributors page
- Release notes
- Project README

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Wallstreet Platform!** 🎉

Your contributions help make this project better for everyone.
