#!/usr/bin/env python
"""
Debug environment variables
"""
import os

print("Environment Variables:")
for key, value in sorted(os.environ.items()):
    if any(keyword in key.upper() for keyword in ['SECRET', 'PASSWORD', 'KEY']):
        print(f"{key}=***HIDDEN***")
    else:
        print(f"{key}={value}")

print(f"\nDEBUG: {os.environ.get('DEBUG', 'NOT SET')}")
print(f"USE_POSTGRES: {os.environ.get('USE_POSTGRES', 'NOT SET')}")
print(f"POSTGRES_HOST: {os.environ.get('POSTGRES_HOST', 'NOT SET')}")