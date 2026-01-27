$exclude = @('node_modules', '.venv', 'venv', '__pycache__', '.git', '.turbo', '.ruff_cache', '.pytest_cache', '.mypy_cache', 'htmlcov', '.next', 'dist', 'build', '.coverage', 'tsconfig.tsbuildinfo', 'bun.lock', '.opencode', '.playwright-mcp', 'certs', '.agent', 'docs')

function Get-FolderStructure {
    param(
        [string]$Path,
        [int]$Indent = 0,
        [string]$Prefix = ""
    )
    
    $items = Get-ChildItem -Path $Path -Force | Where-Object { 
        $item = $_
        $shouldExclude = $false
        foreach ($e in $exclude) {
            if ($item.Name -eq $e) {
                $shouldExclude = $true
                break
            }
        }
        -not $shouldExclude
    } | Sort-Object { $_.PSIsContainer }, Name
    
    $count = $items.Count
    $i = 0
    
    foreach ($item in $items) {
        $i++
        $isLast = ($i -eq $count)
        $connector = if ($isLast) { "└──" } else { "├──" }
        $extension = if ($item.PSIsContainer) { "" } else { " (" + $("{0:N2}" -f ($item.Length / 1KB)) + " KB)" }
        
        Write-Output "$Prefix$connector $($item.Name)$extension"
        
        if ($item.PSIsContainer -and $Indent -lt 4) {
            $newPrefix = if ($isLast) { "$Prefix    " } else { "$Prefix│   " }
            Get-FolderStructure -Path $item.FullName -Indent ($Indent + 1) -Prefix $newPrefix
        }
    }
}

Write-Output "Nezuko-Telegram-Bot"
Write-Output "│"
Get-FolderStructure -Path "."
