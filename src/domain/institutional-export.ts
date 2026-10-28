import type { InstitutionalScope } from './institutional';

const cell = (value: unknown) => {
  const raw = String(value ?? '');
  const safe = typeof value === 'number' ? raw : /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

/** One row per selected activity. Whole activity cost is never attributed to selected people. */
export function exportInstitutionalCsv(scope: InstitutionalScope, permissions: { export: boolean; financial: boolean }) {
  if (!permissions.export) throw new Error('Este perfil demonstrativo não permite exportar a avaliação institucional.');
  const cities = new Map(scope.dataset.cities.map(row => [row.id, row.name]));
  const programs = new Map(scope.model.programs.map(row => [row.id, row.name]));
  const columns = ['Atividade demonstrativa', 'Programa', 'Data', 'Município da oferta', 'GRE demonstrativa', 'Inscrições no recorte', 'Presenças no recorte', 'Pessoas identificadas distintas', 'Presenças sem identificador',
    'Horas de posição de trabalho utilizadas', ...(permissions.financial ? ['Custo integral da atividade (R$; sem rateio por pessoas)'] : []), 'Fonte', 'Grão'];
  const rows = scope.activities.map(activity => {
    const participation = scope.participation.filter(row => row.activityId === activity.id);
    const attendance = participation.filter(row => row.attended);
    const cowork = activity.programId === 'coworkings';
    const attendanceMode = scope.model.programs.find(row => row.id === activity.programId)?.participationMode === 'attendance';
    const coworkMonthIds = new Set(scope.coworkMonths.filter(row => row.activityId === activity.id).map(row => row.id));
    const usage = scope.coworkUsage.filter(row => coworkMonthIds.has(row.coworkMonthId));
    const people = new Set(cowork ? usage.map(row => row.professionalId) : attendance.filter(row => row.professionalId).map(row => row.professionalId));
    return [activity.name, programs.get(activity.programId), activity.date, cities.get(activity.cityId), activity.greId,
      attendanceMode ? participation.length : 'Não se aplica', attendanceMode ? attendance.length : 'Não se aplica', attendanceMode || cowork ? people.size : 'Não se aplica',
      attendanceMode ? attendance.filter(row => !row.professionalId).length : 'Não se aplica', cowork ? usage.reduce((sum, row) => sum + row.usedDeskHours, 0) : 'Não se aplica', ...(permissions.financial ? [activity.costCents / 100] : []),
      `Cenário institucional sintético · semente ${scope.model.metadata.seed}`, 'Atividade; pessoas não são somáveis entre atividades'];
  });
  return '\uFEFF' + [columns, ...rows].map(row => row.map(cell).join(';')).join('\r\n');
}
