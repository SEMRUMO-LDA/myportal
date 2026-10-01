const today = new Date("2026-10-01T12:00:00Z"); // Thursday, day 4
const dayOfWeek = today.getDay(); // 4

const template = {
  id: 1,
  weeklyPattern: [
    { day: 0, start: '', end: '', isOff: true },
    { day: 1, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' },
    { day: 4, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' }
  ]
};

const daySchedule = template.weeklyPattern.find(d => d.day === dayOfWeek);
console.log(daySchedule, !daySchedule.isOff);
