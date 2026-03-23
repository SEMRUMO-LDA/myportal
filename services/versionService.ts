/**
 * Version Service
 * Manages application version and build number
 */

class VersionService {
  private version: string = '';
  private buildNumber: string = '';
  private buildDate: string = '';

  constructor() {
    this.loadVersion();
  }

  /**
   * Load version from version.json file
   */
  private async loadVersion() {
    try {
      const response = await fetch('/version.json?t=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        this.version = data.version || '1.0.0';
        this.buildNumber = data.buildNumber || this.generateBuildNumber();
        this.buildDate = data.buildDate || new Date().toISOString();
      } else {
        // Fallback to generated build number
        this.buildNumber = this.generateBuildNumber();
      }
    } catch (error) {
      console.error('Failed to load version:', error);
      // Use fallback
      this.buildNumber = this.generateBuildNumber();
    }
  }

  /**
   * Generate build number from date/time
   * Format: YYMMDD.HHMM
   */
  private generateBuildNumber(): string {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}.${hours}${minutes}`;
  }

  /**
   * Get formatted version string
   */
  getVersionString(): string {
    // Use sequential build number for display
    const buildNum = this.getBuildSequence();
    return `v${buildNum}`;
  }

  /**
   * Get sequential build number from localStorage
   * Increments on each deploy
   */
  private getBuildSequence(): number {
    const stored = localStorage.getItem('app_build_number');
    const currentBuild = this.buildNumber;
    const lastBuild = localStorage.getItem('last_build_id');

    // If build ID changed, increment sequence
    if (lastBuild !== currentBuild) {
      const sequence = stored ? parseInt(stored) + 1 : 114; // Start from v114 (after current v113)
      localStorage.setItem('app_build_number', String(sequence));
      localStorage.setItem('last_build_id', currentBuild);
      return sequence;
    }

    // Return current sequence
    return stored ? parseInt(stored) : 114;
  }

  /**
   * Get full version info
   */
  getVersionInfo() {
    return {
      version: this.version,
      buildNumber: this.buildNumber,
      buildDate: this.buildDate,
      display: this.getVersionString()
    };
  }

  /**
   * Force reload version (useful after deploy)
   */
  async reload() {
    await this.loadVersion();
  }
}

// Singleton instance
export const versionService = new VersionService();

// Export for direct use
export const getAppVersion = () => versionService.getVersionString();