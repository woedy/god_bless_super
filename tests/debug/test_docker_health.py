#!/usr/bin/env python3
"""
Docker-based test for health monitoring endpoints
Tests the health check endpoints in a containerized environment
"""

import requests
import time
import json
import subprocess
import sys

def wait_for_service(url, timeout=60, interval=5):
    """Wait for a service to become available"""
    print(f"Waiting for service at {url}...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ Service is available at {url}")
                return True
        except requests.RequestException:
            pass
        
        print(f"⏳ Service not ready yet, waiting {interval} seconds...")
        time.sleep(interval)
    
    print(f"❌ Service at {url} did not become available within {timeout} seconds")
    return False

def test_health_endpoint(url, endpoint_name):
    """Test a specific health endpoint"""
    try:
        print(f"\nTesting {endpoint_name} endpoint: {url}")
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
                print(f"✅ {endpoint_name} endpoint working correctly")
                return True
            except json.JSONDecodeError:
                print(f"Response (text): {response.text}")
                print(f"✅ {endpoint_name} endpoint working (non-JSON response)")
                return True
        else:
            print(f"❌ {endpoint_name} endpoint returned status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ {endpoint_name} endpoint test failed: {e}")
        return False

def run_docker_health_tests():
    """Run health monitoring tests in Docker environment"""
    print("🐳 Starting Docker Health Monitoring Tests")
    print("=" * 60)
    
    # Test endpoints to check
    endpoints = [
        ("http://localhost:8000/api/health/", "Basic Health Check"),
        ("http://localhost:8000/api/health/ready/", "Readiness Check"),
        ("http://localhost:8000/api/health/live/", "Liveness Check"),
        ("http://localhost:8000/api/metrics/", "Metrics Endpoint"),
        ("http://localhost:8000/api/monitoring/dashboard/", "Monitoring Dashboard"),
        ("http://localhost:8000/api/monitoring/alerts/", "Alerts Endpoint"),
    ]
    
    # First, wait for the main service to be available
    if not wait_for_service("http://localhost:8000/api/health/", timeout=120):
        print("❌ Backend service is not available. Make sure it's running with:")
        print("   docker-compose up -d backend")
        return False
    
    # Test all endpoints
    passed = 0
    total = len(endpoints)
    
    for url, name in endpoints:
        if test_health_endpoint(url, name):
            passed += 1
        time.sleep(1)  # Small delay between tests
    
    print("\n" + "=" * 60)
    print(f"📊 Docker Test Results: {passed}/{total} endpoints passed")
    
    if passed == total:
        print("🎉 All health monitoring endpoints are working!")
        return True
    else:
        print("⚠️  Some endpoints failed. Check the output above for details.")
        return False

def check_docker_services():
    """Check if required Docker services are running"""
    print("🔍 Checking Docker services...")
    
    try:
        result = subprocess.run(['docker', 'ps', '--format', 'table {{.Names}}\t{{.Status}}'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("Running Docker containers:")
            print(result.stdout)
            
            # Check for required services
            required_services = ['database', 'redis', 'backend']
            running_services = result.stdout.lower()
            
            missing_services = []
            for service in required_services:
                if service not in running_services:
                    missing_services.append(service)
            
            if missing_services:
                print(f"⚠️  Missing services: {', '.join(missing_services)}")
                print("Start them with: docker-compose up -d " + " ".join(missing_services))
                return False
            else:
                print("✅ All required services are running")
                return True
        else:
            print("❌ Failed to check Docker services")
            return False
            
    except Exception as e:
        print(f"❌ Error checking Docker services: {e}")
        return False

if __name__ == '__main__':
    print("🚀 Docker Health Monitoring Test Suite")
    print("This test requires the following services to be running:")
    print("- docker-compose up -d database redis backend")
    print()
    
    # Check Docker services first
    if not check_docker_services():
        print("\n❌ Required Docker services are not running.")
        print("Please start them with: docker-compose up -d database redis backend")
        sys.exit(1)
    
    # Run the health tests
    success = run_docker_health_tests()
    
    if success:
        print("\n🎉 All Docker health monitoring tests passed!")
        print("The health monitoring system is working correctly in Docker.")
    else:
        print("\n⚠️  Some Docker tests failed.")
        print("Check the service logs with: docker-compose logs backend")
    
    sys.exit(0 if success else 1)