package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/focuswithjustin/juniper/pkg/repository"
	"github.com/spf13/cobra"
)

// Backup command flags
var (
	backupOutput     string
	backupFormat     string
	backupRawOnly    bool
	backupConvOnly   bool
	backupSwordPath  string
	backupDataPath   string
)

var backupCmd = &cobra.Command{
	Use:   "backup",
	Short: "Backup SWORD modules and converted data",
	Long: `Backup creates an archive of SWORD modules and/or converted Hugo JSON files.

Supports multiple archive formats:
  - folder: Copy to directory (no compression)
  - zip: ZIP archive
  - tar.gz / tgz: Gzipped tar archive
  - tar.xz / txz: XZ-compressed tar archive (best compression)
  - 7z: 7-Zip archive (requires 7z command)

By default, backs up both raw SWORD modules (~/.sword) and converted
Hugo data (data/bibles_auxiliary/).

Examples:
  # Create XZ-compressed backup in static/
  juniper backup -o static/bible-backup.tar.xz

  # Create ZIP backup with only raw modules
  juniper backup -o backup.zip --raw-only

  # Create folder backup with only converted data
  juniper backup -o ./backup-folder --format folder --converted-only`,
	RunE: runBackup,
}

func init() {
	backupCmd.Flags().StringVarP(&backupOutput, "output", "o", "", "output path (required)")
	backupCmd.Flags().StringVarP(&backupFormat, "format", "f", "", "format: folder, zip, tar.gz, tar.xz, 7z (auto-detected from extension)")
	backupCmd.Flags().BoolVar(&backupRawOnly, "raw-only", false, "backup only raw SWORD modules")
	backupCmd.Flags().BoolVar(&backupConvOnly, "converted-only", false, "backup only converted Hugo data")
	backupCmd.Flags().StringVar(&backupSwordPath, "sword-path", "", "SWORD directory (default: ~/.sword)")
	backupCmd.Flags().StringVar(&backupDataPath, "data-path", "", "Hugo data directory (default: ../../data)")

	backupCmd.MarkFlagRequired("output")

	rootCmd.AddCommand(backupCmd)
}

func runBackup(cmd *cobra.Command, args []string) error {
	if backupRawOnly && backupConvOnly {
		return fmt.Errorf("cannot specify both --raw-only and --converted-only")
	}

	// Determine format from flag or extension
	format := backupFormat
	if format == "" {
		format = detectFormat(backupOutput)
	}

	// Validate format
	validFormats := map[string]bool{
		"folder": true, "zip": true, "tar.gz": true, "tgz": true,
		"tar.xz": true, "txz": true, "7z": true,
	}
	if !validFormats[format] {
		return fmt.Errorf("unsupported format: %s (use: folder, zip, tar.gz, tar.xz, 7z)", format)
	}

	// Determine paths
	swordPath := backupSwordPath
	if swordPath == "" {
		swordPath = repository.DefaultSwordDir()
	}

	dataPath := backupDataPath
	if dataPath == "" {
		// Default: relative to juniper tool directory
		dataPath = "../../data"
	}

	// Collect files to backup
	var files []backupFile

	if !backupConvOnly {
		// Add raw SWORD modules
		rawFiles, err := collectSwordFiles(swordPath)
		if err != nil {
			return fmt.Errorf("collecting SWORD files: %w", err)
		}
		files = append(files, rawFiles...)
		fmt.Printf("Found %d raw SWORD files\n", len(rawFiles))
	}

	if !backupRawOnly {
		// Add converted Hugo data
		convFiles, err := collectConvertedFiles(dataPath)
		if err != nil {
			return fmt.Errorf("collecting converted files: %w", err)
		}
		files = append(files, convFiles...)
		fmt.Printf("Found %d converted data files\n", len(convFiles))
	}

	if len(files) == 0 {
		return fmt.Errorf("no files found to backup")
	}

	fmt.Printf("Total: %d files to backup\n", len(files))

	// Create backup
	start := time.Now()
	var err error

	switch format {
	case "folder":
		err = createFolderBackup(backupOutput, files)
	case "zip":
		err = createZipBackup(backupOutput, files)
	case "tar.gz", "tgz":
		err = createTarGzBackup(backupOutput, files)
	case "tar.xz", "txz":
		err = createTarXzBackup(backupOutput, files)
	case "7z":
		err = create7zBackup(backupOutput, files)
	}

	if err != nil {
		return fmt.Errorf("creating backup: %w", err)
	}

	elapsed := time.Since(start)

	// Report size
	if format != "folder" {
		if info, err := os.Stat(backupOutput); err == nil {
			fmt.Printf("Backup created: %s (%s) in %v\n", backupOutput, formatSize(info.Size()), elapsed.Round(time.Millisecond))
		}
	} else {
		fmt.Printf("Backup created: %s in %v\n", backupOutput, elapsed.Round(time.Millisecond))
	}

	return nil
}

type backupFile struct {
	SrcPath  string // Absolute path on disk
	DestPath string // Path in archive (e.g., "sword/mods.d/kjv.conf")
}

func collectSwordFiles(swordPath string) ([]backupFile, error) {
	var files []backupFile

	// Walk the SWORD directory
	err := filepath.Walk(swordPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't read
		}
		if info.IsDir() {
			return nil
		}

		// Get relative path
		relPath, err := filepath.Rel(swordPath, path)
		if err != nil {
			return nil
		}

		files = append(files, backupFile{
			SrcPath:  path,
			DestPath: filepath.Join("sword", relPath),
		})
		return nil
	})

	return files, err
}

func collectConvertedFiles(dataPath string) ([]backupFile, error) {
	var files []backupFile

	// Look for bibles_auxiliary directory and bibles.json
	auxDir := filepath.Join(dataPath, "bibles_auxiliary")
	if info, err := os.Stat(auxDir); err == nil && info.IsDir() {
		err := filepath.Walk(auxDir, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				return nil
			}

			relPath, err := filepath.Rel(dataPath, path)
			if err != nil {
				return nil
			}

			files = append(files, backupFile{
				SrcPath:  path,
				DestPath: filepath.Join("data", relPath),
			})
			return nil
		})
		if err != nil {
			return nil, err
		}
	}

	// Add bibles.json if it exists
	biblesJson := filepath.Join(dataPath, "bibles.json")
	if _, err := os.Stat(biblesJson); err == nil {
		files = append(files, backupFile{
			SrcPath:  biblesJson,
			DestPath: "data/bibles.json",
		})
	}

	return files, nil
}

func detectFormat(path string) string {
	lower := strings.ToLower(path)
	switch {
	case strings.HasSuffix(lower, ".tar.xz") || strings.HasSuffix(lower, ".txz"):
		return "tar.xz"
	case strings.HasSuffix(lower, ".tar.gz") || strings.HasSuffix(lower, ".tgz"):
		return "tar.gz"
	case strings.HasSuffix(lower, ".zip"):
		return "zip"
	case strings.HasSuffix(lower, ".7z"):
		return "7z"
	default:
		return "folder"
	}
}

func createFolderBackup(destPath string, files []backupFile) error {
	for _, f := range files {
		destFile := filepath.Join(destPath, f.DestPath)

		if err := os.MkdirAll(filepath.Dir(destFile), 0755); err != nil {
			return err
		}

		if err := copyFile(f.SrcPath, destFile); err != nil {
			return fmt.Errorf("copying %s: %w", f.SrcPath, err)
		}
	}
	return nil
}

func createZipBackup(destPath string, files []backupFile) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	f, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer f.Close()

	zw := zip.NewWriter(f)
	defer zw.Close()

	for _, file := range files {
		if err := addFileToZip(zw, file.SrcPath, file.DestPath); err != nil {
			return err
		}
	}

	return nil
}

func addFileToZip(zw *zip.Writer, srcPath, destPath string) error {
	src, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer src.Close()

	info, err := src.Stat()
	if err != nil {
		return err
	}

	header, err := zip.FileInfoHeader(info)
	if err != nil {
		return err
	}
	header.Name = destPath
	header.Method = zip.Deflate

	w, err := zw.CreateHeader(header)
	if err != nil {
		return err
	}

	_, err = io.Copy(w, src)
	return err
}

func createTarGzBackup(destPath string, files []backupFile) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	f, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer f.Close()

	gw := gzip.NewWriter(f)
	defer gw.Close()

	tw := tar.NewWriter(gw)
	defer tw.Close()

	for _, file := range files {
		if err := addFileToTar(tw, file.SrcPath, file.DestPath); err != nil {
			return err
		}
	}

	return nil
}

func createTarXzBackup(destPath string, files []backupFile) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	// Create tar first, then compress with xz
	// We'll pipe through xz command since Go doesn't have native xz support
	cmd := exec.Command("xz", "-c", "-T0") // -T0 uses all CPU cores

	outFile, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	cmd.Stdout = outFile

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("xz command not found (install xz-utils): %w", err)
	}

	tw := tar.NewWriter(stdin)

	for _, file := range files {
		if err := addFileToTar(tw, file.SrcPath, file.DestPath); err != nil {
			stdin.Close()
			cmd.Wait()
			return err
		}
	}

	tw.Close()
	stdin.Close()

	return cmd.Wait()
}

func addFileToTar(tw *tar.Writer, srcPath, destPath string) error {
	src, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer src.Close()

	info, err := src.Stat()
	if err != nil {
		return err
	}

	header, err := tar.FileInfoHeader(info, "")
	if err != nil {
		return err
	}
	header.Name = destPath

	if err := tw.WriteHeader(header); err != nil {
		return err
	}

	_, err = io.Copy(tw, src)
	return err
}

func create7zBackup(destPath string, files []backupFile) error {
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	// Create temp directory with files
	tmpDir, err := os.MkdirTemp("", "backup-7z-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmpDir)

	// Copy files to temp dir
	for _, f := range files {
		destFile := filepath.Join(tmpDir, f.DestPath)
		if err := os.MkdirAll(filepath.Dir(destFile), 0755); err != nil {
			return err
		}
		if err := copyFile(f.SrcPath, destFile); err != nil {
			return err
		}
	}

	// Remove existing archive if present
	os.Remove(destPath)

	// Run 7z
	cmd := exec.Command("7z", "a", "-mx=9", destPath, filepath.Join(tmpDir, "*"))
	cmd.Dir = tmpDir

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("7z command failed: %w\n%s", err, output)
	}

	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}

func formatSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
