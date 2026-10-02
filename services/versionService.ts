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
      const baseUrl = import.meta.env.BASE_URL || '/';
      const versionUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}version.json`;
      const response = await fetch(versionUrl, { cache: 'no-cache' }).catch(() => null);
      if (response && response.ok) {
        const data = await response.json();
        this.version = data.version || '1.26';
        this.buildNumber = data.buildNumber || this.generateBuildNumber();
        this.buildDate = data.buildDate || new Date().toISOString();
      } else {
        this.buildNumber = this.generateBuildNumber();
      }
    } catch {
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
    return 'V1.26';
  }

  /**
   * Get sequential build number / version tag for display
   */
  getBuildSequence(): string {
    return '1.26';
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