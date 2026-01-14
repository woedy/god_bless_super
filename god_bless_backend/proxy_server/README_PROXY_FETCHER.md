# Proxy Fetcher Script

This script fetches free proxies from GeoNode and adds them to your database for testing the proxy health checker.

## Usage

### Basic Usage

```bash
# Fetch 10 HTTP proxies
python proxy_server/fetch_proxies.py --limit 10 --protocols http

# Fetch SOCKS5 proxies
python proxy_server/fetch_proxies.py --limit 15 --protocols socks5

# Fetch mixed protocols
python proxy_server/fetch_proxies.py --limit 20 --protocols http socks5

# Fetch from specific countries
python proxy_server/fetch_proxies.py --limit 10 --countries US UK

# Test proxy health after adding
python proxy_server/fetch_proxies.py --limit 5 --protocols http --test-health
```

### Interactive Mode

```bash
python proxy_server/run_fetch.py
```

### Command Line Options

- `--limit`: Number of proxies to fetch (default: 20)
- `--protocols`: List of protocols (http, socks4, socks5)
- `--countries`: List of country codes
- `--user-id`: Specific user ID to assign proxies to
- `--test-health`: Test proxy health after adding

## Examples

### Quick Test Setup
```bash
# Add 5 HTTP proxies and test them
python proxy_server/fetch_proxies.py --limit 5 --protocols http --test-health
```

### SOCKS5 Testing
```bash
# Add 10 SOCKS5 proxies
python proxy_server/fetch_proxies.py --limit 10 --protocols socks5
```

### Regional Testing
```bash
# Add proxies from specific countries
python proxy_server/fetch_proxies.py --limit 15 --countries US DE UK --protocols http
```

## Features

- **Automatic User Assignment**: Uses first available user or creates test user
- **Duplicate Prevention**: Skips proxies that already exist
- **Health Testing**: Optional health check integration
- **Protocol Support**: HTTP, SOCKS4, SOCKS5
- **Country Filtering**: Fetch from specific countries
- **Error Handling**: Robust error handling and logging

## Integration with Proxy Health Checker

Once proxies are added, they'll automatically appear in:
- Django Admin: `/admin/proxy_server/proxyserver/`
- Frontend: `/settings/proxy/health`
- API: `/api/proxy-server/list/`

The health checker will test these proxies and update their status accordingly.

## Notes

- Free proxies are often unreliable (perfect for testing failure scenarios)
- Proxies are marked as healthy initially, then tested
- Script prevents duplicates by checking host:port combinations
- Requires internet connection to fetch from GeoNode API
