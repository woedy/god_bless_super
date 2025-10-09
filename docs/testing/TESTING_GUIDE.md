# Testing Guide

This document provides comprehensive information about the testing suite for the God Bless platform.

## Overview

The testing suite covers:
- **Backend Tests**: Unit tests, API tests, integration tests, and performance tests using pytest
- **Frontend Tests**: Component tests using React Testing Library and Vitest
- **Test Coverage**: Comprehensive coverage of models, services, API endpoints, and user workflows

## Backend Testing

### Setup

1. Install test dependencies:
```bash
cd god_bless_backend
pip install -r requirements-test.txt
```

2. Configure test database (uses SQLite by default for tests)

### Running Tests

#### Run All Tests
```bash
pytest
```

#### Run Specific Test Categories
```bash
# Unit tests only
pytest -m unit

# API endpoint tests only
pytest -m api

# Integration tests only
pytest -m integration

# Performance tests only
pytest -m performance

# Fast tests (exclude slow tests)
pytest -m "not slow"
```

#### Run Tests with Coverage
```bash
pytest --cov=. --cov-report=html --cov-report=term-missing
```

#### Run Specific Test Files
```bash
pytest accounts/test_models.py
pytest phone_generator/test_api.py
pytest tests/test_integration.py
```

#### Using the Test Runner Script
```bash
python run_tests.py              # Run all tests
python run_tests.py unit         # Run unit tests
python run_tests.py api          # Run API tests
python run_tests.py integration  # Run integration tests
python run_tests.py performance  # Run performance tests
python run_tests.py fast         # Run fast tests only
```

### Test Structure

```
god_bless_backend/
├── conftest.py                          # Pytest configuration and fixtures
├── pytest.ini                           # Pytest settings
├── requirements-test.txt                # Test dependencies
├── run_tests.py                         # Test runner script
├── accounts/
│   ├── test_models.py                   # User model tests
│   └── test_api.py                      # Authentication API tests
├── phone_generator/
│   ├── test_models.py                   # Phone number model tests
│   └── test_api.py                      # Phone generation API tests
├── sms_sender/
│   ├── test_models.py                   # SMS campaign model tests
│   └── test_api.py                      # SMS sending API tests
├── tasks/
│   └── test_models.py                   # Task tracking model tests
└── tests/
    ├── test_integration.py              # Integration workflow tests
    └── test_performance.py              # Performance tests
```

### Test Fixtures

Common fixtures available in `conftest.py`:
- `api_client`: Unauthenticated API client
- `user`: Test user instance
- `authenticated_client`: Authenticated API client
- `admin_user`: Admin user instance
- `authenticated_admin_client`: Authenticated admin API client
- `celery_eager_mode`: Configure Celery for synchronous testing

### Writing Tests

#### Unit Test Example
```python
import pytest
from accounts.models import User

@pytest.mark.unit
class TestUserModel:
    def test_create_user(self, db):
        user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='password123'
        )
        assert user.email == 'test@example.com'
        assert user.check_password('password123')
```

#### API Test Example
```python
import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.api
class TestPhoneGenerationAPI:
    def test_generate_phone_numbers(self, authenticated_client, user, project):
        url = reverse('generate-phone-numbers')
        data = {
            'project_id': project.id,
            'area_code': '123',
            'quantity': 100
        }
        response = authenticated_client.post(url, data, format='json')
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]
        assert 'task_id' in response.data
```

## Frontend Testing

### Setup

1. Install test dependencies:
```bash
cd god_bless_frontend
npm install
```

### Running Tests

#### Run All Tests
```bash
npm test
```

#### Run Tests in Watch Mode
```bash
npm run test:watch
```

#### Run Tests with UI
```bash
npm run test:ui
```

#### Run Tests with Coverage
```bash
npm run test:coverage
```

### Test Structure

```
god_bless_frontend/
├── vitest.config.js                     # Vitest configuration
├── src/
│   ├── test/
│   │   ├── setup.ts                     # Test setup and global mocks
│   │   └── utils.tsx                    # Test utilities and helpers
│   ├── components/
│   │   └── __tests__/
│   │       ├── Button.test.tsx          # Button component tests
│   │       ├── DataTable.test.tsx       # DataTable component tests
│   │       └── ProgressTracker.test.tsx # ProgressTracker tests
│   └── pages/
│       └── __tests__/
│           ├── Dashboard.test.tsx       # Dashboard page tests
│           └── PhoneGeneration.test.tsx # Phone generation page tests
```

### Writing Frontend Tests

#### Component Test Example
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';

describe('Button Component', () => {
  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Page Test Example
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';

describe('Dashboard Page', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('displays stats after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse({ totalPhones: 1000 })
    );

    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });
});
```

## Test Coverage

### Backend Coverage

The test suite covers:
- ✅ User model and authentication
- ✅ Phone number models and generation
- ✅ SMS campaign models and sending
- ✅ Task tracking and progress
- ✅ System settings and configuration
- ✅ API endpoints for all features
- ✅ Integration workflows
- ✅ Performance benchmarks

### Frontend Coverage

The test suite covers:
- ✅ Core UI components (Button, DataTable, ProgressTracker)
- ✅ Page components (Dashboard, Phone Generation)
- ✅ User interactions and form submissions
- ✅ API integration and data fetching
- ✅ Loading states and error handling

## Continuous Integration

### Running Tests in CI/CD

#### Backend Tests
```bash
cd god_bless_backend
pip install -r requirements.txt -r requirements-test.txt
pytest --cov=. --cov-report=xml
```

#### Frontend Tests
```bash
cd god_bless_frontend
npm ci
npm run test:coverage
```

## Performance Testing

Performance tests ensure the platform can handle high-volume operations:

- **Bulk Phone Creation**: 10,000 phone numbers in under 10 seconds
- **Query Performance**: Filtered queries on 1,000+ records in under 1 second
- **Bulk Message Creation**: 5,000 SMS messages in under 5 seconds
- **Pagination Performance**: Paginated results in under 1 second

Run performance tests:
```bash
pytest -m performance
```

## Best Practices

### Backend Testing
1. Use fixtures for common test data
2. Mark tests with appropriate markers (`@pytest.mark.unit`, `@pytest.mark.api`, etc.)
3. Use `db` fixture for database access
4. Mock external services and APIs
5. Test both success and failure cases
6. Use `authenticated_client` for protected endpoints

### Frontend Testing
1. Use `render` from test utils for consistent setup
2. Query by accessible elements (labels, roles, text)
3. Test user interactions, not implementation details
4. Mock API calls with `mockApiResponse`
5. Use `waitFor` for asynchronous operations
6. Test loading and error states

## Troubleshooting

### Backend Issues

**Issue**: Tests fail with database errors
**Solution**: Ensure test database is properly configured and migrations are up to date

**Issue**: Celery tasks don't run in tests
**Solution**: Use `celery_eager_mode` fixture to run tasks synchronously

**Issue**: Authentication tests fail
**Solution**: Use `authenticated_client` fixture instead of plain `api_client`

### Frontend Issues

**Issue**: Tests fail with "window is not defined"
**Solution**: Ensure `jsdom` environment is configured in `vitest.config.js`

**Issue**: Component tests fail with missing context
**Solution**: Use the custom `render` function from test utils that includes providers

**Issue**: Async tests timeout
**Solution**: Increase timeout or check that promises are properly resolved

## Coverage Reports

### Viewing Coverage Reports

#### Backend
After running tests with coverage, open:
```
god_bless_backend/htmlcov/index.html
```

#### Frontend
After running tests with coverage, open:
```
god_bless_frontend/coverage/index.html
```

## Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Django Testing Documentation](https://docs.djangoproject.com/en/stable/topics/testing/)
- [React Testing Library](https://testing-library.com/react)
- [Vitest Documentation](https://vitest.dev/)
