
$env:CODE_TESTS_PATH="$PSScriptRoot\..\client\out\test"
$env:CODE_TESTS_WORKSPACE="$PSScriptRoot\..\client\testFixture"

& node "$PSScriptRoot\..\client\out\test\runTest"