Add-Type -AssemblyName System.Drawing

$imgWidth = 680
$imgHeight = 500
$pad = 18

function Draw-Capsule {
  param(
    [System.Drawing.Graphics]$g,
    [float]$x,
    [float]$y,
    [float]$w,
    [float]$h,
    [System.Drawing.Color]$fill,
    [System.Drawing.Color]$border,
    [float]$borderWidth
  )

  $radius = $h / 2
  $fillBrush = New-Object System.Drawing.SolidBrush($fill)
  $borderPen = New-Object System.Drawing.Pen($border, $borderWidth)

  $g.FillEllipse($fillBrush, $x, $y, $h, $h)
  $g.FillEllipse($fillBrush, $x + $w - $h, $y, $h, $h)
  $g.FillRectangle($fillBrush, $x + $radius, $y, $w - (2 * $radius), $h)

  $g.DrawArc($borderPen, $x, $y, $h, $h, 90, 180)
  $g.DrawArc($borderPen, $x + $w - $h, $y, $h, $h, 270, 180)
  $g.DrawLine($borderPen, $x + $radius, $y, $x + $w - $radius, $y)
  $g.DrawLine($borderPen, $x + $radius, $y + $h, $x + $w - $radius, $y + $h)

  $fillBrush.Dispose()
  $borderPen.Dispose()
}

$bmp = New-Object System.Drawing.Bitmap($imgWidth, $imgHeight)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'

$bgRect = New-Object System.Drawing.Rectangle(0, 0, $imgWidth, $imgHeight)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $bgRect,
  [System.Drawing.Color]::FromArgb(255, 8, 54, 40),
  [System.Drawing.Color]::FromArgb(255, 16, 92, 65),
  90
)
$g.FillRectangle($bgBrush, $bgRect)

$headerFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 23, 82, 62))
$headerBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 44, 114, 88), 1)
$g.FillRectangle($headerFill, $pad, $pad, $imgWidth - ($pad * 2), 104)
$g.DrawRectangle($headerBorder, $pad, $pad, $imgWidth - ($pad * 2), 104)

$nextFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 31, 109, 80))
$nextBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 227, 201, 137), 2)
$g.FillRectangle($nextFill, $pad, 132, $imgWidth - ($pad * 2), 108)
$g.DrawRectangle($nextBorder, $pad, 132, $imgWidth - ($pad * 2), 108)

$tileW = [int](($imgWidth - ($pad * 2) - 8) / 2)
$tileH = 84
$tileY1 = 246
$tileY2 = 336

Draw-Capsule -g $g -x $pad -y $tileY1 -w $tileW -h $tileH -fill ([System.Drawing.Color]::FromArgb(255, 20, 85, 63)) -border ([System.Drawing.Color]::FromArgb(255, 58, 142, 109)) -borderWidth 1
Draw-Capsule -g $g -x ($pad + $tileW + 8) -y $tileY1 -w $tileW -h $tileH -fill ([System.Drawing.Color]::FromArgb(255, 26, 98, 72)) -border ([System.Drawing.Color]::FromArgb(255, 58, 142, 109)) -borderWidth 1
Draw-Capsule -g $g -x $pad -y $tileY2 -w $tileW -h $tileH -fill ([System.Drawing.Color]::FromArgb(255, 22, 89, 67)) -border ([System.Drawing.Color]::FromArgb(255, 58, 142, 109)) -borderWidth 1
Draw-Capsule -g $g -x ($pad + $tileW + 8) -y $tileY2 -w $tileW -h $tileH -fill ([System.Drawing.Color]::FromArgb(255, 28, 106, 77)) -border ([System.Drawing.Color]::FromArgb(255, 58, 142, 109)) -borderWidth 1

$donFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 227, 201, 137))
$donBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 241, 207), 1)
$g.FillRectangle($donFill, $pad, 426, $imgWidth - ($pad * 2), 56)
$g.DrawRectangle($donBorder, $pad, 426, $imgWidth - ($pad * 2), 56)

$fTitle = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Bold)
$fBody = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Regular)
$fBold = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$fHuge = New-Object System.Drawing.Font('Segoe UI', 42, [System.Drawing.FontStyle]::Bold)
$fName = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$fTime = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold)
$fDonate = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Bold)

$cWhite = [System.Drawing.Brushes]::White
$cSoft = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 215, 239, 226))
$cHijri = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 233, 183))
$cDonate = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 60, 46))

$g.DrawString('JMN', $fBold, $cHijri, 30, 24)
$g.DrawString('PRAYER HERO', $fBold, $cSoft, 555, 24)
$g.DrawString("Jami' Masjid Noorani", $fTitle, $cWhite, 30, 50)
$g.DrawString('Fri, 30 May 2026', $fBody, $cSoft, 30, 80)
$g.DrawString('3 Dhul Hijjah 1447', $fBody, $cHijri, 30, 100)

$g.DrawString('Next Prayer', $fBody, $cSoft, 30, 148)
$g.DrawString('LIVE', $fBold, $cHijri, 616, 148)
$g.DrawString('Asr', $fHuge, $cWhite, 30, 160)
$g.DrawString('17:45', $fTime, $cWhite, 590, 183)
$g.DrawString('Tap widget to open full homepage', $fBody, $cSoft, 30, 216)

$g.DrawString('Fajr', $fName, $cSoft, $pad + 16, $tileY1 + 11)
$g.DrawString('03:12', $fTime, $cWhite, $pad + 16, $tileY1 + 35)
$g.DrawString('Iqamah 04:30', $fBody, $cSoft, $pad + 16, $tileY1 + 65)

$g.DrawString('Dhuhr', $fName, $cSoft, $pad + $tileW + 24, $tileY1 + 11)
$g.DrawString('13:10', $fTime, $cWhite, $pad + $tileW + 24, $tileY1 + 35)
$g.DrawString('Iqamah 13:30', $fBody, $cSoft, $pad + $tileW + 24, $tileY1 + 65)

$g.DrawString('Maghrib', $fName, $cSoft, $pad + 16, $tileY2 + 11)
$g.DrawString('21:24', $fTime, $cWhite, $pad + 16, $tileY2 + 35)
$g.DrawString('Iqamah 21:24', $fBody, $cSoft, $pad + 16, $tileY2 + 65)

$g.DrawString('Isha', $fName, $cSoft, $pad + $tileW + 24, $tileY2 + 11)
$g.DrawString('22:40', $fTime, $cWhite, $pad + $tileW + 24, $tileY2 + 35)
$g.DrawString('Iqamah 23:00', $fBody, $cSoft, $pad + $tileW + 24, $tileY2 + 65)

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'
$sf.LineAlignment = 'Center'
$donRect = New-Object System.Drawing.RectangleF($pad, 426, $imgWidth - ($pad * 2), 56)
$g.DrawString('Donate', $fDonate, $cDonate, $donRect, $sf)

$outputPath = Join-Path $PSScriptRoot '..\assets\widget-preview\home-prayer-hero-widget-pill-green.png'
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

Get-Item $outputPath | Select-Object FullName, Length, LastWriteTime
