param(
    [Parameter(Mandatory = $true)][ValidateSet('key', 'type', 'down', 'up')][string]$Action,
    [Parameter(Mandatory = $false)][string]$Value = 'left'
)

$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class CstiInput
{
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public static void Tap(byte vk)
    {
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(55);
        keybd_event(vk, 0, 2, UIntPtr.Zero);
    }

    public static void Chord(byte modifier, byte vk)
    {
        keybd_event(modifier, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(35);
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(55);
        keybd_event(vk, 0, 2, UIntPtr.Zero);
        keybd_event(modifier, 0, 2, UIntPtr.Zero);
    }

    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

    public static void MouseDown() { mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero); }
    public static void MouseUp() { mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero); }
}
'@

$process = Get-Process -Name 'Card Survival - Tropical Island' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1
if ($null -eq $process) {
    Write-Output 'fail: game window not found'
    exit 1
}
[void][CstiInput]::ShowWindow($process.MainWindowHandle, 9)
[void][CstiInput]::SetForegroundWindow($process.MainWindowHandle)
Start-Sleep -Milliseconds 180

$keyMap = @{
    ' ' = 0x20; 'space' = 0x20; 'enter' = 0x0D; 'return' = 0x0D; 'escape' = 0x1B; 'esc' = 0x1B;
    'tab' = 0x09; 'backspace' = 0x08; 'up' = 0x26; 'down' = 0x28; 'left' = 0x25; 'right' = 0x27;
    'f1' = 0x70; 'f2' = 0x71; 'f3' = 0x72; 'f4' = 0x73; 'f5' = 0x74; 'f6' = 0x75;
    'delete' = 0x2E; 'home' = 0x24; 'end' = 0x23; 'pageup' = 0x21; 'pagedown' = 0x22;
}

if ($Action -eq 'type') {
    Set-Clipboard -Value $Value
    Start-Sleep -Milliseconds 120
    [CstiInput]::Chord(0x11, 0x56)   # Ctrl+V
    Start-Sleep -Milliseconds 120
    Write-Output 'ok: pasted text'
    exit 0
}

if ($Action -eq 'down') {
    [CstiInput]::MouseDown()
    Write-Output 'ok: mouse down'
    exit 0
}

if ($Action -eq 'up') {
    [CstiInput]::MouseUp()
    Write-Output 'ok: mouse up'
    exit 0
}

$lookup = $Value.Trim().ToLowerInvariant()
if ($keyMap.ContainsKey($lookup)) {
    $vk = [byte]$keyMap[$lookup]
} elseif ($lookup.Length -eq 1) {
    $ch = $lookup.ToUpperInvariant()[0]
    if ($ch -ge 'A' -and $ch -le 'Z') { $vk = [byte]([int][char]$ch) }
    elseif ($ch -ge '0' -and $ch -le '9') { $vk = [byte]([int][char]$ch) }
    else { Write-Output "fail: unsupported key '$Value'"; exit 1 }
} else {
    Write-Output "fail: unsupported key '$Value'"
    exit 1
}

[CstiInput]::Tap($vk)
Start-Sleep -Milliseconds 80
Write-Output "ok: pressed $Value"
