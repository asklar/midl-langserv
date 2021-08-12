
$zip = $env:GOOD_IDL_ZIP

Write-host "The ZIP ==> " $zip

if ($zip -ne $null) {
  Write-Host "OK"
} else {
  Write-Host "ERROR"
}

$bytes = gc C:\temp\goodIDLs\goodIDLs.zip -Encoding utf8
