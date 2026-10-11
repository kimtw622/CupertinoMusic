param([Parameter(Mandatory)][string]$Out, [int]$Rows = 0)
# Spotify 메인 창만 PrintWindow 로 캡처한다(다른 창은 찍지 않는다). $Rows > 0 이면 위쪽 그만큼만 저장.
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class CapW {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
}
'@
[void][CapW]::SetThreadDpiAwarenessContext([IntPtr](-4))
$p = Get-Process Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { throw 'Spotify 메인 창을 찾지 못했습니다.' }
$h = $p.MainWindowHandle
if ([CapW]::IsIconic($h)) { throw 'Spotify 창이 최소화되어 있습니다.' }
$r = New-Object CapW+RECT
[void][CapW]::GetWindowRect($h, [ref]$r)
$w = $r.R - $r.L; $ht = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [CapW]::PrintWindow($h, $hdc, 2)
$g.ReleaseHdc($hdc); $g.Dispose()
if ($Rows -gt 0 -and $Rows -lt $ht) {
  $crop = $bmp.Clone((New-Object System.Drawing.Rectangle 0, 0, $w, $Rows), $bmp.PixelFormat)
  $bmp.Dispose(); $bmp = $crop
}
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
"ok=$ok size=${w}x${ht} dpi=$([CapW]::GetDpiForWindow($h)) title=$($p.MainWindowTitle) -> $Out"
