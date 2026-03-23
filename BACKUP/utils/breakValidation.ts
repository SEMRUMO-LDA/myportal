/**
 * Break Validation Utilities
 * Ensures compliance with Portuguese Labor Code regarding mandatory breaks
 */

export interface BreakValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiredBreakMinutes: number;
  actualBreakMinutes: number;
}

/**
 * Validates if proper breaks were taken according to labor law
 * Portuguese Labor Code Article 213:
 * - Work periods > 5 hours require minimum 30 min break
 * - Work periods > 10 hours require minimum 1 hour break
 * - Maximum continuous work without break: 5 hours
 */
export function validateBreaks(
  checkIn: string,
  checkOut: string,
  breakStart?: string,
  breakEnd?: string
): BreakValidationResult {
  const result: BreakValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    requiredBreakMinutes: 0,
    actualBreakMinutes: 0
  };

  if (!checkIn || !checkOut) {
    return result;
  }

  // Calculate total work time
  const [inHour, inMin] = checkIn.split(':').map(Number);
  const [outHour, outMin] = checkOut.split(':').map(Number);
  const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
  const totalHours = totalMinutes / 60;

  // Determine required break time based on total hours
  if (totalHours > 10) {
    result.requiredBreakMinutes = 60; // 1 hour minimum
  } else if (totalHours > 5) {
    result.requiredBreakMinutes = 30; // 30 minutes minimum
  } else {
    // No break required for periods <= 5 hours
    return result;
  }

  let bStartHour = 0;
  let bStartMin = 0;
  let bEndHour = 0;
  let bEndMin = 0;

  // Calculate actual break taken
  if (breakStart && breakEnd) {
    [bStartHour, bStartMin] = breakStart.split(':').map(Number);
    [bEndHour, bEndMin] = breakEnd.split(':').map(Number);
    result.actualBreakMinutes = (bEndHour * 60 + bEndMin) - (bStartHour * 60 + bStartMin);
  }

  // Validate break duration
  if (result.actualBreakMinutes === 0) {
    result.isValid = false;
    result.errors.push(
      `Período de trabalho de ${totalHours.toFixed(1)}h requer pausa obrigatória de ${result.requiredBreakMinutes} minutos (Art. 213º CT)`
    );
  } else if (result.actualBreakMinutes < result.requiredBreakMinutes) {
    result.isValid = false;
    result.errors.push(
      `Pausa insuficiente: ${result.actualBreakMinutes}min registados, mínimo legal ${result.requiredBreakMinutes}min`
    );
  }

  // Check for continuous work > 5 hours
  if (breakStart) {
    const continuousWorkBeforeBreak =
      (bStartHour * 60 + bStartMin) - (inHour * 60 + inMin);

    if (continuousWorkBeforeBreak > 300) { // 5 hours = 300 minutes
      result.warnings.push(
        `Trabalho contínuo de ${(continuousWorkBeforeBreak / 60).toFixed(1)}h antes da pausa excede o limite de 5h`
      );
    }
  } else if (totalHours > 5) {
    result.warnings.push(
      `Trabalho contínuo de ${totalHours.toFixed(1)}h sem pausas registadas`
    );
  }

  // Additional validations
  if (breakStart && breakEnd) {
    // Check if break was taken at reasonable time (between 11:30 and 15:00 for lunch)
    const breakHour = bStartHour + (bStartMin / 60);
    if (result.actualBreakMinutes >= 30 && (breakHour < 11.5 || breakHour > 15)) {
      result.warnings.push(
        'Pausa principal registada fora do horário típico de almoço (11:30-15:00)'
      );
    }

    // Check for split breaks (not allowed for main break)
    if (result.actualBreakMinutes < result.requiredBreakMinutes) {
      result.warnings.push(
        'A pausa obrigatória deve ser contínua e não pode ser fragmentada'
      );
    }
  }

  return result;
}

/**
 * Formats break validation messages for display
 */
export function formatBreakValidation(validation: BreakValidationResult): string {
  const messages: string[] = [];

  if (validation.errors.length > 0) {
    messages.push('⚠️ VIOLAÇÕES:', ...validation.errors);
  }

  if (validation.warnings.length > 0) {
    messages.push('📝 AVISOS:', ...validation.warnings);
  }

  if (validation.isValid && validation.requiredBreakMinutes > 0) {
    messages.push(
      `✅ Pausas em conformidade (${validation.actualBreakMinutes}min/${validation.requiredBreakMinutes}min obrigatórios)`
    );
  }

  return messages.join('\n');
}

/**
 * Gets break compliance status for display
 */
export function getBreakComplianceStatus(validation: BreakValidationResult): {
  status: 'compliant' | 'warning' | 'violation' | 'none';
  color: string;
  label: string;
} {
  if (validation.requiredBreakMinutes === 0) {
    return {
      status: 'none',
      color: 'gray',
      label: 'N/A'
    };
  }

  if (!validation.isValid) {
    return {
      status: 'violation',
      color: 'red',
      label: 'Violação CT'
    };
  }

  if (validation.warnings.length > 0) {
    return {
      status: 'warning',
      color: 'yellow',
      label: 'Atenção'
    };
  }

  return {
    status: 'compliant',
    color: 'green',
    label: 'Conforme'
  };
}