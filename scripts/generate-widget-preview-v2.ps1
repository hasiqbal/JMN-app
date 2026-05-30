Add-Type -AssemblyName System.Drawing

$imgWidth = 680
$imgHeight = 500
$bitmap = New-Object System.Drawing.Bitmap($imgWidth, $imgHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = 'AntiAlias'

$backgroundRect = New-Object System.Drawing.RectangleF(0, 0, $imgWidth, $imgHeight)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $backgroundRect,
  [System.Drawing.Color]::FromArgb(255, 173, 210, 231),
  [System.Drawing.Color]::FromArgb(255, 112, 167, 205),
  90
)
$graphics.FillRectangle($bgBrush, 0, 0, $imgWidth, $imgHeight)

$mistBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 255, 255, 255))
$graphics.FillRectangle($mistBrush, 0, 0, $imgWidth, $imgHeight)

$pad = 18

function Draw-GlassPanel {
  param(
    [System.Drawing.Graphics]$g,
    [int]$x,
    [int]$y,
    [int]$w,
    [int]$h,
    [System.Drawing.Color]$fill,
    [System.Drawing.Color]$border,
    [int]$borderWidth
  )

  $fillBrush = New-Object System.Drawing.SolidBrush($fill)
  $borderPen = New-Object System.Drawing.Pen($border, $borderWidth)
  $g.FillRectangle($fillBrush, $x, $y, $w, $h)
  $g.DrawRectangle($borderPen, $x, $y, $w, $h)
  $fillBrush.Dispose()
  $borderPen.Dispose()
}

$headerX = $pad
$headerY = $pad
$headerW = $imgWidth - ($pad * 2)
$headerH = 104
Draw-GlassPanel -g $graphics -x $headerX -y $headerY -w $headerW -h $headerH -fill ([System.Drawing.Color]::FromArgb(125, 255, 255, 255)) -border ([System.Drawing.Color]::FromArgb(210, 255, 255, 255)) -borderWidth 1

$nextX = $pad
$nextY = 132
$nextW = $imgWidth - ($pad * 2)
$nextH = 108
Draw-GlassPanel -g $graphics -x $nextX -y $nextY -w $nextW -h $nextH -fill ([System.Drawing.Color]::FromArgb(120, 245, 252, 255)) -border ([System.Drawing.Color]::FromArgb(225, 255, 235, 180)) -borderWidth 2

$tileW = [int](($imgWidth - ($pad * 2) - 8) / 2)
$tileH = 84
$tileY1 = 246
$tileY2 = 336

Draw-GlassPanel -g $graphics -x $pad -y $tileY1 -w $tileW -h $tileH -fill ([System.Drawing.Color]::FromArgb(110, 235, 246, 255)) -border ([System.Drawing.Color]::FromArgb(190, 255, 255, 255)) -borderWidth 1
Draw-GlassPanel -g $graphics -x ($pad + $tileW + 8) -y $tileY1 -w $tileW -h $tileH -fill ([System.Drawing.Color]::FromArgb(105, 227, 241, 255)) -border ([System.Drawing.Color]::FromArgb(190, 255, 255, 255)) -borderWidth 1
Draw-GlassPanel -g $graphics -x $pad -y $tileY2 -w $tileW -h $tileH -fill ([System.Drawing.Color]::FromArgb(110, 220, 237, 252)) -border ([System.Drawing.Color]::FromArgb(190, 255, 255, 255)) -borderWidth 1
Draw-GlassPanel -g $graphics -x ($pad + $tileW + 8) -y $tileY2 -w $tileW -h $tileH -fill ([System.Drawing.Color]::FromArgb(105, 214, 233, 250)) -border ([System.Drawing.Color]::FromArgb(190, 255, 255, 255)) -borderWidth 1

$donationY = 426
$donationW = $imgWidth - ($pad * 2)
Draw-GlassPanel -g $graphics -x $pad -y $donationY -w $donationW -h 56 -fill ([System.Drawing.Color]::FromArgb(238, 225, 198, 140)) -border ([System.Drawing.Color]::FromArgb(245, 255, 245, 218)) -borderWidth 1

$titleFont = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Regular)
$boldFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$heroFont = New-Object System.Drawing.Font('Segoe UI', 42, [System.Drawing.FontStyle]::Bold)
$tileNameFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$tileTimeFont = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold)
$donateFont = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Bold)

$deepBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 68, 89))
$darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 80, 104))
$goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(192, 145, 61))
$donateTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 60, 46))

$graphics.DrawString('JMN', $boldFont, $goldBrush, 30, 24)
$graphics.DrawString('PRAYER HERO', $boldFont, $darkBrush, 555, 24)
$graphics.DrawString("Jami' Masjid Noorani", $titleFont, $deepBrush, 30, 50)
$graphics.DrawString('Fri, 30 May 2026', $bodyFont, $darkBrush, 30, 80)
$graphics.DrawString('3 Dhul Hijjah 1447', $bodyFont, $goldBrush, 30, 100)

$graphics.DrawString('Next Prayer', $bodyFont, $darkBrush, 30, 148)
$graphics.DrawString('LIVE', $boldFont, $goldBrush, 616, 148)
$graphics.DrawString('Asr', $heroFont, $deepBrush, 30, 160)
$graphics.DrawString('17:45', $tileTimeFont, $deepBrush, 590, 183)
$graphics.DrawString('Tap widget to open full homepage', $bodyFont, $darkBrush, 30, 216)

function Draw-TileText {
  param(
    [System.Drawing.Graphics]$g,
    [int]$x,
    [int]$y,
    [string]$name,
    [string]$time,
    [string]$iqamah,
    [System.Drawing.Font]$nameFont,
    [System.Drawing.Font]$timeFont,
    [System.Drawing.Font]$bodyFont,
    [System.Drawing.Brush]$nameBrush,
    [System.Drawing.Brush]$timeBrush
  )

  $g.DrawString($name, $nameFont, $nameBrush, $x + 14, $y + 10)
  $g.DrawString($time, $timeFont, $timeBrush, $x + 14, $y + 34)
  $g.DrawString("Iqamah $iqamah", $bodyFont, $nameBrush, $x + 14, $y + 64)
}

Draw-TileText -g $graphics -x $pad -y $tileY1 -name 'Fajr' -time '03:12' -iqamah '04:30' -nameFont $tileNameFont -timeFont $tileTimeFont -bodyFont $bodyFont -nameBrush $darkBrush -timeBrush $deepBrush
Draw-TileText -g $graphics -x ($pad + $tileW + 8) -y $tileY1 -name 'Dhuhr' -time '13:10' -iqamah '13:30' -nameFont $tileNameFont -timeFont $tileTimeFont -bodyFont $bodyFont -nameBrush $darkBrush -timeBrush $deepBrush
Draw-TileText -g $graphics -x $pad -y $tileY2 -name 'Maghrib' -time '21:24' -iqamah '21:24' -nameFont $tileNameFont -timeFont $tileTimeFont -bodyFont $bodyFont -nameBrush $darkBrush -timeBrush $deepBrush
Draw-TileText -g $graphics -x ($pad + $tileW + 8) -y $tileY2 -name 'Isha' -time '22:40' -iqamah '23:00' -nameFont $tileNameFont -timeFont $tileTimeFont -bodyFont $bodyFont -nameBrush $darkBrush -timeBrush $deepBrush

$centered = New-Object System.Drawing.StringFormat
$centered.Alignment = 'Center'
$centered.LineAlignment = 'Center'
$donationRect = New-Object System.Drawing.RectangleF($pad, $donationY, $donationW, 56)
$graphics.DrawString('Donate', $donateFont, $donateTextBrush, $donationRect, $centered)

$outputDir = Join-Path $PSScriptRoot '..\assets\widget-preview'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$outputPath = Join-Path $outputDir 'home-prayer-hero-widget-sky-glass-v2.png'
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Get-Item $outputPath | Select-Object FullName, Length, LastWriteTime
