#!/usr/bin/env python
"""
Test runner script for God Bless backend tests
"""
import sys
import subprocess


def run_tests(args=None):
    """Run pytest with specified arguments"""
    cmd = ['pytest']
    
    if args:
        cmd.extend(args)
    else:
        # Default: run all tests with coverage
        cmd.extend([
            '--verbose',
            '--cov=.',
            '--cov-report=html',
            '--cov-report=term-missing'
        ])
    
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    return result.returncode


def run_unit_tests():
    """Run only unit tests"""
    return run_tests(['-m', 'unit'])


def run_api_tests():
    """Run only API tests"""
    return run_tests(['-m', 'api'])


def run_integration_tests():
    """Run only integration tests"""
    return run_tests(['-m', 'integration'])


def run_performance_tests():
    """Run only performance tests"""
    return run_tests(['-m', 'performance'])


def run_fast_tests():
    """Run all tests except slow ones"""
    return run_tests(['-m', 'not slow'])


if __name__ == '__main__':
    if len(sys.argv) > 1:
        test_type = sys.argv[1]
        
        if test_type == 'unit':
            sys.exit(run_unit_tests())
        elif test_type == 'api':
            sys.exit(run_api_tests())
        elif test_type == 'integration':
            sys.exit(run_integration_tests())
        elif test_type == 'performance':
            sys.exit(run_performance_tests())
        elif test_type == 'fast':
            sys.exit(run_fast_tests())
        else:
            print(f"Unknown test type: {test_type}")
            print("Available types: unit, api, integration, performance, fast")
            sys.exit(1)
    else:
        # Run all tests
        sys.exit(run_tests())
