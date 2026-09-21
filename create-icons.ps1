# Script to generate standard PNG icons for Tamanina Chrome Extension
$iconsDir = Join-Path $PSScriptRoot 'icons'
if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir | Out-Null }

Add-Type -AssemblyName System.Drawing

$sizes = @(16, 48, 128)
foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Fill background with calm teal (#0D9488)
    $bgColor = [System.Drawing.Color]::FromArgb(255, 13, 148, 136)
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($brush, 0, 0, $sz, $sz)
    
    # Draw white emblem outline
    $penWidth = [Math]::Max(1.5, [Math]::Floor($sz / 14))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)
    $pad = [Math]::Max(2, [Math]::Floor($sz / 6))
    $g.DrawEllipse($pen, $pad, $pad, $sz - (2 * $pad), $sz - (2 * $pad))
    
    $filePath = Join-Path $iconsDir ("icon$sz.png")
    $bmp.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $filePath"
}
