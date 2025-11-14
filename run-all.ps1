# 1. Start Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 15

# 2. Run docker-compose in CMD
Start-Process cmd -ArgumentList "/c cd /d F:\realtime-analytics && docker-compose up --build"
Start-Sleep -Seconds 10

# 3. Run load.js in another CMD
Start-Process cmd -ArgumentList "/c cd /d F:\realtime-analytics\loadgen && node load.js"
Start-Sleep -Seconds 5

# 4. Open websites
Start-Process "http://localhost:4000/health"
Start-Process "http://localhost:3000/"
