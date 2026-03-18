/**
 * Manager Notification Service
 * Handles automated notifications and reports for department heads and directors
 */

import { supabase } from './supabaseClient';
import { wassengerService } from './wassengerService';
import { User, TimeLog, Department, Company } from '../types';

// Types
export interface NotificationRecipient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  departmentId?: number;
  notificationPreferences: {
    whatsapp: boolean;
    email: boolean;
    dailySummary: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
    criticalAlerts: boolean;
  };
}

export interface DepartmentMetrics {
  departmentId: number;
  departmentName: string;
  date: string;
  metrics: {
    totalEmployees: number;
    present: number;
    absent: number;
    onVacation: number;
    onSickLeave: number;
    remote: number;
    lateArrivals: number;
    earlyDepartures: number;
    overtimeHours: number;
    averageHoursWorked: number;
    complianceIssues: string[];
  };
  alerts: Alert[];
  actionItems: ActionItem[];
}

export interface Alert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  employeeId?: number;
  timestamp: string;
}

export interface ActionItem {
  id: string;
  type: 'approval' | 'justification' | 'review';
  description: string;
  dueDate?: string;
  relatedEmployeeId?: number;
}

// Configuration
const NOTIFICATION_CONFIG = {
  dailySummaryTime: '18:00',
  weeklyReportDay: 5, // Friday
  weeklyReportTime: '17:00',
  monthlyReportDay: -1, // Last day of month
  monthlyReportTime: '10:00',
  criticalAlertsRealtime: true,
};

/**
 * Main notification service class
 */
export class ManagerNotificationService {
  /**
   * Send real-time critical alert
   */
  async sendCriticalAlert(alert: Alert, departmentId: number): Promise<void> {
    const recipients = await this.getNotificationRecipients(departmentId, 'critical');

    for (const recipient of recipients) {
      const message = this.formatCriticalAlert(alert);

      // Send WhatsApp if enabled
      if (recipient.notificationPreferences.whatsapp && recipient.phone) {
        try {
          await wassengerService.sendMessage(recipient.phone, message.whatsapp);
          await this.logNotification('whatsapp', 'critical_alert', recipient.id, true);
        } catch (error) {
          console.error(`WhatsApp alert failed for ${recipient.name}:`, error);
          await this.logNotification('whatsapp', 'critical_alert', recipient.id, false);
        }
      }

      // Send Email as fallback or if preferred
      if (recipient.notificationPreferences.email) {
        try {
          await this.sendEmail(recipient.email, message.subject, message.html);
          await this.logNotification('email', 'critical_alert', recipient.id, true);
        } catch (error) {
          console.error(`Email alert failed for ${recipient.name}:`, error);
          await this.logNotification('email', 'critical_alert', recipient.id, false);
        }
      }
    }
  }

  /**
   * Generate and send daily summary
   */
  async sendDailySummary(departmentId?: number): Promise<void> {
    const departments = departmentId
      ? [await this.getDepartmentById(departmentId)]
      : await this.getAllDepartments();

    for (const dept of departments) {
      const metrics = await this.calculateDepartmentMetrics(dept.id, new Date());
      const recipients = await this.getNotificationRecipients(dept.id, 'daily');

      for (const recipient of recipients) {
        const message = this.formatDailySummary(metrics);

        if (recipient.notificationPreferences.whatsapp && recipient.phone) {
          try {
            await wassengerService.sendMessage(recipient.phone, message.whatsapp);
            await this.logNotification('whatsapp', 'daily_summary', recipient.id, true);
          } catch (error) {
            console.error(`Daily summary WhatsApp failed for ${recipient.name}:`, error);
          }
        }
      }
    }
  }

  /**
   * Generate and send weekly report
   */
  async sendWeeklyReport(departmentId?: number): Promise<void> {
    const departments = departmentId
      ? [await this.getDepartmentById(departmentId)]
      : await this.getAllDepartments();

    for (const dept of departments) {
      const weekMetrics = await this.calculateWeeklyMetrics(dept.id);
      const recipients = await this.getNotificationRecipients(dept.id, 'weekly');

      for (const recipient of recipients) {
        const report = this.generateWeeklyReport(weekMetrics);

        if (recipient.notificationPreferences.email) {
          try {
            await this.sendEmail(
              recipient.email,
              `Weekly Report - ${dept.name} - Week ${this.getWeekNumber()}`,
              report.html,
              report.attachments
            );
            await this.logNotification('email', 'weekly_report', recipient.id, true);
          } catch (error) {
            console.error(`Weekly report email failed for ${recipient.name}:`, error);
          }
        }
      }
    }
  }

  /**
   * Generate and send monthly executive report
   */
  async sendMonthlyReport(): Promise<void> {
    const companyMetrics = await this.calculateCompanyMetrics();
    const executives = await this.getExecutives();

    const report = this.generateExecutiveReport(companyMetrics);

    for (const executive of executives) {
      if (executive.notificationPreferences.email) {
        try {
          await this.sendEmail(
            executive.email,
            `Monthly Executive Report - ${new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`,
            report.html,
            report.attachments
          );
          await this.logNotification('email', 'monthly_report', executive.id, true);
        } catch (error) {
          console.error(`Monthly report failed for ${executive.name}:`, error);
        }
      }
    }
  }

  /**
   * Format critical alert for multiple channels
   */
  private formatCriticalAlert(alert: Alert): {
    whatsapp: string;
    subject: string;
    html: string;
  } {
    const emoji = this.getSeverityEmoji(alert.severity);

    return {
      whatsapp: `${emoji} *ALERTA ${alert.severity.toUpperCase()}*\n\n${alert.type}\n${alert.message}\n\nHora: ${new Date(alert.timestamp).toLocaleTimeString('pt-PT')}\n\n_Responda com:_\n1️⃣ Confirmar receção\n2️⃣ Tomar ação imediata\n3️⃣ Delegar`,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type}`,
      html: `
        <div style="border-left: 4px solid ${this.getSeverityColor(alert.severity)}; padding-left: 16px;">
          <h2>${alert.type}</h2>
          <p>${alert.message}</p>
          <p><small>Timestamp: ${new Date(alert.timestamp).toLocaleString('pt-PT')}</small></p>
          <div style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/attendance" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Ver Detalhes
            </a>
          </div>
        </div>
      `
    };
  }

  /**
   * Format daily summary for WhatsApp
   */
  private formatDailySummary(metrics: DepartmentMetrics): {
    whatsapp: string;
    subject: string;
  } {
    const presenceRate = ((metrics.metrics.present / metrics.metrics.totalEmployees) * 100).toFixed(1);

    let whatsappMessage = `📊 *RESUMO DIÁRIO - ${metrics.departmentName}*\n`;
    whatsappMessage += `📅 ${new Date(metrics.date).toLocaleDateString('pt-PT')}\n\n`;

    whatsappMessage += `*PRESENÇAS*\n`;
    whatsappMessage += `✅ Presentes: ${metrics.metrics.present}/${metrics.metrics.totalEmployees} (${presenceRate}%)\n`;
    whatsappMessage += `🏠 Remoto: ${metrics.metrics.remote}\n`;
    whatsappMessage += `🌴 Férias: ${metrics.metrics.onVacation}\n`;
    whatsappMessage += `😷 Baixa: ${metrics.metrics.onSickLeave}\n\n`;

    if (metrics.alerts.length > 0) {
      whatsappMessage += `*ALERTAS*\n`;
      metrics.alerts.slice(0, 3).forEach(alert => {
        whatsappMessage += `${this.getSeverityEmoji(alert.severity)} ${alert.message}\n`;
      });
      whatsappMessage += '\n';
    }

    if (metrics.actionItems.length > 0) {
      whatsappMessage += `*AÇÃO REQUERIDA*\n`;
      metrics.actionItems.slice(0, 3).forEach((item, index) => {
        whatsappMessage += `${index + 1}. ${item.description}\n`;
      });
    }

    return {
      whatsapp: whatsappMessage,
      subject: `Resumo Diário - ${metrics.departmentName} - ${presenceRate}% presença`
    };
  }

  /**
   * Generate weekly HTML report
   */
  private generateWeeklyReport(weekMetrics: any): {
    html: string;
    attachments?: any[];
  } {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; }
        .metric-card { background: #f7f9fc; padding: 20px; border-radius: 8px; margin: 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2d3748; }
        .metric-label { color: #718096; text-transform: uppercase; font-size: 0.75em; font-weight: 600; }
        .positive { color: #48bb78; }
        .negative { color: #f56565; }
        .neutral { color: #ed8936; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #edf2f7; padding: 12px; text-align: left; font-weight: 600; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .alert-box { background: #fff5f5; border-left: 4px solid #feb2b2; padding: 16px; margin: 16px 0; }
        .success-box { background: #f0fff4; border-left: 4px solid #9ae6b4; padding: 16px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Weekly Performance Report</h1>
        <p>${weekMetrics.departmentName} | Week ${this.getWeekNumber()} | ${this.getWeekDateRange()}</p>
      </div>

      <div class="metric-card">
        <h2>📊 Key Performance Indicators</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <div>
            <div class="metric-label">Attendance Rate</div>
            <div class="metric-value ${weekMetrics.attendanceRate >= 95 ? 'positive' : 'negative'}">
              ${weekMetrics.attendanceRate}%
            </div>
          </div>
          <div>
            <div class="metric-label">Overtime Hours</div>
            <div class="metric-value ${weekMetrics.overtimeHours > 40 ? 'negative' : 'neutral'}">
              ${weekMetrics.overtimeHours}h
            </div>
          </div>
          <div>
            <div class="metric-label">Productivity Score</div>
            <div class="metric-value positive">${weekMetrics.productivityScore}/100</div>
          </div>
        </div>
      </div>

      <h2>📈 Trend Analysis</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>This Week</th>
            <th>Last Week</th>
            <th>Change</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          ${this.generateTrendTableRows(weekMetrics.trends)}
        </tbody>
      </table>

      <h2>👥 Top Performers</h2>
      <ol>
        ${weekMetrics.topPerformers.map((p: any) => `
          <li><strong>${p.name}</strong> - ${p.score} points (${p.achievement})</li>
        `).join('')}
      </ol>

      ${weekMetrics.complianceIssues.length > 0 ? `
        <div class="alert-box">
          <h3>⚠️ Compliance Issues Detected</h3>
          <ul>
            ${weekMetrics.complianceIssues.map((issue: string) => `<li>${issue}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="success-box">
        <h3>💡 Recommendations</h3>
        <ul>
          ${this.generateRecommendations(weekMetrics).map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
      </div>

      <hr style="margin: 40px 0; border: none; border-top: 1px solid #e2e8f0;">

      <p style="color: #718096; font-size: 0.875em;">
        This report was automatically generated on ${new Date().toLocaleString('pt-PT')}.
        For questions or feedback, contact hr@company.com
      </p>
    </body>
    </html>
    `;

    return { html };
  }

  /**
   * Generate executive monthly report
   */
  private generateExecutiveReport(companyMetrics: any): {
    html: string;
    attachments?: any[];
  } {
    // Implementation of comprehensive monthly report
    // Would include financial analysis, predictions, etc.
    return {
      html: `<h1>Executive Monthly Report</h1><!-- Full implementation here -->`,
      attachments: []
    };
  }

  // Helper methods
  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      low: '📝',
      medium: '⚠️',
      high: '🔴',
      critical: '🚨'
    };
    return emojis[severity] || '📌';
  }

  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      low: '#3B82F6',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#991B1B'
    };
    return colors[severity] || '#6B7280';
  }

  private getWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
  }

  private getWeekDateRange(): string {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    return `${monday.toLocaleDateString('pt-PT')} - ${sunday.toLocaleDateString('pt-PT')}`;
  }

  private generateTrendTableRows(trends: any[]): string {
    return trends.map(trend => `
      <tr>
        <td>${trend.metric}</td>
        <td>${trend.currentValue}</td>
        <td>${trend.previousValue}</td>
        <td class="${trend.change >= 0 ? 'positive' : 'negative'}">
          ${trend.change >= 0 ? '+' : ''}${trend.change}%
        </td>
        <td>${trend.change >= 0 ? '📈' : '📉'}</td>
      </tr>
    `).join('');
  }

  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.attendanceRate < 95) {
      recommendations.push('Consider implementing flexible working hours to improve attendance');
    }

    if (metrics.overtimeHours > 40) {
      recommendations.push('Review workload distribution to reduce overtime dependency');
    }

    if (metrics.lateArrivals > 10) {
      recommendations.push('Analyze commute patterns and consider adjusting start times');
    }

    return recommendations;
  }

  // Database methods
  private async getNotificationRecipients(
    departmentId: number,
    notificationType: 'critical' | 'daily' | 'weekly' | 'monthly'
  ): Promise<NotificationRecipient[]> {
    // Implementation to fetch recipients from database
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`department_id.eq.${departmentId},role.in.(ADMIN,HR,MANAGER)`)
      .eq('active', true);

    if (error) throw error;
    return data || [];
  }

  private async getDepartmentById(id: number): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  private async getAllDepartments(): Promise<Department[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('active', true);

    if (error) throw error;
    return data || [];
  }

  private async getExecutives(): Promise<NotificationRecipient[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['ADMIN', 'DIRECTOR', 'CEO'])
      .eq('active', true);

    if (error) throw error;
    return data || [];
  }

  private async calculateDepartmentMetrics(
    departmentId: number,
    date: Date
  ): Promise<DepartmentMetrics> {
    // Complex calculation of department metrics
    // Would query time_logs, leaves, users tables
    return {} as DepartmentMetrics;
  }

  private async calculateWeeklyMetrics(departmentId: number): Promise<any> {
    // Calculate weekly metrics
    return {};
  }

  private async calculateCompanyMetrics(): Promise<any> {
    // Calculate company-wide metrics
    return {};
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: any[]
  ): Promise<void> {
    // Implementation using SendGrid or AWS SES
    console.log(`Email would be sent to ${to}: ${subject}`);
  }

  private async logNotification(
    channel: 'whatsapp' | 'email',
    type: string,
    recipientId: number,
    success: boolean
  ): Promise<void> {
    await supabase.from('notification_logs').insert({
      channel,
      type,
      recipient_id: recipientId,
      success,
      sent_at: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const managerNotificationService = new ManagerNotificationService();