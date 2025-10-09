# Docker Management Scripts

Simple scripts to manage your God Bless America Docker deployment from the root directory.

## Available Scripts

### Windows (PowerShell)
- `.\start.ps1` - Start all Docker services
- `.\stop.ps1` - Stop all Docker services  
- `.\status.ps1` - Check service status

### Windows (Batch)
- `start.bat` - Start all Docker services
- `stop.bat` - Stop all Docker services

### Linux/Mac (Bash)
- `./start.sh` - Start all Docker services
- `./stop.sh` - Stop all Docker services

## Usage

### Starting Services
```powershell
# PowerShell
.\start.ps1

# Batch
start.bat

# Bash (Linux/Mac)
./start.sh
```

### Stopping Services
```powershell
# PowerShell
.\stop.ps1

# Batch  
stop.bat

# Bash (Linux/Mac)
./stop.sh
```

### Checking Status
```powershell
# PowerShell
.\status.ps1

# Manual check
cd god_bless_backend
docker-compose ps
```

## Access Points

After starting services, access your application at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:6161
- **Admin Panel**: http://localhost:6161/admin

## Troubleshooting

### View Logs
```bash
cd god_bless_backend
docker-compose logs -f
```

### Restart Services
```powershell
.\stop.ps1
.\start.ps1
```

### Clean Restart (rebuild containers)
```bash
cd god_bless_backend
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Access Container Shell
```bash
cd god_bless_backend
docker-compose exec god_bless_app bash
```

## Notes

- All scripts automatically navigate to the `god_bless_backend` directory
- Scripts include error checking and helpful output
- PowerShell scripts work on Windows PowerShell and PowerShell Core
- Bash scripts require executable permissions on Linux/Mac