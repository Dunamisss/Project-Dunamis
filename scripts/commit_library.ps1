$ErrorActionPreference = "Stop"

Write-Host "Dunamis Library Commit Helper"
Write-Host "This will stage library data and images, then create a commit."
Write-Host ""

$message = Read-Host "Commit message (e.g., 'Update libraries')"
if ([string]::IsNullOrWhiteSpace($message)) {
  Write-Host "Commit message is required. Aborting."
  exit 1
}

# Stage only library-related changes
git add `
  src/data/promptLibrary.ts `
  src/data/imageLibrary.ts `
  public/images/library `
  public/robots.txt `
  public/sitemap.xml

git status -s

$confirm = Read-Host "Proceed with commit? (y/n)"
if ($confirm -ne "y") {
  Write-Host "Aborted."
  exit 0
}

git commit -m $message
Write-Host "Commit created. Push with GitHub Desktop."
