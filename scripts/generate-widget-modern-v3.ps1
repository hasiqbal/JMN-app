Add-Type -AssemblyName System.Drawing

$imgWidth = 720
$imgHeight = 360
$pad = 22

function HexToColor {
  param([string]$hex)
  $clean = $hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb(
    255,
    [Convert]::ToInt32($clean.Substring(0, 2), 16),
    [Convert]::ToInt32($clean.Substring(2, 2), 16),
    [Convert]::ToInt32($clean.Substring(4, 2), 16)
  )
}

function New-RoundedPath {
  param([float]$x, [float]$y, [float]$w, [float]$h, [float]$r)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-Rounded {
  param(
    [System.Drawing.Graphics]$g,
    [float]$x, [float]$y, [float]$w, [float]$h, [float]$r,
    [System.Drawing.Color]$fill,
    [System.Drawing.Color]$border,
    [float]$borderWidth
  )
  $path = New-RoundedPath -x $x -y $y -w $w -h $h -r $r
  $b = New-Object System.Drawing.SolidBrush($fill)
  $g.FillPath($b, $path)
  if ($borderWidth -gt 0) {
    $p = New-Object System.Drawing.Pen($border, $borderWidth)
    $g.DrawPath($p, $path)
    $p.Dispose()
  }
  $b.Dispose()
  $path.Dispose()
}

function Fill-Circle {
  param(
    [System.Drawing.Graphics]$g,
    [float]$x, [float]$y, [float]$d,
    [System.Drawing.Color]$fill
  )
  $b = New-Object System.Drawing.SolidBrush($fill)
  $g.FillEllipse($b, $x, $y, $d, $d)
  $b.Dispose()
}

$bmp = New-Object System.Drawing.Bitmap($imgWidth, $imgHeight)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'

# Backdrop (transparent-ish dark surface to mimic phone wallpaper context)
$g.Clear([System.Drawing.Color]::FromArgb(255, 28, 32, 36))

# Widget body
$bodyFill = HexToColor '#0A2C22'
$bodyBorder = HexToColor '#1F5440'
Fill-Rounded -g $g -x $pad -y $pad -w ($imgWidth - $pad * 2) -h ($imgHeight - $pad * 2) -r 32 -fill $bodyFill -border $bodyBorder -borderWidth 1.5

$contentX = $pad + 26
$contentY = $pad + 24
$contentW = $imgWidth - ($pad * 2) - 52

# Top row — brand mark + name + date
$brandD = 32
Fill-Circle -g $g -x $contentX -y $contentY -d $brandD -fill ([System.Drawing.Color]::White)
$brandBorder = New-Object System.Drawing.Pen((HexToColor '#DDE8E2'), 1)
$g.DrawEllipse($brandBorder, $contentX, $contentY, $brandD, $brandD)
$logoPath = Join-Path $PSScriptRoot '..\assets\images\masjid-logo.png'
if (Test-Path $logoPath) {
  $logoImage = [System.Drawing.Image]::FromFile($logoPath)
  $oldClip = $g.Clip
  $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clipPath.AddEllipse($contentX, $contentY, $brandD, $brandD)
  $g.SetClip($clipPath)
  $inset = 5
  $g.DrawImage($logoImage, $contentX + $inset, $contentY + $inset, $brandD - ($inset * 2), $brandD - ($inset * 2))
  $g.Clip = $oldClip
  $clipPath.Dispose()
  $logoImage.Dispose()
} else {
  Fill-Circle -g $g -x $contentX -y $contentY -d $brandD -fill (HexToColor '#E3C989')
}
$brandBorder.Dispose()

$nameFont = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$hijriFont = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Regular)
$nameBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$hijriBrush = New-Object System.Drawing.SolidBrush((HexToColor '#9CC9B2'))
$g.DrawString("Jami' Masjid Noorani", $nameFont, $nameBrush, $contentX + $brandD + 12, $contentY + 0)
$g.DrawString('3 Dhul Hijjah 1447', $hijriFont, $hijriBrush, $contentX + $brandD + 12, $contentY + 18)

$dateFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$dateBrush = New-Object System.Drawing.SolidBrush((HexToColor '#7FB29A'))
$dateText = 'Fri, 30 May 2026'
$dateSize = $g.MeasureString($dateText, $dateFont)
$g.DrawString($dateText, $dateFont, $dateBrush, $contentX + $contentW - $dateSize.Width, $contentY + 10)

# Eyebrow with dot
$eyebrowY = $contentY + 64
Fill-Circle -g $g -x $contentX -y ($eyebrowY + 6) -d 8 -fill (HexToColor '#E3C989')
$eyebrowFont = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$eyebrowBrush = New-Object System.Drawing.SolidBrush((HexToColor '#E3C989'))
$g.DrawString('NEXT PRAYER', $eyebrowFont, $eyebrowBrush, $contentX + 14, $eyebrowY)

# Hero row — Asr 17:45
$heroY = $eyebrowY + 22
$heroFont = New-Object System.Drawing.Font('Segoe UI', 38, [System.Drawing.FontStyle]::Bold)
$heroBrushName = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$heroBrushTime = New-Object System.Drawing.SolidBrush((HexToColor '#F5DEA0'))
$g.DrawString('Asr', $heroFont, $heroBrushName, $contentX, $heroY)
$timeText = '17:45'
$timeSize = $g.MeasureString($timeText, $heroFont)
$g.DrawString($timeText, $heroFont, $heroBrushTime, $contentX + $contentW - $timeSize.Width, $heroY)

# Pill strip
$pillY = $heroY + 78
$pillH = 48
$pillCount = 5
$gap = 8
$pillW = ($contentW - ($gap * ($pillCount - 1))) / $pillCount

$prayers = @(
  @{ Name = 'FAJR'; Time = '03:12' },
  @{ Name = 'DHUHR'; Time = '13:10' },
  @{ Name = 'ASR'; Time = '17:45' },
  @{ Name = 'MAGHRIB'; Time = '21:24' },
  @{ Name = 'ISHA'; Time = '22:40' }
)

$pillNameFont = New-Object System.Drawing.Font('Segoe UI', 8, [System.Drawing.FontStyle]::Bold)
$pillTimeFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)

for ($i = 0; $i -lt $pillCount; $i++) {
  $px = $contentX + ($i * ($pillW + $gap))
  $active = ($prayers[$i].Name -eq 'ASR')
  if ($active) {
    Fill-Rounded -g $g -x $px -y $pillY -w $pillW -h $pillH -r ($pillH / 2) -fill (HexToColor '#E3C989') -border (HexToColor '#F5D98F') -borderWidth 1.2
    $nb = New-Object System.Drawing.SolidBrush((HexToColor '#0A2C22'))
    $tb = New-Object System.Drawing.SolidBrush((HexToColor '#0A2C22'))
  } else {
    Fill-Rounded -g $g -x $px -y $pillY -w $pillW -h $pillH -r ($pillH / 2) -fill (HexToColor '#13402F') -border (HexToColor '#1F5440') -borderWidth 1
    $nb = New-Object System.Drawing.SolidBrush((HexToColor '#7FB29A'))
    $tb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  }
  $nameStr = $prayers[$i].Name
  $timeStr = $prayers[$i].Time
  $nameSize = $g.MeasureString($nameStr, $pillNameFont)
  $timeSize = $g.MeasureString($timeStr, $pillTimeFont)
  $g.DrawString($nameStr, $pillNameFont, $nb, $px + ($pillW - $nameSize.Width) / 2, $pillY + 6)
  $g.DrawString($timeStr, $pillTimeFont, $tb, $px + ($pillW - $timeSize.Width) / 2, $pillY + 22)
}

# Donate CTA pill (outlined gold)
$donY = $pillY + $pillH + 16
$donH = 36
Fill-Rounded -g $g -x $contentX -y $donY -w $contentW -h $donH -r ($donH / 2) -fill (HexToColor '#103A2D') -border (HexToColor '#E3C989') -borderWidth 1.4
$donFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$donBrush = New-Object System.Drawing.SolidBrush((HexToColor '#E3C989'))
$donText = 'Donate to the masjid'
$donSize = $g.MeasureString($donText, $donFont)
$g.DrawString($donText, $donFont, $donBrush, $contentX + ($contentW - $donSize.Width) / 2, $donY + ($donH - $donSize.Height) / 2)

$outDir = Join-Path $PSScriptRoot '..\assets\widget-preview'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$outputPath = Join-Path $outDir 'home-prayer-widget-modern-v3.png'
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

Get-Item $outputPath | Select-Object FullName, Length, LastWriteTime
