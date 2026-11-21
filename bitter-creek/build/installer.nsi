; Установщик «Биттер-Крик» (NSIS). Работает на Windows 7/8/10/11, 32 и 64 бит.
Unicode true
!include "MUI2.nsh"

!ifndef VERSION
  !define VERSION "0.1.0"
!endif
!define APPNAME "Биттер-Крик"
!define APPKEY "BitterCreek"
!define EXE "BitterCreek.exe"

Name "${APPNAME}"
OutFile "../dist/BitterCreek-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\BitterCreek"
InstallDirRegKey HKCU "Software\${APPKEY}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${APPNAME} ${VERSION}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1049 "ProductName" "${APPNAME}"
VIAddVersionKey /LANG=1049 "FileDescription" "Установщик игры ${APPNAME}"
VIAddVersionKey /LANG=1049 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1049 "LegalCopyright" "Bitter Creek"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Биттер-Крик"
!define MUI_WELCOMEPAGE_TEXT "Нуарный вестерн-детектив для одного или двух игроков.$\r$\n$\r$\n1887 год. В городке у Чёрных холмов по ночам пропадают люди. У вас семь ночей.$\r$\n$\r$\nНажмите «Далее», чтобы продолжить."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Запустить «Биттер-Крик»"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Russian"

Section "Игра" SecMain
  SectionIn RO
  ; закрыть запущенную копию, если есть
  nsExec::Exec 'taskkill /F /IM ${EXE}'
  SetOutPath "$INSTDIR"
  File /r "../dist/win-ia32-unpacked/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateShortCut "$SMPROGRAMS\${APPNAME}\Удалить игру.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\${APPKEY}" "InstallDir" "$INSTDIR"
  !define UK "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPKEY}"
  WriteRegStr HKCU "${UK}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UK}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UK}" "Publisher" "Bitter Creek Team"
  WriteRegStr HKCU "${UK}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${UK}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UK}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UK}" "NoModify" 1
  WriteRegDWORD HKCU "${UK}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM ${EXE}'
  Delete "$DESKTOP\${APPNAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APPNAME}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPKEY}"
  DeleteRegKey HKCU "Software\${APPKEY}"
SectionEnd
