package src

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func Unzip(srcFile, destDir string) error {
	r, err := zip.OpenReader(srcFile)
	if err != nil {
		return err
	}
	defer func(r *zip.ReadCloser) {
		_ = r.Close()
	}(r)

	for _, f := range r.File {
		fPath := filepath.Join(destDir, f.Name)

		// 防止路径穿越攻击
		if !strings.HasPrefix(fPath, filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("非法文件路径: %s", fPath)
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(fPath, os.ModePerm); err != nil {
				return err
			}
			continue
		}

		// 确保父目录存在
		if err := os.MkdirAll(filepath.Dir(fPath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			_ = outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)

		_ = outFile.Close()
		_ = rc.Close()

		if err != nil {
			return err
		}
	}

	return nil
}
