package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/focuswithjustin/juniper/pkg/repository"
	"github.com/spf13/cobra"
)

// Repo command flags
var (
	repoSwordPath   string
	repoBatchWorkers int
)

var repoCmd = &cobra.Command{
	Use:   "repo",
	Short: "Manage SWORD module repositories",
	Long: `Repository management commands for SWORD modules.

This is a native Go replacement for the SWORD installmgr tool.
It supports listing, installing, and managing SWORD modules from
remote repositories like CrossWire.

Examples:
  # List available remote sources
  juniper repo list-sources

  # Refresh module index from a source
  juniper repo refresh CrossWire

  # List available modules from a source
  juniper repo list CrossWire

  # Install a module
  juniper repo install CrossWire KJV

  # List installed modules
  juniper repo installed

  # Uninstall a module
  juniper repo uninstall KJV`,
}

var repoListSourcesCmd = &cobra.Command{
	Use:   "list-sources",
	Short: "List available remote sources",
	Long: `Lists all configured remote SWORD module sources.

This is equivalent to: installmgr -s`,
	RunE: runRepoListSources,
}

var repoRefreshCmd = &cobra.Command{
	Use:   "refresh <source>",
	Short: "Refresh module index from a source",
	Long: `Downloads the latest module index from a remote source.

This is equivalent to: installmgr -r <source>`,
	Args: cobra.ExactArgs(1),
	RunE: runRepoRefresh,
}

var repoListCmd = &cobra.Command{
	Use:   "list <source>",
	Short: "List available modules from a source",
	Long: `Lists all modules available from a remote source.

This is equivalent to: installmgr -rl <source>`,
	Args: cobra.ExactArgs(1),
	RunE: runRepoList,
}

var repoInstallCmd = &cobra.Command{
	Use:   "install <source> <module>",
	Short: "Install a module from a source",
	Long: `Downloads and installs a module from a remote source.

This is equivalent to: installmgr -ri <source> <module>`,
	Args: cobra.ExactArgs(2),
	RunE: runRepoInstall,
}

var repoInstalledCmd = &cobra.Command{
	Use:   "installed",
	Short: "List installed modules",
	Long: `Lists all locally installed SWORD modules.

This is equivalent to: installmgr -l`,
	RunE: runRepoInstalled,
}

var repoUninstallCmd = &cobra.Command{
	Use:   "uninstall <module>",
	Short: "Uninstall a module",
	Long: `Removes an installed module from the local SWORD directory.

This is equivalent to: installmgr -u <module>`,
	Args: cobra.ExactArgs(1),
	RunE: runRepoUninstall,
}

var repoVerifyCmd = &cobra.Command{
	Use:   "verify [module]",
	Short: "Verify installed module integrity",
	Long: `Verifies installed modules without redownloading.

Checks:
1. Conf file exists
2. Data directory exists with files
3. Size matches InstallSize (if specified in metadata)

If no module is specified, verifies all installed modules.`,
	Args: cobra.MaximumNArgs(1),
	RunE: runRepoVerify,
}

var repoInstallAllCmd = &cobra.Command{
	Use:   "install-all <source>",
	Short: "Install all modules from a source in parallel",
	Long: `Downloads and installs all modules from a remote source using parallel workers.

This is much faster than installing modules one at a time.
By default uses 4 parallel workers. Use --workers to adjust.

Already installed modules are automatically skipped.

Examples:
  # Install all modules from CrossWire with 4 workers
  juniper repo install-all CrossWire

  # Install with 8 parallel workers
  juniper repo install-all CrossWire --workers 8`,
	Args: cobra.ExactArgs(1),
	RunE: runRepoInstallAll,
}

var repoInstallMegaCmd = &cobra.Command{
	Use:   "install-mega",
	Short: "Install all modules from ALL sources in parallel",
	Long: `Downloads and installs all modules from all 11 remote sources using parallel workers.

This is much faster than installing modules one at a time.
By default uses 4 parallel workers. Use --workers to adjust.

Already installed modules are automatically skipped.
Modules already downloaded from one source won't be re-downloaded from another.

Examples:
  # Install from all sources with 4 workers
  juniper repo install-mega

  # Install with 8 parallel workers
  juniper repo install-mega --workers 8`,
	RunE: runRepoInstallMega,
}

func init() {
	// Add repo command flags
	repoCmd.PersistentFlags().StringVar(&repoSwordPath, "sword-path", "", "SWORD directory path (default: ~/.sword)")

	// Add install-all and install-mega specific flags
	repoInstallAllCmd.Flags().IntVarP(&repoBatchWorkers, "workers", "w", 4, "Number of parallel download workers")
	repoInstallMegaCmd.Flags().IntVarP(&repoBatchWorkers, "workers", "w", 4, "Number of parallel download workers")

	// Add subcommands
	repoCmd.AddCommand(repoListSourcesCmd)
	repoCmd.AddCommand(repoRefreshCmd)
	repoCmd.AddCommand(repoListCmd)
	repoCmd.AddCommand(repoInstallCmd)
	repoCmd.AddCommand(repoInstallAllCmd)
	repoCmd.AddCommand(repoInstallMegaCmd)
	repoCmd.AddCommand(repoInstalledCmd)
	repoCmd.AddCommand(repoUninstallCmd)
	repoCmd.AddCommand(repoVerifyCmd)

	// Add repo to root
	rootCmd.AddCommand(repoCmd)
}

func getSwordPath() string {
	if repoSwordPath != "" {
		return repoSwordPath
	}
	return repository.DefaultSwordDir()
}

func runRepoListSources(cmd *cobra.Command, args []string) error {
	sources := repository.DefaultSources()

	// Find max name length for alignment
	maxLen := 0
	for _, s := range sources {
		if len(s.Name) > maxLen {
			maxLen = len(s.Name)
		}
	}

	fmt.Printf("%-*s  %-4s  %-25s  %s\n", maxLen, "SOURCE", "TYPE", "HOST", "DIRECTORY")
	fmt.Printf("%s\n", strings.Repeat("-", maxLen+4+25+40))

	for _, s := range sources {
		fmt.Printf("%-*s  %-4s  %-25s  %s\n", maxLen, s.Name, s.Type, s.Host, s.Directory)
	}

	return nil
}

func runRepoRefresh(cmd *cobra.Command, args []string) error {
	sourceName := args[0]

	source, found := repository.GetSource(sourceName)
	if !found {
		return fmt.Errorf("source not found: %s", sourceName)
	}

	fmt.Printf("Refreshing %s... ", sourceName)

	client, err := repository.NewClient(repository.ClientOptions{
		Timeout: 60 * time.Second,
	})
	if err != nil {
		return fmt.Errorf("failed to create client: %w", err)
	}

	localCfg := repository.NewLocalConfig(getSwordPath())
	if err := localCfg.EnsureDirectories(); err != nil {
		return fmt.Errorf("failed to create directories: %w", err)
	}

	installer := repository.NewInstaller(localCfg, client)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	modules, err := installer.RefreshSource(ctx, source)
	if err != nil {
		return fmt.Errorf("failed to refresh source: %w", err)
	}

	fmt.Printf("done (%d modules)\n", len(modules))

	return nil
}

func runRepoList(cmd *cobra.Command, args []string) error {
	sourceName := args[0]

	source, found := repository.GetSource(sourceName)
	if !found {
		return fmt.Errorf("source not found: %s", sourceName)
	}

	client, err := repository.NewClient(repository.ClientOptions{
		Timeout: 60 * time.Second,
	})
	if err != nil {
		return fmt.Errorf("failed to create client: %w", err)
	}

	localCfg := repository.NewLocalConfig(getSwordPath())
	installer := repository.NewInstaller(localCfg, client)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	modules, err := installer.ListAvailable(ctx, source)
	if err != nil {
		return fmt.Errorf("failed to list modules: %w", err)
	}

	if len(modules) == 0 {
		fmt.Printf("No modules available from %s (try: repo refresh %s)\n", sourceName, sourceName)
		return nil
	}

	// Find max lengths for alignment
	maxID, maxVer, maxLang := 0, 0, 0
	for _, m := range modules {
		if len(m.ID) > maxID {
			maxID = len(m.ID)
		}
		if len(m.Version) > maxVer {
			maxVer = len(m.Version)
		}
		if len(m.Language) > maxLang {
			maxLang = len(m.Language)
		}
	}
	if maxVer < 7 {
		maxVer = 7
	}
	if maxLang < 4 {
		maxLang = 4
	}

	fmt.Printf("Available from %s (%d modules):\n\n", sourceName, len(modules))
	fmt.Printf("%-*s  %-*s  %-*s  %s\n", maxID, "MODULE", maxVer, "VERSION", maxLang, "LANG", "DESCRIPTION")
	fmt.Printf("%s\n", strings.Repeat("-", maxID+maxVer+maxLang+50))

	for _, m := range modules {
		version := m.Version
		if version == "" {
			version = "-"
		}
		lang := m.Language
		if lang == "" {
			lang = "-"
		}
		desc := m.Description
		if desc == "" {
			desc = m.ID
		}
		fmt.Printf("%-*s  %-*s  %-*s  %s\n", maxID, m.ID, maxVer, version, maxLang, lang, desc)
	}

	return nil
}

func runRepoInstall(cmd *cobra.Command, args []string) error {
	sourceName := args[0]
	moduleName := args[1]

	source, found := repository.GetSource(sourceName)
	if !found {
		return fmt.Errorf("source not found: %s", sourceName)
	}

	client, err := repository.NewClient(repository.ClientOptions{
		Timeout: 10 * time.Minute,
	})
	if err != nil {
		return fmt.Errorf("failed to create client: %w", err)
	}

	localCfg := repository.NewLocalConfig(getSwordPath())
	if err := localCfg.EnsureDirectories(); err != nil {
		return fmt.Errorf("failed to create directories: %w", err)
	}

	installer := repository.NewInstaller(localCfg, client)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	// First get the list of available modules to find the one we want
	fmt.Printf("Installing %s from %s... ", moduleName, sourceName)

	modules, err := installer.ListAvailable(ctx, source)
	if err != nil {
		return fmt.Errorf("failed to list modules: %w", err)
	}

	var targetModule *repository.ModuleInfo
	for i := range modules {
		if strings.EqualFold(modules[i].ID, moduleName) {
			targetModule = &modules[i]
			break
		}
	}

	if targetModule == nil {
		fmt.Println("not found")
		return fmt.Errorf("module not found: %s", moduleName)
	}

	if err := installer.Install(ctx, source, *targetModule); err != nil {
		if errors.Is(err, repository.ErrPackageNotAvailable) {
			fmt.Println("unavailable (no package on server)")
			return nil // Not a fatal error - module just doesn't have a package
		}
		fmt.Println("failed")
		return fmt.Errorf("failed to install module: %w", err)
	}

	fmt.Println("done")

	return nil
}

func runRepoInstalled(cmd *cobra.Command, args []string) error {
	localCfg, err := repository.LoadLocalConfig(getSwordPath())
	if err != nil {
		// If directory doesn't exist, just show empty list
		if os.IsNotExist(err) {
			fmt.Println("No modules installed")
			return nil
		}
		return fmt.Errorf("failed to load config: %w", err)
	}

	modules, err := localCfg.ListInstalledModules()
	if err != nil {
		return fmt.Errorf("failed to list modules: %w", err)
	}

	if len(modules) == 0 {
		fmt.Println("No modules installed")
		return nil
	}

	fmt.Printf("Installed modules (%d):\n\n", len(modules))

	// Print header
	fmt.Printf("%-20s  %-10s  %-6s  %-25s  %s\n",
		"MODULE", "VERSION", "LANG", "LICENSE", "DESCRIPTION")
	fmt.Println(strings.Repeat("-", 100))

	for _, m := range modules {
		version := m.Version
		if version == "" {
			version = "-"
		}
		lang := m.Language
		if lang == "" {
			lang = "-"
		}
		license := m.LicenseSPDX()
		if license == "" {
			license = "-"
		}
		desc := m.Description
		if desc == "" {
			desc = m.ID
		}

		fmt.Printf("%-20s  %-10s  %-6s  %-25s  %s\n",
			m.ID, version, lang, license, desc)
	}

	return nil
}

func runRepoUninstall(cmd *cobra.Command, args []string) error {
	moduleName := args[0]

	localCfg, err := repository.LoadLocalConfig(getSwordPath())
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	client, _ := repository.NewClient(repository.ClientOptions{})
	installer := repository.NewInstaller(localCfg, client)

	fmt.Printf("Uninstalling %s... ", moduleName)

	if err := installer.Uninstall(moduleName); err != nil {
		fmt.Println("failed")
		return fmt.Errorf("failed to uninstall module: %w", err)
	}

	fmt.Println("done")

	return nil
}

func runRepoVerify(cmd *cobra.Command, args []string) error {
	if verbose {
		fmt.Println("[verbose] Loading local SWORD config...")
	}
	localCfg, err := repository.LoadLocalConfig(getSwordPath())
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Println("No modules installed")
			return nil
		}
		return fmt.Errorf("failed to load config: %w", err)
	}
	if verbose {
		fmt.Printf("[verbose] SWORD path: %s\n", getSwordPath())
	}

	client, _ := repository.NewClient(repository.ClientOptions{})
	installer := repository.NewInstaller(localCfg, client)
	installer.Verbose = verbose

	var results []repository.ModuleVerification

	if len(args) > 0 {
		// Verify single module
		if verbose {
			fmt.Printf("[verbose] Verifying single module: %s\n", args[0])
		}
		results = append(results, installer.VerifyModule(args[0]))
	} else {
		// Verify all modules
		if verbose {
			fmt.Println("[verbose] Fetching list of installed modules...")
		}
		installed, listErr := localCfg.ListInstalledModules()
		if listErr != nil {
			return fmt.Errorf("failed to list modules: %w", listErr)
		}

		total := len(installed)
		fmt.Printf("Verifying %d modules...\n", total)

		for i, mod := range installed {
			if verbose {
				fmt.Printf("[verbose] Verifying module %d/%d: %s\n", i+1, total, mod.ID)
			} else {
				// Show progress indicator
				fmt.Printf("\r[%d/%d] Verifying %s...", i+1, total, mod.ID)
			}
			results = append(results, installer.VerifyModule(mod.ID))
		}
		if !verbose {
			fmt.Println() // Clear progress line
		}
	}

	if len(results) == 0 {
		fmt.Println("No modules installed")
		return nil
	}

	// Find max lengths for alignment
	maxID := 0
	for _, r := range results {
		if len(r.ModuleID) > maxID {
			maxID = len(r.ModuleID)
		}
	}

	fmt.Printf("%-*s  %-6s  %-4s  %-5s  %-12s  %-12s  %s\n", maxID, "MODULE", "STATUS", "CONF", "DATA", "EXPECTED", "ACTUAL", "NOTES")
	fmt.Printf("%s\n", strings.Repeat("-", maxID+6+4+5+12+12+30))

	validCount := 0
	invalidCount := 0

	for _, r := range results {
		status := "OK"
		notes := ""

		if !r.Installed {
			status = "FAIL"
			notes = "not installed"
		} else if !r.DataExists {
			status = "FAIL"
			notes = "missing data"
		} else if r.ExpectedSize > 0 && !r.SizeMatch {
			status = "WARN"
			notes = "size mismatch"
		}

		if r.Error != "" {
			status = "ERR"
			notes = r.Error
		}

		if r.IsValid() {
			validCount++
		} else {
			invalidCount++
		}

		conf := "-"
		if r.Installed {
			conf = "✓"
		}
		data := "-"
		if r.DataExists {
			data = "✓"
		}

		expected := "-"
		if r.ExpectedSize > 0 {
			expected = formatBytes(r.ExpectedSize)
		}
		actual := "-"
		if r.ActualSize > 0 {
			actual = formatBytes(r.ActualSize)
		}

		fmt.Printf("%-*s  %-6s  %-4s  %-5s  %-12s  %-12s  %s\n",
			maxID, r.ModuleID, status, conf, data, expected, actual, notes)
	}

	fmt.Println()
	fmt.Printf("Summary: %d valid, %d issues\n", validCount, invalidCount)

	if invalidCount > 0 {
		return fmt.Errorf("%d modules have issues", invalidCount)
	}

	return nil
}

func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

func runRepoInstallAll(cmd *cobra.Command, args []string) error {
	sourceName := args[0]

	source, found := repository.GetSource(sourceName)
	if !found {
		return fmt.Errorf("source not found: %s", sourceName)
	}

	client, err := repository.NewClient(repository.ClientOptions{
		Timeout: 10 * time.Minute,
	})
	if err != nil {
		return fmt.Errorf("failed to create client: %w", err)
	}

	localCfg := repository.NewLocalConfig(getSwordPath())
	if err := localCfg.EnsureDirectories(); err != nil {
		return fmt.Errorf("failed to create directories: %w", err)
	}

	installer := repository.NewInstaller(localCfg, client)

	// Use a longer timeout for batch operations
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
	defer cancel()

	// Get available modules
	fmt.Printf("Fetching module list from %s...\n", sourceName)
	modules, err := installer.ListAvailable(ctx, source)
	if err != nil {
		return fmt.Errorf("failed to list modules: %w", err)
	}

	if len(modules) == 0 {
		fmt.Println("No modules available")
		return nil
	}

	fmt.Printf("Installing %d modules using %d parallel workers...\n\n", len(modules), repoBatchWorkers)

	// Track counts
	doneCount := 0
	skippedCount := 0
	unavailableCount := 0
	failedCount := 0
	completed := 0

	// Install with progress callback
	results := installer.InstallBatch(ctx, source, modules, repository.BatchInstallOptions{
		Workers:       repoBatchWorkers,
		SkipInstalled: true,
		OnResult: func(result repository.InstallResult) {
			completed++
			switch result.Status {
			case "done":
				doneCount++
				fmt.Printf("[%d/%d] %s... done\n", completed, len(modules), result.Module.ID)
			case "skipped":
				skippedCount++
				fmt.Printf("[%d/%d] %s... skipped (already installed)\n", completed, len(modules), result.Module.ID)
			case "unavailable":
				unavailableCount++
				fmt.Printf("[%d/%d] %s... unavailable\n", completed, len(modules), result.Module.ID)
			case "failed":
				failedCount++
				fmt.Printf("[%d/%d] %s... failed: %v\n", completed, len(modules), result.Module.ID, result.Error)
			}
		},
	})

	_ = results // Results already processed via callback

	fmt.Printf("\n%s: %d installed, %d skipped, %d unavailable, %d failed\n",
		sourceName, doneCount, skippedCount, unavailableCount, failedCount)

	return nil
}

func runRepoInstallMega(cmd *cobra.Command, args []string) error {
	client, err := repository.NewClient(repository.ClientOptions{
		Timeout: 10 * time.Minute,
	})
	if err != nil {
		return fmt.Errorf("failed to create client: %w", err)
	}

	localCfg := repository.NewLocalConfig(getSwordPath())
	if err := localCfg.EnsureDirectories(); err != nil {
		return fmt.Errorf("failed to create directories: %w", err)
	}

	installer := repository.NewInstaller(localCfg, client)

	// Use a longer timeout for mega operations
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Hour)
	defer cancel()

	sources := repository.DefaultSources()

	fmt.Printf("=== MEGA DOWNLOAD: All modules from %d sources ===\n", len(sources))
	fmt.Printf("Using %d parallel workers\n\n", repoBatchWorkers)

	// Track totals
	totalDone := 0
	totalSkipped := 0
	totalUnavailable := 0
	totalFailed := 0

	// Track already installed/downloaded to avoid duplicates across sources
	installedSet := make(map[string]bool)
	if installed, err := localCfg.ListInstalledModules(); err == nil {
		for _, m := range installed {
			installedSet[strings.ToUpper(m.ID)] = true
		}
	}

	for _, source := range sources {
		fmt.Printf("=== %s ===\n", source.Name)

		// Get available modules
		modules, err := installer.ListAvailable(ctx, source)
		if err != nil {
			fmt.Printf("Failed to fetch module list: %v\n\n", err)
			continue
		}

		if len(modules) == 0 {
			fmt.Println("No modules available")
			continue
		}

		// Filter out already installed/downloaded
		var toInstall []repository.ModuleInfo
		preSkipped := 0
		for _, m := range modules {
			if installedSet[strings.ToUpper(m.ID)] {
				preSkipped++
			} else {
				toInstall = append(toInstall, m)
			}
		}

		if len(toInstall) == 0 {
			fmt.Printf("All %d modules already installed\n\n", len(modules))
			totalSkipped += preSkipped
			continue
		}

		fmt.Printf("Installing %d modules (%d already installed)...\n", len(toInstall), preSkipped)

		// Track counts for this source
		doneCount := 0
		skippedCount := preSkipped
		unavailableCount := 0
		failedCount := 0
		completed := 0

		// Install with progress callback
		installer.InstallBatch(ctx, source, toInstall, repository.BatchInstallOptions{
			Workers:       repoBatchWorkers,
			SkipInstalled: false, // We already filtered
			OnResult: func(result repository.InstallResult) {
				completed++
				switch result.Status {
				case "done":
					doneCount++
					installedSet[strings.ToUpper(result.Module.ID)] = true
					fmt.Printf("[%d/%d] %s... done\n", completed, len(toInstall), result.Module.ID)
				case "skipped":
					skippedCount++
					fmt.Printf("[%d/%d] %s... skipped\n", completed, len(toInstall), result.Module.ID)
				case "unavailable":
					unavailableCount++
					fmt.Printf("[%d/%d] %s... unavailable\n", completed, len(toInstall), result.Module.ID)
				case "failed":
					failedCount++
					fmt.Printf("[%d/%d] %s... failed\n", completed, len(toInstall), result.Module.ID)
				}
			},
		})

		fmt.Printf("%s: %d installed, %d skipped, %d unavailable, %d failed\n\n",
			source.Name, doneCount, skippedCount, unavailableCount, failedCount)

		totalDone += doneCount
		totalSkipped += skippedCount
		totalUnavailable += unavailableCount
		totalFailed += failedCount
	}

	fmt.Println("=== SUMMARY ===")
	fmt.Printf("Total: %d installed, %d skipped, %d unavailable, %d failed\n",
		totalDone, totalSkipped, totalUnavailable, totalFailed)

	return nil
}
