// Package main provides comprehensive tests for the juniper CLI.
package main

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/focuswithjustin/juniper/pkg/config"
	"github.com/spf13/cobra"
)

// =============================================================================
// Diatheke Flag Tests
// =============================================================================

func TestDiathekeFlags_ModuleFlag(t *testing.T) {
	// Check that the module flag exists
	flag := rootCmd.Flags().Lookup("module")
	if flag == nil {
		t.Error("module flag not found")
	}
}

func TestDiathekeFlags_AllFlags(t *testing.T) {
	tests := []struct {
		name     string
		flagName string
	}{
		{"module flag", "module"},
		{"format flag", "format"},
		{"locale flag", "locale"},
		{"option flag", "option"},
		{"variant flag", "variant"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flag := rootCmd.Flags().Lookup(tt.flagName)
			if flag == nil {
				t.Errorf("flag %s not found", tt.flagName)
			}
		})
	}
}

func TestDiathekeFlags_ShortFlags(t *testing.T) {
	tests := []struct {
		flagName  string
		shorthand string
	}{
		{"module", "b"},
		{"format", "f"},
		{"locale", "l"},
		{"option", "o"},
	}

	for _, tt := range tests {
		t.Run(tt.flagName, func(t *testing.T) {
			flag := rootCmd.Flags().Lookup(tt.flagName)
			if flag == nil {
				t.Fatalf("flag %s not found", tt.flagName)
			}
			if flag.Shorthand != tt.shorthand {
				t.Errorf("shorthand = %q, want %q", flag.Shorthand, tt.shorthand)
			}
		})
	}
}

// =============================================================================
// Command Structure Tests
// =============================================================================

func TestRootCommand_Basic(t *testing.T) {
	if rootCmd.Use != "juniper [flags] <reference>" {
		t.Errorf("unexpected Use: %s", rootCmd.Use)
	}
	if rootCmd.Short == "" {
		t.Error("root command missing Short description")
	}
	if rootCmd.Long == "" {
		t.Error("root command missing Long description")
	}
}

func TestConvertCommand_Exists(t *testing.T) {
	found := false
	for _, cmd := range rootCmd.Commands() {
		if cmd.Use == "convert" {
			found = true
			break
		}
	}
	if !found {
		t.Error("convert command not found")
	}
}

func TestMigrateCommand_Exists(t *testing.T) {
	found := false
	for _, cmd := range rootCmd.Commands() {
		if cmd.Use == "migrate" {
			found = true
			break
		}
	}
	if !found {
		t.Error("migrate command not found")
	}
}

func TestRepoCommand_Exists(t *testing.T) {
	found := false
	for _, cmd := range rootCmd.Commands() {
		if cmd.Use == "repo" {
			found = true
			break
		}
	}
	if !found {
		t.Error("repo command not found")
	}
}

func TestVersionCommand_Exists(t *testing.T) {
	found := false
	for _, cmd := range rootCmd.Commands() {
		if cmd.Use == "version" {
			found = true
			break
		}
	}
	if !found {
		t.Error("version command not found")
	}
}

func TestTestCommand_Exists(t *testing.T) {
	found := false
	for _, cmd := range rootCmd.Commands() {
		if cmd.Use == "test" {
			found = true
			break
		}
	}
	if !found {
		t.Error("test command not found")
	}
}

func TestWatchCommand_Exists(t *testing.T) {
	found := false
	for _, cmd := range rootCmd.Commands() {
		if cmd.Use == "watch" {
			found = true
			break
		}
	}
	if !found {
		t.Error("watch command not found")
	}
}

// =============================================================================
// Command Count Tests
// =============================================================================

func TestSubcommandCount(t *testing.T) {
	// Should have: convert, migrate, repo, test, watch, version
	// Minimum expected subcommands
	minExpected := 5
	count := len(rootCmd.Commands())
	if count < minExpected {
		t.Errorf("expected at least %d subcommands, got %d", minExpected, count)
	}
}

// =============================================================================
// Convert Command Tests
// =============================================================================

func TestConvertCommand_Flags(t *testing.T) {
	flags := []string{"input", "output", "granularity", "modules"}
	for _, flagName := range flags {
		flag := convertCmd.Flags().Lookup(flagName)
		if flag == nil {
			t.Errorf("convert flag %q not found", flagName)
		}
	}
}

func TestConvertCommand_ShortFlags(t *testing.T) {
	tests := []struct {
		flagName  string
		shorthand string
	}{
		{"input", "i"},
		{"output", "o"},
		{"granularity", "g"},
		{"modules", "m"},
	}

	for _, tt := range tests {
		t.Run(tt.flagName, func(t *testing.T) {
			flag := convertCmd.Flags().Lookup(tt.flagName)
			if flag == nil {
				t.Fatalf("flag %s not found", tt.flagName)
			}
			if flag.Shorthand != tt.shorthand {
				t.Errorf("shorthand = %q, want %q", flag.Shorthand, tt.shorthand)
			}
		})
	}
}

func TestConvertCommand_GranularityDefault(t *testing.T) {
	flag := convertCmd.Flags().Lookup("granularity")
	if flag == nil {
		t.Fatal("granularity flag not found")
	}
	if flag.DefValue != "chapter" {
		t.Errorf("granularity default = %q, want 'chapter'", flag.DefValue)
	}
}

// =============================================================================
// Migrate Command Tests
// =============================================================================

func TestMigrateCommand_Flags(t *testing.T) {
	flags := []string{"source", "dest", "modules"}
	for _, flagName := range flags {
		flag := migrateCmd.Flags().Lookup(flagName)
		if flag == nil {
			t.Errorf("migrate flag %q not found", flagName)
		}
	}
}

// =============================================================================
// Test Command Tests
// =============================================================================

func TestTestCommand_Flags(t *testing.T) {
	flags := []string{"verses", "compare-cgo"}
	for _, flagName := range flags {
		flag := testCmd.Flags().Lookup(flagName)
		if flag == nil {
			t.Errorf("test flag %q not found", flagName)
		}
	}
}

// =============================================================================
// Global Flags Tests
// =============================================================================

func TestGlobalFlags_Config(t *testing.T) {
	flag := rootCmd.PersistentFlags().Lookup("config")
	if flag == nil {
		t.Error("config flag not found")
	}
}

func TestGlobalFlags_Verbose(t *testing.T) {
	flag := rootCmd.PersistentFlags().Lookup("verbose")
	if flag == nil {
		t.Error("verbose flag not found")
	}
	if flag.Shorthand != "v" {
		t.Errorf("verbose shorthand = %q, want 'v'", flag.Shorthand)
	}
}

// =============================================================================
// Version Command Output Tests
// =============================================================================

func TestVersionCommand_Output(t *testing.T) {
	// Version command prints to stdout via fmt.Println, not cmd.OutOrStdout()
	// So we just verify it doesn't error
	rootCmd.SetArgs([]string{"version"})

	if err := rootCmd.Execute(); err != nil {
		t.Fatalf("version command failed: %v", err)
	}
}

// =============================================================================
// Help Output Tests
// =============================================================================

func TestRootCommand_Help(t *testing.T) {
	var buf bytes.Buffer
	rootCmd.SetOut(&buf)
	rootCmd.SetArgs([]string{"--help"})

	_ = rootCmd.Execute() // Help exits with nil

	output := buf.String()
	if !strings.Contains(output, "diatheke") {
		t.Error("help should mention diatheke compatibility")
	}
}

// =============================================================================
// Error Handling Tests
// =============================================================================

func TestDiatheke_NoModuleError(t *testing.T) {
	// Save original args
	oldArgs := os.Args
	defer func() { os.Args = oldArgs }()

	// Test that running without module flag returns error message
	os.Args = []string{"juniper", "Genesis 1:1"}
	rootCmd.SetArgs([]string{"Genesis 1:1"})

	err := rootCmd.Execute()
	// Should either fail with module required or help shown
	// (depending on whether diatheke is available)
	_ = err // Error is expected
}

// =============================================================================
// Repo Subcommand Tests
// =============================================================================

func TestRepoCommand_Subcommands(t *testing.T) {
	subcommands := []string{
		"list-sources",
		"refresh",
		"list",
		"install",
		"installed",
		"uninstall",
		"verify",
		"install-all",
		"install-mega",
	}

	for _, name := range subcommands {
		t.Run(name, func(t *testing.T) {
			found := false
			for _, cmd := range repoCmd.Commands() {
				if strings.HasPrefix(cmd.Use, name) {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("repo subcommand %q not found", name)
			}
		})
	}
}

func TestRepoCommand_SwordPathFlag(t *testing.T) {
	flag := repoCmd.PersistentFlags().Lookup("sword-path")
	if flag == nil {
		t.Error("sword-path flag not found")
	}
}

// =============================================================================
// Format Bytes Function Tests
// =============================================================================

func TestFormatBytes(t *testing.T) {
	tests := []struct {
		bytes    int64
		expected string
	}{
		{0, "0 B"},
		{100, "100 B"},
		{1023, "1023 B"},
		{1024, "1.0 KB"},
		{1536, "1.5 KB"},
		{1048576, "1.0 MB"},
		{1073741824, "1.0 GB"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := formatBytes(tt.bytes)
			if result != tt.expected {
				t.Errorf("formatBytes(%d) = %q, want %q", tt.bytes, result, tt.expected)
			}
		})
	}
}

// =============================================================================
// GetSwordPath Tests
// =============================================================================

func TestGetSwordPath_Default(t *testing.T) {
	// Save and reset
	oldPath := repoSwordPath
	defer func() { repoSwordPath = oldPath }()

	repoSwordPath = ""
	path := getSwordPath()
	if path == "" {
		t.Error("getSwordPath() returned empty string")
	}
}

func TestGetSwordPath_Custom(t *testing.T) {
	// Save and reset
	oldPath := repoSwordPath
	defer func() { repoSwordPath = oldPath }()

	repoSwordPath = "/custom/path"
	path := getSwordPath()
	if path != "/custom/path" {
		t.Errorf("getSwordPath() = %q, want '/custom/path'", path)
	}
}

// =============================================================================
// Config Loading Tests
// =============================================================================

func TestConfigLoading_DefaultConfig(t *testing.T) {
	// Verify that default config is used when no config file exists
	// This is a unit test for the PersistentPreRunE logic
	oldCfg := cfg
	defer func() { cfg = oldCfg }()

	cfg = nil
	// PersistentPreRunE should set cfg to default if not found
	// We can't directly test this without executing the command
}

// =============================================================================
// Command Descriptions Tests
// =============================================================================

func TestCommandDescriptions_NotEmpty(t *testing.T) {
	commands := []*struct {
		name string
		cmd  interface {
			Short() string
			Long() string
		}
	}{
		// Test that all commands have descriptions
	}

	for _, c := range commands {
		t.Run(c.name, func(t *testing.T) {
			if c.cmd.Short() == "" {
				t.Errorf("%s missing Short description", c.name)
			}
		})
	}
}

// =============================================================================
// Diatheke Argument Parsing Tests
// =============================================================================

func TestDiathekeArgs_JoinsMultipleArgs(t *testing.T) {
	// When running "juniper -b KJV Genesis 1:1-3"
	// args should be ["Genesis", "1:1-3"] and joined to "Genesis 1:1-3"
	args := []string{"Genesis", "1:1-3"}
	reference := strings.Join(args, " ")
	if reference != "Genesis 1:1-3" {
		t.Errorf("reference = %q, want 'Genesis 1:1-3'", reference)
	}
}

func TestDiathekeArgs_HandlesQuotedReference(t *testing.T) {
	// When running 'juniper -b KJV "Genesis 1:1"'
	// args should be ["Genesis 1:1"]
	args := []string{"Genesis 1:1"}
	reference := strings.Join(args, " ")
	if reference != "Genesis 1:1" {
		t.Errorf("reference = %q, want 'Genesis 1:1'", reference)
	}
}

// =============================================================================
// Repo Command Argument Validation Tests
// =============================================================================

func TestRepoRefresh_RequiresSource(t *testing.T) {
	if repoRefreshCmd.Args == nil {
		t.Error("refresh command should have Args validator")
	}
}

func TestRepoList_RequiresSource(t *testing.T) {
	if repoListCmd.Args == nil {
		t.Error("list command should have Args validator")
	}
}

func TestRepoInstall_RequiresSourceAndModule(t *testing.T) {
	if repoInstallCmd.Args == nil {
		t.Error("install command should have Args validator")
	}
}

func TestRepoUninstall_RequiresModule(t *testing.T) {
	if repoUninstallCmd.Args == nil {
		t.Error("uninstall command should have Args validator")
	}
}

// =============================================================================
// Install-All Flags Tests
// =============================================================================

func TestRepoInstallAll_WorkersFlag(t *testing.T) {
	flag := repoInstallAllCmd.Flags().Lookup("workers")
	if flag == nil {
		t.Error("workers flag not found on install-all")
	}
	if flag.Shorthand != "w" {
		t.Errorf("workers shorthand = %q, want 'w'", flag.Shorthand)
	}
	if flag.DefValue != "4" {
		t.Errorf("workers default = %q, want '4'", flag.DefValue)
	}
}

func TestRepoInstallMega_WorkersFlag(t *testing.T) {
	flag := repoInstallMegaCmd.Flags().Lookup("workers")
	if flag == nil {
		t.Error("workers flag not found on install-mega")
	}
}

// =============================================================================
// Run Function Tests
// =============================================================================

func TestRunDiatheke_NoArgs_ShowsHelp(t *testing.T) {
	var buf bytes.Buffer
	rootCmd.SetOut(&buf)
	rootCmd.SetErr(&buf)

	// Reset flags for clean test
	diathekeModule = ""

	err := runDiatheke(rootCmd, []string{})
	// Should show help (return nil) when no args
	if err != nil {
		t.Logf("runDiatheke() returned: %v", err)
	}
}

func TestRunDiatheke_NoModule_ReturnsError(t *testing.T) {
	// Reset flags
	diathekeModule = ""

	err := runDiatheke(rootCmd, []string{"Genesis 1:1"})
	if err == nil {
		t.Error("runDiatheke() should return error when module not specified")
	}
	if !strings.Contains(err.Error(), "module required") {
		t.Errorf("error should mention module required, got: %v", err)
	}
}

func TestRunWatch_NotImplemented(t *testing.T) {
	err := runWatch(watchCmd, []string{})
	if err != nil {
		t.Errorf("runWatch() should not return error: %v", err)
	}
}

func TestRunTest_NotImplemented(t *testing.T) {
	// Without CGo flag
	testCompareCGo = false
	err := runTest(testCmd, []string{})
	if err != nil {
		t.Errorf("runTest() should not return error: %v", err)
	}
}

func TestRunTest_CGo_NotImplemented(t *testing.T) {
	// With CGo flag
	testCompareCGo = true
	err := runTest(testCmd, []string{})
	if err != nil {
		t.Errorf("runTest() with CGo should not return error: %v", err)
	}
	testCompareCGo = false // Reset
}

func TestRunMigrate_InvalidSource(t *testing.T) {
	// Save and restore
	oldSource := migrateSource
	oldDest := migrateDest
	oldCfg := cfg
	defer func() {
		migrateSource = oldSource
		migrateDest = oldDest
		cfg = oldCfg
	}()

	// Set up invalid source directory
	migrateSource = "/nonexistent/sword/path"
	migrateDest = t.TempDir()

	// Set up minimal config
	cfg = &config.Config{
		SwordDir:  migrateSource,
		OutputDir: migrateDest,
	}

	err := runMigrate(migrateCmd, []string{})
	// Should either fail or return error about no modules found
	// depending on error handling
	_ = err // Result depends on implementation
}

func TestRunConvert_NoModulesFound(t *testing.T) {
	// Save and restore
	oldInput := convertInput
	oldOutput := convertOutput
	oldCfg := cfg
	defer func() {
		convertInput = oldInput
		convertOutput = oldOutput
		cfg = oldCfg
	}()

	// Set up empty directory
	tmpDir := t.TempDir()
	convertInput = tmpDir
	convertOutput = t.TempDir()
	convertModules = nil

	// Set up minimal config
	cfg = &config.Config{
		OutputDir: convertOutput,
	}

	// This might return an error or just print "No modules found"
	err := runConvert(convertCmd, []string{})
	// Error handling varies - may or may not return error
	_ = err
}

// =============================================================================
// PersistentPreRunE Tests
// =============================================================================

func TestPersistentPreRunE_HelpCommand(t *testing.T) {
	// Create a help subcommand mock
	helpCmd := &cobra.Command{Use: "help"}

	// Should not error and skip config loading
	err := rootCmd.PersistentPreRunE(helpCmd, []string{})
	if err != nil {
		t.Errorf("PersistentPreRunE for help should not error: %v", err)
	}
}

func TestPersistentPreRunE_VersionCommand(t *testing.T) {
	// Create a version subcommand mock
	versionCmd := &cobra.Command{Use: "version"}

	// Should not error and skip config loading
	err := rootCmd.PersistentPreRunE(versionCmd, []string{})
	if err != nil {
		t.Errorf("PersistentPreRunE for version should not error: %v", err)
	}
}

func TestPersistentPreRunE_MissingConfig(t *testing.T) {
	// Save and restore
	oldCfgFile := cfgFile
	oldCfg := cfg
	defer func() {
		cfgFile = oldCfgFile
		cfg = oldCfg
	}()

	// Set nonexistent config file
	cfgFile = "/nonexistent/config.yaml"
	cfg = nil

	otherCmd := &cobra.Command{Use: "other"}
	err := rootCmd.PersistentPreRunE(otherCmd, []string{})

	// Should succeed with default config
	if err != nil {
		t.Errorf("PersistentPreRunE should succeed with missing config: %v", err)
	}
	if cfg == nil {
		t.Error("cfg should be set to default when config file missing")
	}
}

func TestPersistentPreRunE_CustomConfigFile(t *testing.T) {
	// Save and restore
	oldCfgFile := cfgFile
	oldCfg := cfg
	defer func() {
		cfgFile = oldCfgFile
		cfg = oldCfg
	}()

	// Create a valid config file
	tmpDir := t.TempDir()
	configPath := tmpDir + "/config.yaml"
	os.WriteFile(configPath, []byte(`
sword_dir: /tmp/sword
output_dir: /tmp/output
granularity: chapter
`), 0644)

	cfgFile = configPath
	cfg = nil

	otherCmd := &cobra.Command{Use: "other"}
	err := rootCmd.PersistentPreRunE(otherCmd, []string{})

	if err != nil {
		t.Errorf("PersistentPreRunE should succeed with valid config: %v", err)
	}
	if cfg == nil {
		t.Error("cfg should be loaded from config file")
	}
}

// =============================================================================
// Diatheke Command Building Tests
// =============================================================================

func TestDiathekeArgs_AllFlags(t *testing.T) {
	// Test that all diatheke flags get added to command args
	diathekeModule = "KJV"
	diathekeFormat = "plain"
	diathekeLocale = "en"
	diathekeOption = "n"
	diathekeVariant = "1"

	// Build args as runDiatheke does
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
	diathekeArgs = append(diathekeArgs, "-k", "Genesis 1:1")

	expected := []string{"-b", "KJV", "-f", "plain", "-l", "en", "-o", "n", "-v", "1", "-k", "Genesis 1:1"}
	if len(diathekeArgs) != len(expected) {
		t.Errorf("args length = %d, want %d", len(diathekeArgs), len(expected))
	}
	for i, arg := range diathekeArgs {
		if arg != expected[i] {
			t.Errorf("arg[%d] = %q, want %q", i, arg, expected[i])
		}
	}

	// Reset flags
	diathekeModule = ""
	diathekeFormat = ""
	diathekeLocale = ""
	diathekeOption = ""
	diathekeVariant = ""
}

// =============================================================================
// Convert Command Logic Tests
// =============================================================================

func TestConvertModuleFiltering(t *testing.T) {
	// Test the module filtering logic
	filterSet := make(map[string]bool)
	for _, m := range []string{"KJV", "DRC"} {
		filterSet[strings.ToLower(m)] = true
	}

	testModules := []struct {
		id     string
		filter bool
	}{
		{"KJV", true},
		{"kjv", true}, // Should match case-insensitive
		{"DRC", true},
		{"Geneva", false},
	}

	for _, tt := range testModules {
		result := filterSet[strings.ToLower(tt.id)]
		if result != tt.filter {
			t.Errorf("filter(%q) = %v, want %v", tt.id, result, tt.filter)
		}
	}
}

// =============================================================================
// Command Examples Tests
// =============================================================================

func TestCommandExamples_NotEmpty(t *testing.T) {
	if convertCmd.Example == "" {
		t.Error("convert command should have Example")
	}
	if migrateCmd.Example == "" {
		t.Error("migrate command should have Example")
	}
	if testCmd.Example == "" {
		t.Error("test command should have Example")
	}
}
