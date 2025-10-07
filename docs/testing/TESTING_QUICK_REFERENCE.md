# Testing Quick Reference

Quick commands and examples for running tests in the God Bless platform.

## Backend Tests (pytest)

### Quick Commands
```bash
cd god_bless_backend

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test types
pytest -m unit              # Unit tests only
pytest -m api               # API tests only
pytest -m integration       # Integration tests only
pytest -m performance       # Performance tests only
pytest -m "not slow"        # Skip slow tests

# Run specific files
pytest accounts/test_models.py
pytest phone_generator/test_api.py

# Run specific test class or function
pytest accounts/test_models.py::TestUserModel
pytest accounts/test_models.py::TestUserModel::test_create_user

# Verbose output
pytest -v

# Stop on first failure
pytest -x

# Show print statements
pytest -s
```

### Using Test Runner Script
```bash
python run_tests.py              # All tests
python run_tests.py unit         # Unit tests
python run_tests.py api          # API tests
python run_tests.py integration  # Integration tests
python run_tests.py performance  # Performance tests
python run_tests.py fast         # Fast tests only
```

## Frontend Tests (Vitest)

### Quick Commands
```bash
cd god_bless_frontend

# Run all tests
npm test

# Watch mode (re-run on changes)
npm run test:watch

# UI mode (interactive)
npm run test:ui

# Coverage report
npm run test:coverage

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --grep "Button"
```

## Test File Locations

### Backend
```
god_bless_backend/
├── accounts/test_models.py          # User models
├── accounts/test_api.py             # Auth API
├── phone_generator/test_models.py   # Phone models
├── phone_generator/test_api.py      # Phone API
├── sms_sender/test_models.py        # SMS models
├── sms_sender/test_api.py           # SMS API
├── tasks/test_models.py             # Task models
├── tests/test_integration.py        # Integration tests
└── tests/test_performance.py        # Performance tests
```

### Frontend
```
god_bless_frontend/src/
├── components/__tests__/
│   ├── Button.test.tsx
│   ├── DataTable.test.tsx
│   └── ProgressTracker.test.tsx
└── pages/__tests__/
    ├── Dashboard.test.tsx
    └── PhoneGeneration.test.tsx
```

## Common Test Patterns

### Backend: Testing Models
```python
@pytest.mark.unit
def test_create_phone_number(user, project):
    phone = PhoneNumber.objects.create(
        user=user,
        project=project,
        phone_number='1234567890',
        carrier='Verizon'
    )
    assert phone.phone_number == '1234567890'
```

### Backend: Testing API Endpoints
```python
@pytest.mark.api
def test_generate_phones(authenticated_client, project):
    url = reverse('generate-phone-numbers')
    data = {'project_id': project.id, 'area_code': '123', 'quantity': 100}
    response = authenticated_client.post(url, data, format='json')
    assert response.status_code == 200
```

### Frontend: Testing Components
```typescript
it('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

### Frontend: Testing User Interactions
```typescript
it('calls onClick when clicked', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  fireEvent.click(screen.getByText('Click'));
  expect(handleClick).toHaveBeenCalled();
});
```

## Fixtures (Backend)

```python
# Available fixtures in conftest.py
api_client                    # Unauthenticated API client
user                          # Test user
authenticated_client          # Authenticated API client
admin_user                    # Admin user
authenticated_admin_client    # Authenticated admin client
celery_eager_mode            # Sync Celery execution
```

## Test Utilities (Frontend)

```typescript
// Available in src/test/utils.tsx
render()                      // Render with providers
mockApiResponse()             // Mock API responses
mockUser                      // Mock user data
mockPhoneNumber              // Mock phone data
mockCampaign                 // Mock campaign data
mockTask                     // Mock task data
```

## Coverage Reports

### Backend
```bash
pytest --cov=. --cov-report=html
# Open: god_bless_backend/htmlcov/index.html
```

### Frontend
```bash
npm run test:coverage
# Open: god_bless_frontend/coverage/index.html
```

## Debugging Tests

### Backend
```bash
# Run with debugger
pytest --pdb                  # Drop into debugger on failure
pytest --pdb-trace           # Drop into debugger at start

# Show more output
pytest -vv                   # Very verbose
pytest -s                    # Show print statements
pytest --tb=short            # Short traceback
pytest --tb=long             # Long traceback
```

### Frontend
```bash
# Debug in browser
npm run test:ui              # Opens interactive UI

# Show console logs
npm test -- --reporter=verbose
```

## CI/CD Integration

### GitHub Actions Example
```yaml
# Backend tests
- name: Run Backend Tests
  run: |
    cd god_bless_backend
    pip install -r requirements.txt -r requirements-test.txt
    pytest --cov=. --cov-report=xml

# Frontend tests
- name: Run Frontend Tests
  run: |
    cd god_bless_frontend
    npm ci
    npm run test:coverage
```

## Performance Benchmarks

Expected performance (from performance tests):
- Bulk phone creation (10K): < 10 seconds
- Query with filters (1K records): < 1 second
- Bulk message creation (5K): < 5 seconds
- Pagination queries: < 1 second
- Count queries: < 0.5 seconds

## Test Markers

```python
@pytest.mark.unit          # Unit tests
@pytest.mark.api           # API endpoint tests
@pytest.mark.integration   # Integration tests
@pytest.mark.performance   # Performance tests
@pytest.mark.slow          # Slow-running tests
```

## Quick Troubleshooting

### Backend
- **Database errors**: Check migrations are applied
- **Import errors**: Ensure PYTHONPATH includes project root
- **Celery issues**: Use `celery_eager_mode` fixture
- **Auth failures**: Use `authenticated_client` fixture

### Frontend
- **Window undefined**: Check jsdom environment in config
- **Component not found**: Use custom render from test utils
- **Async timeouts**: Use `waitFor` for async operations
- **Mock not working**: Reset mocks in `beforeEach`
