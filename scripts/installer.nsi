; LearningLogo NSIS Modern UI 2 Installer Script
!include "MUI2.nsh"
!include "FileFunc.nsh"

!define PRODUCT_NAME "LearningLogo"
!ifndef PRODUCT_VERSION
  !define PRODUCT_VERSION "1.0.0"
!endif
!define PRODUCT_PUBLISHER "AAWC"
!define PRODUCT_WEB_SITE "https://varun.khaneja.org/LearningLogo/"
!define PRODUCT_DIR_REGKEY "Software\LearningLogo"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\LearningLogo"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
!ifndef OUTFILE
  OutFile "dist-release\learning-logo-windows-amd64-installer.exe"
!else
  OutFile "${OUTFILE}"
!endif

InstallDir "$PROGRAMFILES64\LearningLogo"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Installer Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\learning-logo.exe"
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite try

  !ifndef BIN_SOURCE
    File /oname=learning-logo.exe "dist-release\learning-logo.exe"
  !else
    File /oname=learning-logo.exe "${BIN_SOURCE}"
  !endif

  ; Create Desktop and Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\LearningLogo"
  CreateShortcut "$SMPROGRAMS\LearningLogo\LearningLogo.lnk" "$INSTDIR\learning-logo.exe"
  CreateShortcut "$SMPROGRAMS\LearningLogo\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  CreateShortcut "$DESKTOP\LearningLogo.lnk" "$INSTDIR\learning-logo.exe"

  ; Write Registry Keys for Add/Remove Programs
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\learning-logo.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"

  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\learning-logo.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\LearningLogo\LearningLogo.lnk"
  Delete "$SMPROGRAMS\LearningLogo\Uninstall.lnk"
  RMDir "$SMPROGRAMS\LearningLogo"
  Delete "$DESKTOP\LearningLogo.lnk"

  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
SectionEnd
