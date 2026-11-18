param(
    [Parameter(Mandatory = $true)][int]$X1,
    [Parameter(Mandatory = $true)][int]$Y1,
    [Parameter(Mandatory = $true)][int]$X2,
    [Parameter(Mandatory = $true)][int]$Y2,
    [int]$HoldMs = 1200,
    [int]$Steps = 30
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class CstiDrag
{
    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT
    {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT
    {
        public uint type;
        public MOUSEINPUT mi;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint count, INPUT[] inputs, int size);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);

    private static int screenW = 2560;
    private static int screenH = 1600;

    public static void SetScreen(int w, int h) { screenW = w; screenH = h; }

    private static void Send(uint flag, int x, int y)
    {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = 0;
        inputs[0].mi.dx = x;
        inputs[0].mi.dy = y;
        inputs[0].mi.dwFlags = flag;
        inputs[0].mi.time = 0;
        inputs[0].mi.dwExtraInfo = IntPtr.Zero;
        SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void MoveAbs(int x, int y)
    {
        int ax = (int)Math.Round(x * 65535.0 / (screenW - 1));
        int ay = (int)Math.Round(y * 65535.0 / (screenH - 1));
        Send(0x0001 | 0x8000, ax, ay);
    }

    public static void Down() { Send(0x0002, 0, 0); }
    public static void Up() { Send(0x0004, 0, 0); }
}
'@

[void][CstiDrag]::SetThreadDpiAwarenessContext([IntPtr](-4))

$process = Get-Process -Name 'Card Survival - Tropical Island' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1
if ($null -eq $process) {
    Write-Output 'fail: game window not found'
    exit 1
}

[void][CstiDrag]::ShowWindow($process.MainWindowHandle, 9)
[void][CstiDrag]::SetForegroundWindow($process.MainWindowHandle)
Start-Sleep -Milliseconds 250

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
[CstiDrag]::SetScreen($bounds.Width, $bounds.Height)

[CstiDrag]::MoveAbs($X1, $Y1)
Start-Sleep -Milliseconds 220
[CstiDrag]::Down()
Start-Sleep -Milliseconds 220

for ($i = 1; $i -le $Steps; $i++) {
    $t = [double]$i / $Steps
    $x = [int][Math]::Round($X1 + ($X2 - $X1) * $t)
    $y = [int][Math]::Round($Y1 + ($Y2 - $Y1) * $t)
    [CstiDrag]::MoveAbs($x, $y)
    Start-Sleep -Milliseconds 24
}

[CstiDrag]::MoveAbs($X2, $Y2)
Start-Sleep -Milliseconds $HoldMs
[CstiDrag]::Up()
Start-Sleep -Milliseconds 200

Write-Output "ok: held drag $X1,$Y1 -> $X2,$Y2 for $HoldMs ms on $($bounds.Width)x$($bounds.Height)"
