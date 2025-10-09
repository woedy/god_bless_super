#!/bin/bash

echo "=========================================="
echo "Testing Suite Verification"
echo "=========================================="
echo ""

# Check backend test files
echo "Checking Backend Test Files..."
backend_files=(
    "god_bless_backend/pytest.ini"
    "god_bless_backend/conftest.py"
    "god_bless_backend/requirements-test.txt"
    "god_bless_backend/run_tests.py"
    "god_bless_backend/accounts/test_models.py"
    "god_bless_backend/accounts/test_api.py"
    "god_bless_backend/phone_generator/test_models.py"
    "god_bless_backend/phone_generator/test_api.py"
    "god_bless_backend/sms_sender/test_models.py"
    "god_bless_backend/sms_sender/test_api.py"
    "god_bless_backend/tasks/test_models.py"
    "god_bless_backend/tests/test_integration.py"
    "god_bless_backend/tests/test_performance.py"
)

backend_count=0
for file in "${backend_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
        ((backend_count++))
    else
        echo "✗ $file (missing)"
    fi
done

echo ""
echo "Backend test files: $backend_count/${#backend_files[@]}"
echo ""

# Check frontend test files
echo "Checking Frontend Test Files..."
frontend_files=(
    "god_bless_frontend/vitest.config.js"
    "god_bless_frontend/src/test/setup.ts"
    "god_bless_frontend/src/test/utils.tsx"
    "god_bless_frontend/src/components/__tests__/Button.test.tsx"
    "god_bless_frontend/src/components/__tests__/DataTable.test.tsx"
    "god_bless_frontend/src/components/__tests__/ProgressTracker.test.tsx"
    "god_bless_frontend/src/pages/__tests__/Dashboard.test.tsx"
    "god_bless_frontend/src/pages/__tests__/PhoneGeneration.test.tsx"
)

frontend_count=0
for file in "${frontend_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
        ((frontend_count++))
    else
        echo "✗ $file (missing)"
    fi
done

echo ""
echo "Frontend test files: $frontend_count/${#frontend_files[@]}"
echo ""

# Check documentation
echo "Checking Documentation..."
doc_files=(
    "TESTING_GUIDE.md"
    "TESTING_QUICK_REFERENCE.md"
    "TASK_21_TESTING_IMPLEMENTATION.md"
)

doc_count=0
for file in "${doc_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
        ((doc_count++))
    else
        echo "✗ $file (missing)"
    fi
done

echo ""
echo "Documentation files: $doc_count/${#doc_files[@]}"
echo ""

# Summary
total_files=$((${#backend_files[@]} + ${#frontend_files[@]} + ${#doc_files[@]}))
total_found=$((backend_count + frontend_count + doc_count))

echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Total files expected: $total_files"
echo "Total files found: $total_found"
echo ""

if [ $total_found -eq $total_files ]; then
    echo "✓ All test files are in place!"
    echo ""
    echo "Next steps:"
    echo "1. Install backend test dependencies:"
    echo "   cd god_bless_backend && pip install -r requirements-test.txt"
    echo ""
    echo "2. Install frontend test dependencies:"
    echo "   cd god_bless_frontend && npm install"
    echo ""
    echo "3. Run backend tests:"
    echo "   cd god_bless_backend && pytest"
    echo ""
    echo "4. Run frontend tests:"
    echo "   cd god_bless_frontend && npm test"
    echo ""
else
    echo "✗ Some test files are missing!"
    echo "Missing: $((total_files - total_found)) files"
fi

echo "=========================================="
