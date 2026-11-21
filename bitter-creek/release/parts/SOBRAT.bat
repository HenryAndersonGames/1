@echo off
echo Sborka ustanovshchika iz chastey...
copy /b BitterCreek-Setup.part0.bin+BitterCreek-Setup.part1.bin+BitterCreek-Setup.part2.bin+BitterCreek-Setup.part3.bin+BitterCreek-Setup.part4.bin BitterCreek-Setup-0.3.0.exe >nul
if exist BitterCreek-Setup-0.3.0.exe (echo Gotovo! & start "" BitterCreek-Setup-0.3.0.exe) else (echo Oshibka: ne vse chasti v papke.)
pause
