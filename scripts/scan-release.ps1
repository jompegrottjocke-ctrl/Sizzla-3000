$ErrorActionPreference = 'Stop'
$report = Join-Path $env:RUNNER_TEMP 'sizzla-security-report'
New-Item -ItemType Directory -Force -Path $report | Out-Null
$file = Join-Path $report 'Sizzla.3000.Setup.0.5.3.exe'
$expected = '02955729c976279af31c1ed213bf2c06b50a5ef80cc7893281426303b2d926a9'
try {
    Invoke-WebRequest -Uri 'https://github.com/jompegrottjocke-ctrl/Sizzla-3000/releases/download/v0.5.3/Sizzla.3000.Setup.0.5.3.exe' -OutFile $file
    $actual = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
    "Release: v0.5.3`nSHA256: $actual`nExpected: $expected" | Set-Content (Join-Path $report 'identity.txt')
    if ($actual -ne $expected) { throw 'Published installer hash does not match the pinned release hash.' }
    Get-AuthenticodeSignature -LiteralPath $file | Select-Object Status, StatusMessage, Path | Format-List | Out-String | Set-Content (Join-Path $report 'signature.txt')
    $scanner = Get-ChildItem "$env:ProgramData\Microsoft\Windows Defender\Platform\*\MpCmdRun.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
    if (-not $scanner) { $scanner = "$env:ProgramFiles\Windows Defender\MpCmdRun.exe" }
    if (-not (Test-Path -LiteralPath $scanner)) { throw 'Microsoft Defender scanner is unavailable on this runner; no antivirus verdict can be recorded.' }
    & $scanner -SignatureUpdate 2>&1 | Tee-Object -FilePath (Join-Path $report 'definition-update.txt')
    if ($LASTEXITCODE -ne 0) { throw "Defender definition update failed ($LASTEXITCODE); no current antivirus verdict can be recorded." }
    $status = Get-MpComputerStatus
    $status | Select-Object AMServiceEnabled, AntivirusEnabled, AntivirusSignatureVersion, AntivirusSignatureLastUpdated, AMEngineVersion | Format-List | Out-String | Set-Content (Join-Path $report 'engine.txt')
    if (-not $status.AMServiceEnabled -or -not $status.AntivirusEnabled) { throw 'Defender is disabled on this runner; no antivirus verdict can be recorded.' }
    # Scan the downloaded bytes without executing the installer or remediating files.
    & $scanner -Scan -ScanType 3 -File $file -DisableRemediation 2>&1 | Tee-Object -FilePath (Join-Path $report 'scan.txt')
    $scanExit = $LASTEXITCODE
    "Defender scan exit code: $scanExit" | Add-Content (Join-Path $report 'scan.txt')
    if ($scanExit -ne 0) { throw "Defender scan did not pass ($scanExit). Inspect scan.txt; this can indicate a detection or scanner error." }
    'Microsoft Defender reported no detection in this pinned installer. This does not establish a Google Safe Browsing verdict or guarantee that the file is safe.' | Set-Content (Join-Path $report 'result.txt')
} catch {
    $_.Exception.Message | Set-Content (Join-Path $report 'error.txt')
    throw
} finally {
    # Retain text evidence, not another copy of the executable under investigation.
    Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
}
