# Contributing to Umbrella

Thank you for your interest in contributing to Umbrella! This document provides guidelines and information to help you contribute effectively to this React Native media application with plugin-based architecture.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Architecture Guidelines](#architecture-guidelines)
- [Plugin Development](#plugin-development)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Review Process](#code-review-process)
- [Issues and Support](#issues-and-support)

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. Please be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 18
- React Native development environment
- Android emulator or physical device (iOS support is not tested)
- Yarn package manager

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/new-umbrella/umbrella.git
   cd umbrella
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Set up Node.js Mobile:**
   ```bash
   cd nodejs-assets/nodejs-project
   npx tsc
   cd ../..
   ```

4. **Install Git hooks:**
   ```bash
   npx lefthook install
   ```

5. **Start the development server:**
   ```bash
   yarn start
   ```

6. **Run on Android:**
   ```bash
   yarn android
   ```

## Development Workflow

### Branching Strategy

- `main`: Production-ready code
- `feature/feature-name`: New features
- `fix/fix-name`: Bug fixes
- `refactor/refactor-name`: Code refactoring

### Git Hooks

This project uses Lefthook for Git hooks that automatically run:

- **Pre-commit:** ESLint, Prettier formatting, TypeScript type checking
- **Commit-msg:** Commit message linting (conventional commits)

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`

Examples:
- `feat(search): add advanced filtering options`
- `fix(video-player): resolve fullscreen rendering issue`
- `refactor(state-management): migrate to Zustand stores`

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Strict type checking enabled
- Avoid `any` type; use proper type definitions
- Interface naming: PascalCase with descriptive names
- Type aliases for complex types

### Code Style

- **Prettier** configuration:
  - Single quotes
  - Trailing commas (ES6)
  - 2 spaces indentation
  - Arrow function parentheses: avoid when possible

- **ESLint** rules:
  - React Native specific rules
  - Prettier integration
  - No semicolons (Prettier handles this)

### File Structure

Follow the CLEAN + MVVM architecture:

```
src/
├── features/           # Feature-based organization
│   ├── feature-name/
│   │   ├── presentation/    # UI components and views
│   │   │   ├── components/
│   │   │   ├── views/
│   │   │   └── viewmodels/
│   │   ├── domain/          # Business logic
│   │   │   ├── entities/
│   │   │   ├── usecases/
│   │   │   └── repositories/
│   │   └── data/            # Data layer
│   │       ├── models/
│   │       ├── services/
│   │       └── repositories/
├── core/               # Shared/core functionality
└── shared/             # Common utilities
```

### React Native Best Practices

- Use functional components with hooks
- Prefer `useCallback` and `useMemo` for performance
- Use Zustand for state management
- Follow Material Design 3 principles with react-native-paper
- Implement proper error boundaries
- Use React Navigation for routing

### Naming Conventions

- **Components:** PascalCase (e.g., `VideoPlayer.tsx`)
- **Files:** PascalCase for components, camelCase for utilities
- **Functions/Methods:** camelCase
- **Constants:** SCREAMING_SNAKE_CASE
- **Interfaces:** PascalCase with 'I' prefix optional, but consistent
- **Types:** PascalCase

## Architecture Guidelines

### CLEAN + MVVM Pattern

1. **Presentation Layer:** UI components, views, viewmodels
2. **Domain Layer:** Business logic, entities, use cases
3. **Data Layer:** Models, services, repositories

### State Management

- Use Zustand for global state
- Keep components stateless when possible
- Use local state (`useState`) for component-specific state
- Implement proper state persistence

### Plugin System

- Plugins run in sandboxed Node.js environment
- Follow the ContentService interface for plugin methods
- Proper error handling and validation
- Secure execution with limited permissions

## Plugin Development

### Plugin Structure

Each plugin consists of:

1. **plugin.js:** Main logic file implementing ContentService methods
2. **manifest.json:** Metadata and configuration

### Required Methods

Plugins must implement methods defined in `ContentService.ts`:

- `search(query, page)`: Search functionality
- `getDetails(id)`: Get detailed information
- `getMedia(url)`: Extract media URLs
- `getEpisodes(id)`: Get episode list (if applicable)

### Testing Plugins

1. Upload plugin files to a remote server
2. Use umbrella:// scheme for installation links
3. Test in development environment
4. Verify sandbox security

## Testing

### Test Structure

- Unit tests in `__tests__/` directory
- Integration tests for services
- Component tests using React Native Testing Library

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in debug mode
yarn test:debug

# Clear test cache
yarn test:clear
```

### Testing Guidelines

- Write tests for new features
- Maintain test coverage
- Use descriptive test names
- Test error scenarios
- Mock external dependencies

## Submitting Changes

### Pull Request Process

1. **Create a branch** from `main`
2. **Make changes** following coding standards
3. **Test thoroughly** on Android
4. **Update documentation** if needed
5. **Commit with conventional format**
6. **Push branch** and create PR

### PR Template

Include:
- Clear description of changes
- Screenshots for UI changes
- Testing instructions
- Related issues

### Checklist

- [ ] Code follows style guidelines
- [ ] ESLint passes
- [ ] TypeScript compilation succeeds
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Android testing completed
- [ ] Commit messages follow convention

## Code Review Process

### Review Criteria

- Code quality and readability
- Architecture compliance
- Performance considerations
- Security implications
- Test coverage
- Documentation

### Review Comments

- Be constructive and specific
- Suggest improvements, don't dictate
- Explain reasoning for suggestions
- Acknowledge good practices

## Issues and Support

### Bug Reports

- Use issue templates
- Include reproduction steps
- Provide device/emulator information
- Attach logs and screenshots

### Feature Requests

- Describe the problem you're solving
- Explain your proposed solution
- Consider alternative approaches

### Support

- Check existing issues first
- Use discussions for questions
- Email: wuxnz.dev@gmail.com
- GitHub: @wuxnz

## Security Considerations

- Plugin code is untrusted; always sandbox
- Validate all inputs
- Follow React Native security best practices
- Report security issues privately

---

Thank you for contributing to Umbrella! Your efforts help make this project better for everyone.