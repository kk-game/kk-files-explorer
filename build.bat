@echo off

if exist "build\" (echo build�ļ��д���, ��������!) else (
    mkdir "build"
    echo ����build�ļ��гɹ�
)

if exist "build\file_manage" (
	del "build\file_manage"
)

@set GO111MODULE=on
@set GOPROXY=https://goproxy.cn,direct

@set CGO_ENABLED=0
@set GOOS=linux
@set GOARCH=amd64

go build -o build/file_manage main.go

xcopy "bin\*" "build\bin\*" /Y
xcopy "static\*" "build\static\*" /Y

::macos �������
::GOOS=linux GOARCH=amd64 go build -o file_manage
::GOOS=windows GOARCH=amd64 go build -o file_manage

::���exe
if exist "build\file_manage.exe" (
	del "build\file_manage.exe"
)

@set GOOS=windows
go build -o build/file_manage.exe main.go 

start %cd%\build\
echo ������� 2 ����˳�...

timeout /t 2 /nobreak > nul