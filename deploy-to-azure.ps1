# PowerShell script for Azure deployment
# Run this script from the project root directory

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$AppServiceName,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "West Europe",
    
    [Parameter(Mandatory=$false)]
    [string]$PricingTier = "B1"
)

Write-Host "Starting Azure deployment for Growth Accelerator Platform..." -ForegroundColor Green

# Check if Azure CLI is installed
try {
    az --version | Out-Null
} catch {
    Write-Host "Azure CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Login to Azure (if not already logged in)
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$loginStatus = az account show 2>$null
if (!$loginStatus) {
    Write-Host "Please log in to Azure..." -ForegroundColor Yellow
    az login
}

# Create resource group if it doesn't exist
Write-Host "Creating resource group: $ResourceGroupName" -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location

# Create App Service plan
$planName = "$AppServiceName-plan"
Write-Host "Creating App Service plan: $planName" -ForegroundColor Yellow
az appservice plan create `
    --name $planName `
    --resource-group $ResourceGroupName `
    --sku $PricingTier `
    --is-linux

# Create Web App
Write-Host "Creating Web App: $AppServiceName" -ForegroundColor Yellow
az webapp create `
    --resource-group $ResourceGroupName `
    --plan $planName `
    --name $AppServiceName `
    --runtime "NODE:18-lts"

# Configure app settings
Write-Host "Configuring application settings..." -ForegroundColor Yellow
az webapp config appsettings set `
    --resource-group $ResourceGroupName `
    --name $AppServiceName `
    --settings @"
[
    {
        "name": "VITE_SUPABASE_URL",
        "value": "https://doulsumepjfihqowzheq.supabase.co"
    },
    {
        "name": "VITE_SUPABASE_ANON_KEY", 
        "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWxzdW1lcGpmaWhxb3d6aGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4Nzk3ODgsImV4cCI6MjA2NDQ1NTc4OH0.IewqiemFwcu74Y8Gla-XJUMiQp-ym8J-i0niylIVK2A"
    },
    {
        "name": "WEBSITE_NODE_DEFAULT_VERSION",
        "value": "18-lts"
    }
]
"@

# Enable Always On (for production)
Write-Host "Enabling Always On..." -ForegroundColor Yellow
az webapp config set `
    --resource-group $ResourceGroupName `
    --name $AppServiceName `
    --always-on true

# Build the application
Write-Host "Building the application..." -ForegroundColor Yellow
npm install
npm run build

# Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFile = "deployment-$timestamp.zip"

# Compress the dist folder
Compress-Archive -Path ".\dist\*" -DestinationPath $zipFile -Force

# Deploy to Azure
Write-Host "Deploying to Azure App Service..." -ForegroundColor Yellow
az webapp deployment source config-zip `
    --resource-group $ResourceGroupName `
    --name $AppServiceName `
    --src $zipFile

# Clean up deployment package
Remove-Item $zipFile

# Get the app URL
$appUrl = az webapp show --resource-group $ResourceGroupName --name $AppServiceName --query "defaultHostName" --output tsv

Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
Write-Host "Your app is available at: https://$appUrl" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Configure custom domain (if needed)" -ForegroundColor White
Write-Host "2. Set up SSL certificate" -ForegroundColor White
Write-Host "3. Configure monitoring and alerts" -ForegroundColor White
Write-Host "4. Set up CI/CD pipeline with GitHub Actions" -ForegroundColor White