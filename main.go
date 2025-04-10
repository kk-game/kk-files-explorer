package main

import (
	"encoding/json"
	"fmt"
	"kk-game-upload/src"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

const sizeMB int64 = 1024 * 1024

var maxFileSize int64 = 300

var fullPathHead = ""
var baseDir = "./uploads" // 上传文件保存的根目录
var keySecret = "4WSFFM6IC4NPLG8KHP55B0Q70LUZBR0V"

type config struct {
	Port       int32  `json:"port"`
	BaseDir    string `json:"base_dir"`
	KeySecret  string `json:"secret_key"`
	FileSizeMB int64  `json:"file_size_mb"`
}

const (
	ErrOK = 0
	Err1  = 1
	Err2  = 2
	Err3  = 3
	Err4  = 4
	Err5  = 5
	Err6  = 6
	Err7  = 7
	Err8  = 8
	Err9  = 9
	Err10 = 10
	Err11 = 11
	Err12 = 12
	Err13 = 13
	Err14 = 14
	Err15 = 15
)

func main() {
	file, err := os.ReadFile("bin/conf.json")
	if err != nil {
		log.Panic("文件读取错误")
	}
	var conf config
	err = json.Unmarshal(file, &conf)
	if err != nil {
		log.Panic("文件格式错误")
	}

	baseDir = conf.BaseDir
	keySecret = conf.KeySecret
	maxFileSize = conf.FileSizeMB * sizeMB

	// 确保上传目录存在
	if err := os.MkdirAll(baseDir, os.ModePerm); err != nil {
		fmt.Println("无法创建上传目录:", err)
		return
	}

	fullPathHead, err = filepath.Abs(baseDir)
	if err != nil {
		log.Panic("无法获取路径")
	}

	fmt.Println("当前的上传文件管理路径是 " + fullPathHead)

	gin.SetMode(gin.ReleaseMode)
	engin := gin.Default()
	engin.Use(src.Cors())
	// 设置路由
	engin.StaticFile("/", "html/index.html") // 返回前端页面
	engin.Static("/static", "./html/static") //设置静态文件地址
	engin.GET("/files", listFiles)           // 列出目录中的文件
	engin.GET("/read", readFile)             //读取文件
	engin.POST("/upload", handleUpload)      // 处理文件上传
	engin.POST("/delete", deleteFile)        //删除文件
	engin.POST("/change", changName)

	ipv4 := LocalIPV4()
	fmt.Printf("服务器运行在 htt%s://%s:%d", "p", ipv4, conf.Port)

	err = engin.Run(fmt.Sprintf(":%d", conf.Port))
	if err != nil {
		log.Panic("启动服务器错误")
		return
	}
}

// listFiles 列出目录内容
func listFiles(c *gin.Context) {
	dir := c.Query("dir")
	currentPath := filepath.Join(baseDir, dir)

	fileList := make([]map[string]string, 0)
	files, err := os.ReadDir(currentPath)
	if err != nil {
		c.JSON(http.StatusOK, fileList)
		return
	}

	for _, file := range files {
		fileType := "file"
		if file.IsDir() {
			fileType = "directory" // 识别文件夹
		}

		size := ""
		// 获取文件或文件夹的详细信息
		fileInfo, err := file.Info()
		if err == nil {
			size = strconv.FormatInt(fileInfo.Size(), 10)
		}

		fileList = append(fileList, map[string]string{
			"name": file.Name(),
			"type": fileType,
			"size": size,
		})
	}

	c.JSON(http.StatusOK, fileList)
}

// handleUpload 处理文件上传
func handleUpload(c *gin.Context) {

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxFileSize)

	dir := c.Query("dir")
	currentPath := filepath.Join(baseDir, dir)

	// 确保基本上传目录存在
	if err := os.MkdirAll(currentPath, os.ModePerm); err != nil {
		c.JSON(http.StatusOK, gin.H{"code": Err7, "info": "无法创建目录"})
		return
	}

	// 获取上传的文件
	// 获取上传的文件
	form, err := c.MultipartForm()
	if err != nil {
		if err.Error() == "http: request body too large" {
			c.JSON(http.StatusOK, gin.H{"code": Err6, "info": "文件大小超过限制"})
		} else {
			c.JSON(http.StatusOK, gin.H{"code": Err5, "info": "解析文件失败"})
		}
		return
	}

	files := form.File["files"]
	paths := form.Value["paths"]

	if form.Value["secretKey"][0] != keySecret {
		c.JSON(http.StatusOK, gin.H{"code": Err4, "info": "秘钥错误"})
		return
	}

	if len(files) == 0 || len(paths) == 0 || len(files) != len(paths) {
		c.JSON(http.StatusOK, gin.H{"code": Err3, "info": "文件与路径数量不匹配"})
		return
	}

	// 处理每个上传的文件
	for i, fileHeader := range files {
		relativePath := paths[i]
		savePath := filepath.Join(currentPath, relativePath)

		// 确保文件的父级目录存在
		if err := os.MkdirAll(filepath.Dir(savePath), os.ModePerm); err != nil {
			c.JSON(http.StatusOK, gin.H{"code": Err2, "info": "无法创建文件目录"})
			return
		}

		// 保存文件
		if err := c.SaveUploadedFile(fileHeader, savePath); err != nil {
			c.JSON(http.StatusOK, gin.H{"code": Err1, "info": "无法保存文件"})
			return
		}

		fmt.Println("文件已保存:", savePath)
	}

	c.JSON(http.StatusOK, gin.H{"code": ErrOK, "info": "上传成功"})
}

func deleteFile(ctx *gin.Context) {
	var req struct {
		Path      string `json:"path"`      // 相对路径
		Type      string `json:"type"`      // "file" 或 "directory"
		SecretKey string `json:"secretKey"` // 用户提交的秘钥
	}

	// 解析 JSON 请求体
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusOK, gin.H{"code": Err9, "info": "请求参数错误"})
		return
	}

	// 校验秘钥
	if req.SecretKey != keySecret {
		ctx.JSON(http.StatusOK, gin.H{"code": Err10, "info": "秘钥错误"})
		return
	}

	// 构建目标路径
	targetPath := filepath.Join(baseDir, req.Path)

	// 检查目标路径是否在 baseDir 范围内
	fullPath, err := filepath.Abs(targetPath)
	if err != nil {
		ctx.JSON(http.StatusOK, gin.H{"code": Err12, "info": "路径解析失败"})
		return
	}

	fmt.Printf("实际的文件路径: %s", fullPath)

	if !strings.HasPrefix(fullPath, fullPathHead) {
		ctx.JSON(http.StatusOK, gin.H{"code": Err14, "info": "路径超出允许范围"})
		return
	}

	// 检查路径是否存在
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		ctx.JSON(http.StatusOK, gin.H{"code": Err15, "info": "文件或文件夹不存在"})
		return
	}

	// 执行删除操作
	if req.Type == "file" {
		err = os.Remove(targetPath) // 删除文件
	} else if req.Type == "directory" {
		err = os.RemoveAll(targetPath) // 删除文件夹
	} else {
		ctx.JSON(http.StatusOK, gin.H{"code": Err11, "info": "无效的类型参数"})
		return
	}

	if err != nil {
		ctx.JSON(http.StatusOK, gin.H{"code": Err13, "info": fmt.Sprintf("删除失败: %v", err)})
		return
	}

	// 删除成功
	ctx.JSON(http.StatusOK, gin.H{"code": ErrOK, "info": "删除成功"})
}

var localIPv4Str = "0.0.0.0"
var localIPv4Once = new(sync.Once)

func LocalIPV4() string {
	localIPv4Once.Do(func() {
		if ias, err := net.InterfaceAddrs(); err == nil {
			for _, address := range ias {
				if ipNet, ok := address.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
					if ipNet.IP.To4() != nil {
						localIPv4Str = ipNet.IP.String()
						return
					}
				}
			}
		}
	})
	return localIPv4Str
}

func readFile(ctx *gin.Context) {

}

func changName(ctx *gin.Context) {
	var req struct {
		Path      string `json:"path"`      // 相对路径
		Type      string `json:"type"`      // "file" 或 "directory"
		SecretKey string `json:"secretKey"` // 用户提交的秘钥
	}

	// 解析 JSON 请求体
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusOK, gin.H{"code": Err9, "info": "请求参数错误"})
		return
	}

	// 校验秘钥
	if req.SecretKey != keySecret {
		ctx.JSON(http.StatusOK, gin.H{"code": Err10, "info": "秘钥错误"})
		return
	}

	// 构建目标路径
	targetPath := filepath.Join(baseDir, req.Path)

	// 检查目标路径是否在 baseDir 范围内
	fullPath, err := filepath.Abs(targetPath)
	if err != nil {
		ctx.JSON(http.StatusOK, gin.H{"code": Err12, "info": "路径解析失败"})
		return
	}

	fmt.Printf("实际的文件路径: %s", fullPath)

	if !strings.HasPrefix(fullPath, fullPathHead) {
		ctx.JSON(http.StatusOK, gin.H{"code": Err14, "info": "路径超出允许范围"})
		return
	}

	// 检查路径是否存在
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		ctx.JSON(http.StatusOK, gin.H{"code": Err15, "info": "文件或文件夹不存在"})
		return
	}

	// 执行修改名称操作
	if req.Type == "file" {
		err = os.Remove(targetPath) // 删除文件
	} else if req.Type == "directory" {
		err = os.RemoveAll(targetPath) // 删除文件夹
	} else {
		ctx.JSON(http.StatusOK, gin.H{"code": Err11, "info": "无效的类型参数"})
		return
	}

	if err != nil {
		ctx.JSON(http.StatusOK, gin.H{"code": Err13, "info": fmt.Sprintf("删除失败: %v", err)})
		return
	}

	// 删除成功
	ctx.JSON(http.StatusOK, gin.H{"code": ErrOK, "info": "删除成功"})
}
