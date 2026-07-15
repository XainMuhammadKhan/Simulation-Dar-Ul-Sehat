$files = @(
  'src/Components/Queuing.jsx',
  'src/Components/Simulation.jsx',
  'src/Components/MMC.jsx',
  'src/Components/MGC.jsx',
  'src/Components/GGC.jsx'
)

foreach ($f in $files) {
  $content = Get-Content $f -Raw
  $content = $content -replace '#6D9197','#2C80D3'
  $content = $content -replace '#2F575D','#0C3E72'
  $content = $content -replace '#28363D','#091d3a'
  $content = $content -replace '#f3f7f8','#f0f5fa'
  $content = $content -replace '#e8f0f2','#e1ecf7'
  Set-Content $f $content -NoNewline
  Write-Host "Updated: $f"
}
