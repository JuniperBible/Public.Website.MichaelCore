package sword

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ParseConf parses a SWORD .conf file and returns module metadata.
func ParseConf(confPath string) (*Module, error) {
	file, err := os.Open(confPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open conf file: %w", err)
	}
	defer file.Close()

	module := &Module{
		ConfPath:            confPath,
		Features:            []string{},
		GlobalOptionFilters: []string{},
	}

	scanner := bufio.NewScanner(file)
	var currentSection string

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Check for section header [ModuleName]
		if strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]") {
			currentSection = line[1 : len(line)-1]
			module.ID = strings.ToLower(currentSection)
			continue
		}

		// Parse key=value pairs
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		switch key {
		case "Description":
			module.Title = value
		case "About":
			module.About = parseAboutText(value)
		case "ModDrv":
			module.Driver = ModuleDriver(value)
			module.ModuleType = driverToModuleType(module.Driver)
		case "SourceType":
			module.SourceType = SourceType(value)
		case "Lang":
			module.Language = value
		case "Versification":
			module.Versification = value
		case "DataPath":
			module.DataPath = value
		case "CompressType":
			module.CompressType = value
		case "BlockType":
			module.BlockType = value
		case "Encoding":
			module.Encoding = value
		case "Version":
			module.Version = value
		case "SwordVersionDate":
			module.SwordVersionDate = value
		case "Copyright":
			module.Copyright = value
		case "DistributionLicense":
			module.DistributionLicense = value
		case "Category":
			module.Category = value
		case "LCSH":
			module.LCSH = value
		case "MinimumVersion":
			module.MinimumVersion = value
		case "Feature":
			module.Features = append(module.Features, value)
		case "GlobalOptionFilter":
			module.GlobalOptionFilters = append(module.GlobalOptionFilters, value)
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading conf file: %w", err)
	}

	// Generate description from About if not set
	if module.Description == "" && module.About != "" {
		module.Description = truncateDescription(module.About, 200)
	}

	return module, nil
}

// parseAboutText converts SWORD About field RTF-like encoding to plain text.
func parseAboutText(text string) string {
	// Replace \par with newlines
	text = strings.ReplaceAll(text, "\\par\\par", "\n\n")
	text = strings.ReplaceAll(text, "\\par ", "\n")
	text = strings.ReplaceAll(text, "\\par", "\n")

	// Remove other RTF-like escapes
	text = strings.ReplaceAll(text, "\\qc", "")
	text = strings.ReplaceAll(text, "\\pard", "")

	return strings.TrimSpace(text)
}

// truncateDescription truncates text to maxLen, ending at a word boundary.
func truncateDescription(text string, maxLen int) string {
	// Take first paragraph
	if idx := strings.Index(text, "\n"); idx > 0 && idx < maxLen {
		text = text[:idx]
	}

	if len(text) <= maxLen {
		return text
	}

	// Find last space before maxLen
	truncated := text[:maxLen]
	if idx := strings.LastIndex(truncated, " "); idx > 0 {
		truncated = truncated[:idx]
	}

	return truncated + "..."
}

// driverToModuleType maps a module driver to its module type.
func driverToModuleType(driver ModuleDriver) ModuleType {
	switch driver {
	case DriverZText, DriverZText4, DriverRawText, DriverRawText4:
		return ModuleTypeBible
	case DriverZCom, DriverZCom4, DriverRawCom, DriverRawCom4:
		return ModuleTypeCommentary
	case DriverZLD, DriverRawLD, DriverRawLD4:
		return ModuleTypeDictionary
	case DriverRawGenBook:
		return ModuleTypeGenBook
	default:
		return ModuleTypeBible
	}
}

// DiscoverModules finds all .conf files in a SWORD mods.d directory.
func DiscoverModules(swordDir string) ([]string, error) {
	modsDir := filepath.Join(swordDir, "mods.d")

	entries, err := os.ReadDir(modsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read mods.d directory: %w", err)
	}

	var confFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".conf") {
			confFiles = append(confFiles, filepath.Join(modsDir, entry.Name()))
		}
	}

	return confFiles, nil
}

// LoadAllModules loads metadata for all modules in a SWORD directory.
func LoadAllModules(swordDir string) ([]*Module, error) {
	confFiles, err := DiscoverModules(swordDir)
	if err != nil {
		return nil, err
	}

	var modules []*Module
	for _, confPath := range confFiles {
		module, err := ParseConf(confPath)
		if err != nil {
			// Log warning but continue with other modules
			fmt.Fprintf(os.Stderr, "Warning: failed to parse %s: %v\n", confPath, err)
			continue
		}
		modules = append(modules, module)
	}

	return modules, nil
}

// HasFeature checks if a module has a specific feature.
func (m *Module) HasFeature(feature string) bool {
	for _, f := range m.Features {
		if f == feature {
			return true
		}
	}
	return false
}

// HasStrongsNumbers returns true if the module has Strong's numbers.
func (m *Module) HasStrongsNumbers() bool {
	return m.HasFeature("StrongsNumbers")
}

// HasMorphology returns true if the module has morphology data.
func (m *Module) HasMorphology() bool {
	for _, filter := range m.GlobalOptionFilters {
		if strings.Contains(filter, "Morph") {
			return true
		}
	}
	return false
}

// ResolveDataPath returns the absolute path to the module's data directory.
func (m *Module) ResolveDataPath(swordDir string) string {
	dataPath := m.DataPath

	// Remove leading ./ if present
	dataPath = strings.TrimPrefix(dataPath, "./")

	// SWORD data paths are relative to the SWORD root
	return filepath.Join(swordDir, dataPath)
}
