// Package main provides the CLI entry point for Juniper, a Bible module toolkit.
//
// Juniper provides diatheke-compatible Bible verse lookup as its default mode,
// plus tools for converting, extracting, and managing SWORD/e-Sword modules.
//
// Usage:
//
//	juniper [flags] <reference>          # Look up verse (diatheke mode)
//	juniper convert [flags]              # Convert modules to Hugo format
//	juniper repo [subcommand]            # Repository management
//
// Examples:
//
//	juniper -b KJV "Genesis 1:1"         # Look up verse
//	juniper -b KJV -f plain John 3:16    # Plain text output
//	juniper convert -o data/             # Convert to Hugo JSON
//	juniper repo list                    # List available modules
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/focuswithjustin/juniper/pkg/config"
	"github.com/focuswithjustin/juniper/pkg/migrate"
	"github.com/focuswithjustin/juniper/pkg/output"
	"github.com/focuswithjustin/juniper/pkg/sword"
	"github.com/spf13/cobra"
)

var (
	cfgFile string
	verbose bool
	cfg     *config.Config
)

// Diatheke-compatible flags for root command
var (
	diathekeModule  string
	diathekeFormat  string
	diathekeLocale  string
	diathekeOption  string
	diathekeVariant string
)

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "juniper [flags] <reference>",
	Short: "Bible module toolkit with diatheke-compatible verse lookup",
	Long: `Juniper is a Bible module toolkit providing diatheke-compatible verse lookup
as its default mode, plus tools for converting and managing SWORD modules.

DEFAULT MODE (diatheke-compatible):
  Query verses from SWORD modules using familiar diatheke syntax.

SUBCOMMANDS:
  convert   Convert SWORD modules to Hugo JSON format
  repo      Repository management (list, install, update)
  migrate   Copy modules from system SWORD directory

Examples:
  juniper -b KJV "Genesis 1:1"
  juniper -b KJV -f plain "John 3:16-18"
  juniper convert -o data/ -m KJV
  juniper repo list`,
	Args: cobra.ArbitraryArgs,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Skip config loading for help or version
		if cmd.Name() == "help" || cmd.Name() == "version" {
			return nil
		}

		var err error
		if cfgFile != "" {
			cfg, err = config.Load(cfgFile)
		} else {
			cfg, err = config.Load("config.yaml")
		}
		if err != nil {
			// Config is optional for diatheke mode
			cfg = config.DefaultConfig()
		}
		return nil
	},
	RunE: runDiatheke,
}

// runDiatheke executes diatheke-compatible verse lookup
func runDiatheke(cmd *cobra.Command, args []string) error {
	if len(args) == 0 {
		return cmd.Help()
	}

	if diathekeModule == "" {
		return fmt.Errorf("module required: use -b <module> (e.g., -b KJV)")
	}

	reference := strings.Join(args, " ")

	// Build diatheke command
	diathekeArgs := []string{"-b", diathekeModule}

	if diathekeFormat != "" {
		diathekeArgs = append(diathekeArgs, "-f", diathekeFormat)
	}
	if diathekeLocale != "" {
		diathekeArgs = append(diathekeArgs, "-l", diathekeLocale)
	}
	if diathekeOption != "" {
		diathekeArgs = append(diathekeArgs, "-o", diathekeOption)
	}
	if diathekeVariant != "" {
		diathekeArgs = append(diathekeArgs, "-v", diathekeVariant)
	}

	diathekeArgs = append(diathekeArgs, "-k", reference)

	// Execute diatheke
	diathekePath, err := exec.LookPath("diatheke")
	if err != nil {
		return fmt.Errorf("diatheke not found in PATH: install SWORD tools")
	}

	diathekeCmd := exec.Command(diathekePath, diathekeArgs...)
	diathekeCmd.Stdout = os.Stdout
	diathekeCmd.Stderr = os.Stderr

	return diathekeCmd.Run()
}

// Convert command
var convertCmd = &cobra.Command{
	Use:   "convert",
	Short: "Convert SWORD modules to Hugo JSON format",
	Long: `Convert processes SWORD/e-Sword modules and generates Hugo-compatible
JSON files for use with the religion extension.

Output includes:
  - bibles.json + bibles_auxiliary/<id>.json
  - commentaries.json + commentaries_auxiliary/<id>.json
  - dictionaries.json + dictionaries_auxiliary/<id>.json`,
	Example: `  # Convert all available modules
  juniper convert

  # Convert with specific output directory
  juniper convert -o data/

  # Convert specific modules only
  juniper convert -m KJV,DRC,Vulgate`,
	RunE: runConvert,
}

// Note: repoCmd and subcommands are defined in repo.go

// Migrate command
var migrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Copy SWORD modules from system directory",
	Long: `Migrate copies SWORD modules from the system SWORD directory
(typically ~/.sword) to the project's sword_data/incoming directory.

This prepares modules for conversion to Hugo format.`,
	Example: `  # Migrate all modules
  juniper migrate

  # Migrate from specific source
  juniper migrate --source ~/.sword --dest sword_data/incoming

  # Migrate specific modules only
  juniper migrate --modules KJV,MHC,StrongsGreek`,
	RunE: runMigrate,
}

// Test command
var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Test parser accuracy against CGo reference",
	Long: `Test compares the pure Go parser output against the CGo libsword
bindings to validate parsing accuracy.

Requires libsword to be installed for CGo mode.`,
	Example: `  # Test specific verses
  juniper test --verses "Genesis 1:1,John 3:16"

  # Test with CGo comparison
  juniper test --compare-cgo`,
	RunE: runTest,
}

// Watch command
var watchCmd = &cobra.Command{
	Use:   "watch",
	Short: "Watch for changes and auto-convert",
	Long: `Watch monitors the incoming directory for changes and automatically
re-converts modules when files are modified. Useful for development.`,
	RunE: runWatch,
}

// Version command
var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Juniper v1.0.0")
		fmt.Println("Bible module toolkit for SWORD/e-Sword formats")
		fmt.Println("https://github.com/focuswithjustin/juniper")
	},
}

// Command flags
var (
	// Migrate flags
	migrateSource  string
	migrateDest    string
	migrateModules []string

	// Convert flags
	convertInput       string
	convertOutput      string
	convertGranularity string
	convertModules     []string

	// Note: repo flags are defined in repo.go

	// Test flags
	testVerses     string
	testCompareCGo bool
)

func init() {
	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default: config.yaml)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")

	// Diatheke-compatible flags (on root command)
	rootCmd.Flags().StringVarP(&diathekeModule, "module", "b", "", "module name (e.g., KJV)")
	rootCmd.Flags().StringVarP(&diathekeFormat, "format", "f", "", "output format (plain, HTML, RTF, etc.)")
	rootCmd.Flags().StringVarP(&diathekeLocale, "locale", "l", "", "locale for output")
	rootCmd.Flags().StringVarP(&diathekeOption, "option", "o", "", "module option")
	rootCmd.Flags().StringVar(&diathekeVariant, "variant", "", "text variant")

	// Migrate flags
	migrateCmd.Flags().StringVar(&migrateSource, "source", "", "source SWORD directory (default: ~/.sword)")
	migrateCmd.Flags().StringVar(&migrateDest, "dest", "", "destination directory (default: sword_data/incoming)")
	migrateCmd.Flags().StringSliceVar(&migrateModules, "modules", nil, "specific modules to migrate")

	// Convert flags
	convertCmd.Flags().StringVarP(&convertInput, "input", "i", "", "input directory (default: sword_data/incoming)")
	convertCmd.Flags().StringVarP(&convertOutput, "output", "o", "", "output directory (default: data/)")
	convertCmd.Flags().StringVarP(&convertGranularity, "granularity", "g", "chapter", "page granularity: book, chapter, verse")
	convertCmd.Flags().StringSliceVarP(&convertModules, "modules", "m", nil, "specific modules to convert")

	// Note: repo flags are initialized in repo.go init()

	// Test flags
	testCmd.Flags().StringVar(&testVerses, "verses", "", "verses to test (comma-separated)")
	testCmd.Flags().BoolVar(&testCompareCGo, "compare-cgo", false, "compare against CGo libsword")

	// Build command tree
	// Note: repoCmd is added in repo.go init()
	rootCmd.AddCommand(convertCmd)
	rootCmd.AddCommand(migrateCmd)
	rootCmd.AddCommand(testCmd)
	rootCmd.AddCommand(watchCmd)
	rootCmd.AddCommand(versionCmd)
}

func runMigrate(cmd *cobra.Command, args []string) error {
	source := migrateSource
	if source == "" {
		source = cfg.SwordDir
	}

	dest := migrateDest
	if dest == "" {
		dest = cfg.OutputDir
	}

	fmt.Printf("Migrating SWORD modules from %s to %s\n", source, dest)

	migrator := migrate.NewMigrator(source, dest)
	migrator.Verbose = verbose

	result, err := migrator.Migrate(migrateModules)
	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	fmt.Printf("\nMigration complete:\n")
	fmt.Printf("  Modules found:   %d\n", result.ModulesFound)
	fmt.Printf("  Modules copied:  %d\n", result.ModulesCopied)
	fmt.Printf("  Modules skipped: %d\n", result.ModulesSkipped)

	if len(result.Errors) > 0 {
		fmt.Printf("  Errors: %d\n", len(result.Errors))
		for _, e := range result.Errors {
			fmt.Printf("    - %s\n", e)
		}
	}

	return nil
}

func runConvert(cmd *cobra.Command, args []string) error {
	input := convertInput
	if input == "" {
		input = filepath.Join(cfg.OutputDir, "incoming")
	}

	outputDir := convertOutput
	if outputDir == "" {
		outputDir = cfg.OutputDir
	}

	granularity := convertGranularity
	if granularity == "" {
		granularity = string(cfg.Granularity)
	}

	fmt.Printf("Converting SWORD modules from %s to %s (granularity: %s)\n", input, outputDir, granularity)

	// Load modules from input directory
	modules, err := sword.LoadAllModules(input)
	if err != nil {
		return fmt.Errorf("failed to load modules: %w", err)
	}

	// Filter by specified modules if provided
	if len(convertModules) > 0 {
		filterSet := make(map[string]bool)
		for _, m := range convertModules {
			filterSet[strings.ToLower(m)] = true
		}

		var filtered []*sword.Module
		for _, m := range modules {
			if filterSet[strings.ToLower(m.ID)] {
				filtered = append(filtered, m)
			}
		}
		modules = filtered
	}

	if len(modules) == 0 {
		fmt.Println("No modules found to convert.")
		return nil
	}

	fmt.Printf("Found %d modules to convert\n", len(modules))

	// Generate JSON output
	generator := output.NewGenerator(outputDir, granularity)

	// Load SPDX licenses for validation
	spdxPath := filepath.Join(filepath.Dir(outputDir), "spdx_licenses.json")
	if err := generator.LoadSPDXLicenses(spdxPath); err != nil {
		spdxPath = filepath.Join(outputDir, "spdx_licenses.json")
		if err2 := generator.LoadSPDXLicenses(spdxPath); err2 != nil {
			fmt.Printf("Warning: could not load SPDX licenses for validation: %v\n", err)
		}
	}

	if err := generator.GenerateFromModules(modules, input); err != nil {
		return fmt.Errorf("failed to generate output: %w", err)
	}

	fmt.Printf("\nConversion complete:\n")
	fmt.Printf("  Output: %s/bibles.json\n", outputDir)
	fmt.Printf("  Output: %s/bibles_auxiliary/\n", outputDir)

	return nil
}

// Note: runRepoList, runRepoInstall, etc. are defined in repo.go

func runWatch(cmd *cobra.Command, args []string) error {
	fmt.Println("Watch mode not yet implemented.")
	return nil
}

func runTest(cmd *cobra.Command, args []string) error {
	if testCompareCGo {
		fmt.Println("CGo comparison not yet implemented.")
		return nil
	}

	fmt.Println("Parser testing not yet implemented.")
	return nil
}
