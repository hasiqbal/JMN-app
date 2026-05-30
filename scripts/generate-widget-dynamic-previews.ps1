Add-Type -AssemblyName System.Drawing

$imgWidth = 680
$imgHeight = 500
$pad = 18

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

function MixHex {
  param([string]$a, [string]$b, [double]$t)
  $ca = HexToColor $a
  $cb = HexToColor $b
  $r = [Math]::Round($ca.R + (($cb.R - $ca.R) * $t))
  $g = [Math]::Round($ca.G + (($cb.G - $ca.G) * $t))
  $bl = [Math]::Round($ca.B + (($cb.B - $ca.B) * $t))
  return [System.Drawing.Color]::FromArgb(255, [int]$r, [int]$g, [int]$bl)
}

function WithAlpha {
  param([System.Drawing.Color]$color, [int]$alpha)
  return [System.Drawing.Color]::FromArgb($alpha, $color.R, $color.G, $color.B)
}

function Luma {
  param([System.Drawing.Color]$color)
  return (0.2126 * $color.R) + (0.7152 * $color.G) + (0.0722 * $color.B)
}

function DrawPanel {
  param(
    [System.Drawing.Graphics]$g,
    [int]$x,
    [int]$y,
    [int]$w,
    [int]$h,
    [System.Drawing.Color]$fill,
    [System.Drawing.Color]$border,
    [int]$bw
  )
  $fb = New-Object System.Drawing.SolidBrush($fill)
  $bp = New-Object System.Drawing.Pen($border, $bw)
  $g.FillRectangle($fb, $x, $y, $w, $h)
  $g.DrawRectangle($bp, $x, $y, $w, $h)
  $fb.Dispose()
  $bp.Dispose()
}

function DrawPreview {
  param(
    [string]$name,
    [string[]]$skyHex,
    [string]$outputPath
  )

  $skyTop = $skyHex[0]
  $skyMid = $skyHex[1]
  $skySoft = $skyHex[2]
  $skyLight = $skyHex[3]

  $frameBase = MixHex $skyTop $skyMid 0.55
  $panelBase = MixHex $skyMid $skySoft 0.45
  $tileBase = MixHex $skyTop $skySoft 0.50
  $brightBorder = MixHex $skyLight '#FFFFFF' 0.45
  $warmBorder = MixHex '#E3C989' $skyLight 0.25

  $isLight = (Luma $frameBase) -gt 148
  $primaryColor = if ($isLight) { [System.Drawing.Color]::FromArgb(255, 15, 60, 90) } else { [System.Drawing.Color]::White }
  $secondaryColor = if ($isLight) { [System.Drawing.Color]::FromArgb(255, 37, 90, 120) } else { [System.Drawing.Color]::FromArgb(255, 232, 244, 255) }
  $softColor = if ($isLight) { [System.Drawing.Color]::FromArgb(255, 63, 109, 134) } else { [System.Drawing.Color]::FromArgb(255, 214, 234, 247) }
  $accentColor = [System.Drawing.Color]::FromArgb(255, 255, 233, 180)

  $bitmap = New-Object System.Drawing.Bitmap($imgWidth, $imgHeight)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = 'AntiAlias'

  $bgRect = New-Object System.Drawing.RectangleF(0, 0, $imgWidth, $imgHeight)
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $bgRect,
    (HexToColor $skyTop),
    (HexToColor $skyLight),
    90
  )
  $graphics.FillRectangle($bgBrush, 0, 0, $imgWidth, $imgHeight)

  DrawPanel -g $graphics -x $pad -y $pad -w ($imgWidth - ($pad * 2)) -h 104 -fill (WithAlpha $panelBase 148) -border (WithAlpha $brightBorder 200) -bw 1
  DrawPanel -g $graphics -x $pad -y 132 -w ($imgWidth - ($pad * 2)) -h 108 -fill (WithAlpha (MixHex $skyTop $panelBase 0.35) 160) -border (WithAlpha $warmBorder 230) -bw 2

  $tileW = [int](($imgWidth - ($pad * 2) - 8) / 2)
  $tileH = 84
  $tileY1 = 246
  $tileY2 = 336

  DrawPanel -g $graphics -x $pad -y $tileY1 -w $tileW -h $tileH -fill (WithAlpha (MixHex $tileBase $skyMid 0.10) 143) -border (WithAlpha $brightBorder 190) -bw 1
  DrawPanel -g $graphics -x ($pad + $tileW + 8) -y $tileY1 -w $tileW -h $tileH -fill (WithAlpha (MixHex $tileBase $skySoft 0.25) 143) -border (WithAlpha $brightBorder 190) -bw 1
  DrawPanel -g $graphics -x $pad -y $tileY2 -w $tileW -h $tileH -fill (WithAlpha (MixHex $tileBase $skyTop 0.20) 143) -border (WithAlpha $brightBorder 190) -bw 1
  DrawPanel -g $graphics -x ($pad + $tileW + 8) -y $tileY2 -w $tileW -h $tileH -fill (WithAlpha (MixHex $tileBase $skyLight 0.15) 143) -border (WithAlpha $brightBorder 190) -bw 1

  DrawPanel -g $graphics -x $pad -y 426 -w ($imgWidth - ($pad * 2)) -h 56 -fill ([System.Drawing.Color]::FromArgb(238, 227, 201, 137)) -border ([System.Drawing.Color]::FromArgb(245, 255, 241, 207)) -bw 1

  $titleFont = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Regular)
  $boldFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
  $heroFont = New-Object System.Drawing.Font('Segoe UI', 42, [System.Drawing.FontStyle]::Bold)
  $tileNameFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
  $tileTimeFont = New-Object System.Drawing.Font('Segoe UI', 22, [System.Drawing.FontStyle]::Bold)
  $donateFont = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Bold)

  $primaryBrush = New-Object System.Drawing.SolidBrush($primaryColor)
  $secondaryBrush = New-Object System.Drawing.SolidBrush($secondaryColor)
  $softBrush = New-Object System.Drawing.SolidBrush($softColor)
  $accentBrush = New-Object System.Drawing.SolidBrush($accentColor)
  $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 228, 166))
  $donateTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 60, 46))

  $graphics.DrawString('JMN', $boldFont, $goldBrush, 30, 24)
  $graphics.DrawString('PRAYER HERO', $boldFont, $secondaryBrush, 555, 24)
  $graphics.DrawString("Jami' Masjid Noorani", $titleFont, $primaryBrush, 30, 50)
  $graphics.DrawString('Fri, 30 May 2026', $bodyFont, $secondaryBrush, 30, 80)
  $graphics.DrawString("3 Dhul Hijjah 1447  $name", $bodyFont, $accentBrush, 30, 100)

  $graphics.DrawString('Next Prayer', $bodyFont, $secondaryBrush, 30, 148)
  $graphics.DrawString('LIVE', $boldFont, $accentBrush, 616, 148)
  $graphics.DrawString('Asr', $heroFont, $primaryBrush, 30, 160)
  $graphics.DrawString('17:45', $tileTimeFont, $primaryBrush, 590, 183)
  $graphics.DrawString('Tap widget to open full homepage', $bodyFont, $softBrush, 30, 216)

  $graphics.DrawString('Fajr', $tileNameFont, $secondaryBrush, $pad + 14, $tileY1 + 10)
  $graphics.DrawString('03:12', $tileTimeFont, $primaryBrush, $pad + 14, $tileY1 + 34)
  $graphics.DrawString('Iqamah 04:30', $bodyFont, $softBrush, $pad + 14, $tileY1 + 64)

  $graphics.DrawString('Dhuhr', $tileNameFont, $secondaryBrush, $pad + $tileW + 22, $tileY1 + 10)
  $graphics.DrawString('13:10', $tileTimeFont, $primaryBrush, $pad + $tileW + 22, $tileY1 + 34)
  $graphics.DrawString('Iqamah 13:30', $bodyFont, $softBrush, $pad + $tileW + 22, $tileY1 + 64)

  $graphics.DrawString('Maghrib', $tileNameFont, $secondaryBrush, $pad + 14, $tileY2 + 10)
  $graphics.DrawString('21:24', $tileTimeFont, $primaryBrush, $pad + 14, $tileY2 + 34)
  $graphics.DrawString('Iqamah 21:24', $bodyFont, $softBrush, $pad + 14, $tileY2 + 64)

  $graphics.DrawString('Isha', $tileNameFont, $secondaryBrush, $pad + $tileW + 22, $tileY2 + 10)
  $graphics.DrawString('22:40', $tileTimeFont, $primaryBrush, $pad + $tileW + 22, $tileY2 + 34)
  $graphics.DrawString('Iqamah 23:00', $bodyFont, $softBrush, $pad + $tileW + 22, $tileY2 + 64)

  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'
  $sf.LineAlignment = 'Center'
  $donRect = New-Object System.Drawing.RectangleF($pad, 426, ($imgWidth - ($pad * 2)), 56)
  $graphics.DrawString('Donate', $donateFont, $donateTextBrush, $donRect, $sf)

  $outDir = Split-Path -Path $outputPath -Parent
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $bitmap.Dispose()
}

$variants = @(
  @{ Name = 'FAJR'; Sky = @('#1E314D', '#436287', '#8EAFCC', '#E8F1F8'); File = 'home-prayer-widget-dynamic-fajr.png' },
  @{ Name = 'DHUHR'; Sky = @('#7FB3E0', '#A7CFF0', '#DCEFFC', '#F7FCFF'); File = 'home-prayer-widget-dynamic-dhuhr.png' },
  @{ Name = 'MAGHRIB'; Sky = @('#62466E', '#A55A56', '#E38A57', '#F8C88E'); File = 'home-prayer-widget-dynamic-maghrib.png' },
  @{ Name = 'ISHA'; Sky = @('#06111F', '#0D203A', '#173152', '#264A72'); File = 'home-prayer-widget-dynamic-isha.png' }
)

foreach ($variant in $variants) {
  $path = Join-Path $PSScriptRoot ("..\assets\widget-preview\" + $variant.File)
  DrawPreview -name $variant.Name -skyHex $variant.Sky -outputPath $path
}

Get-ChildItem (Join-Path $PSScriptRoot '..\assets\widget-preview\home-prayer-widget-dynamic-*.png') |
  Select-Object Name, Length, LastWriteTime
