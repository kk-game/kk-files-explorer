@echo off

if exist "build\" (echo build文件夹存在, 继续编译!) else (
    mkdir "build"
    echo 创建build文件夹成功
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

::macos 打包编译
::GOOS=linux GOARCH=amd64 go build -o file_manage
::GOOS=windows GOARCH=amd64 go build -o file_manage

::打包exe
if exist "build\file_manage.exe" (
	del "build\file_manage.exe"
)

@set GOOS=windows
go build -o build/file_manage.exe main.go 

start %cd%\build\
echo 编译完成 2 秒后退出...

timeout /t 2 /nobreak > nul